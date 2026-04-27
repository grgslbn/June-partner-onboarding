'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

type Props = {
  partnerId: string;
  shopId: string;
  shopName: string;
  partnerName: string;
  partnerSlug: string;
  partnerLogoUrl: string | null;
  partnerPrimaryColor: string;
  qrToken: string;
  defaultLocale: string;
  siteUrl: string;
  onTokenRegenerated: (newToken: string) => void;
};

const QR_SIZE_PX = 240;
const QR_DOWNLOAD_PX = 1024;

function toKebab(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30);
}

function fileBase(partnerSlug: string, shopName: string, qrToken: string) {
  return `${partnerSlug}_${toKebab(shopName)}_${qrToken.slice(0, 6)}`;
}

export function ShopQrSection({
  partnerId,
  shopId,
  shopName,
  partnerName,
  partnerSlug,
  partnerLogoUrl,
  partnerPrimaryColor,
  qrToken,
  defaultLocale,
  siteUrl,
  onTokenRegenerated,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svgString, setSvgString] = useState('');
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [copied, setCopied] = useState(false);

  const qrUrl = `${siteUrl}/${defaultLocale}/p/${partnerSlug}?shop=${qrToken}`;

  const renderQr = useCallback(async () => {
    if (!canvasRef.current) return;

    await QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: QR_SIZE_PX,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const svg = await QRCode.toString(qrUrl, {
      type: 'svg',
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    setSvgString(svg);
  }, [qrUrl]);

  useEffect(() => {
    renderQr();
  }, [renderQr]);

  async function downloadSvg() {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    triggerDownload(URL.createObjectURL(blob), `${fileBase(partnerSlug, shopName, qrToken)}.svg`);
  }

  async function downloadPng() {
    const offscreen = document.createElement('canvas');
    offscreen.width = QR_DOWNLOAD_PX;
    offscreen.height = QR_DOWNLOAD_PX;
    await QRCode.toCanvas(offscreen, qrUrl, {
      width: QR_DOWNLOAD_PX,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    offscreen.toBlob((blob) => {
      if (!blob) return;
      triggerDownload(URL.createObjectURL(blob), `${fileBase(partnerSlug, shopName, qrToken)}.png`);
    }, 'image/png');
  }

  async function downloadPdf() {
    // A6: 105 × 148 mm
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' });
    const pageW = 105;

    // ── Partner logo (or initial fallback) ──────────────────────────────────
    const logoY = 8;
    const logoH = 22;
    let logoDrawn = false;

    if (partnerLogoUrl) {
      try {
        const res = await fetch(partnerLogoUrl);
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        const ext = blob.type.includes('png') ? 'PNG' : blob.type.includes('svg') ? 'SVG' : 'JPEG';
        // jspdf can't render SVG directly — fall through to initial fallback
        if (ext !== 'SVG') {
          // Center and fit within 60mm wide, logoH tall
          pdf.addImage(dataUrl, ext as 'PNG' | 'JPEG', (pageW - 60) / 2, logoY, 60, logoH);
          logoDrawn = true;
        }
      } catch {
        // CORS or fetch failure — fall through to initial
      }
    }

    if (!logoDrawn) {
      // Colored circle with partner initial
      pdf.setFillColor(partnerPrimaryColor);
      const circleR = logoH / 2;
      const circleX = pageW / 2;
      const circleY = logoY + circleR;
      pdf.circle(circleX, circleY, circleR, 'F');
      pdf.setTextColor('#ffffff');
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(partnerName.charAt(0).toUpperCase(), circleX, circleY + 3, { align: 'center' });
    }

    // ── Partner name ─────────────────────────────────────────────────────────
    const nameY = logoY + logoH + 6;
    pdf.setTextColor('#111111');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(partnerName, pageW / 2, nameY, { align: 'center' });

    // ── QR code (~70mm square) ───────────────────────────────────────────────
    const qrSizeMm = 70;
    const qrX = (pageW - qrSizeMm) / 2;
    const qrY = nameY + 6;

    const offscreen = document.createElement('canvas');
    offscreen.width = 512;
    offscreen.height = 512;
    await QRCode.toCanvas(offscreen, qrUrl, { width: 512, margin: 1 });
    const qrDataUrl = offscreen.toDataURL('image/png');
    pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSizeMm, qrSizeMm);

    // ── Shop name ────────────────────────────────────────────────────────────
    const shopNameY = qrY + qrSizeMm + 5;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#333333');
    pdf.text(shopName, pageW / 2, shopNameY, { align: 'center' });

    // ── URL caption ──────────────────────────────────────────────────────────
    const urlY = shopNameY + 5;
    pdf.setFontSize(6);
    pdf.setFont('courier', 'normal');
    pdf.setTextColor('#666666');
    const shortUrl = qrUrl.replace(/^https?:\/\//, '');
    pdf.text(shortUrl, pageW / 2, urlY, { align: 'center' });

    // ── Minimum size note ────────────────────────────────────────────────────
    const noteY = urlY + 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor('#999999');
    pdf.text('Print at minimum 50 × 50 mm for reliable scanning.', pageW / 2, noteY, { align: 'center' });

    pdf.save(`${fileBase(partnerSlug, shopName, qrToken)}.pdf`);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError('');
    try {
      const res = await fetch(
        `/api/admin/partners/${partnerId}/shops/${shopId}/regenerate-qr`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onTokenRegenerated(updated.qr_token);
      setShowRegenConfirm(false);
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">QR Code</h2>

      {/* QR canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={QR_SIZE_PX}
          height={QR_SIZE_PX}
          className="rounded-lg border border-gray-100"
        />
      </div>

      {/* URL + copy */}
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
        <span className="flex-1 truncate font-mono text-xs text-gray-600">{qrUrl}</span>
        <button
          onClick={copyUrl}
          className="shrink-0 rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors"
        >
          {copied ? <span className="text-green-600">Copied!</span> : 'Copy URL'}
        </button>
      </div>

      {/* Downloads */}
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadSvg} className={dlBtnCls}>Download SVG</button>
        <button onClick={downloadPng} className={dlBtnCls}>Download PNG (1024px)</button>
        <button onClick={downloadPdf} className={dlBtnCls}>Download printable PDF (A6)</button>
      </div>

      {/* Regenerate */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        {!showRegenConfirm ? (
          <button
            onClick={() => setShowRegenConfirm(true)}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Regenerate QR token…
          </button>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm font-medium text-red-900">
              This will invalidate the existing QR. Old printed leaflets will stop working. Are you sure?
            </p>
            <p className="text-xs text-red-700">
              After regenerating, the old QR stops working immediately. Anyone mid-flow who already loaded the page is unaffected — their shop attribution was captured at page load.
            </p>
            {regenError && <p className="text-xs text-red-600">{regenError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {regenerating ? 'Regenerating…' : 'Yes, regenerate'}
              </button>
              <button
                onClick={() => { setShowRegenConfirm(false); setRegenError(''); }}
                disabled={regenerating}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const dlBtnCls = 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50';

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
