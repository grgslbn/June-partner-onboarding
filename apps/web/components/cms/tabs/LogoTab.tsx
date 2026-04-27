'use client';

import { useState, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Partner } from '../PartnerEditShell';

const BUCKET = 'partner-logos';
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function LogoTab({ partner, onSaved }: { partner: Partner; onSaved: (p: Partner) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (file.size > MAX_SIZE_BYTES) {
      setError('File must be under 2 MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setPendingFile(file);
  }

  function handleCancel() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
    // TODO: also delete orphaned Storage object on cancel (deferred to a cleanup briefing)
  }

  async function handleSave() {
    if (!pendingFile) return;
    setUploading(true);
    setError('');

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const path = `${partner.id}/logo`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, pendingFile, { upsert: true, contentType: pendingFile.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // Bust CDN cache with a version query param
      const logoUrl = `${publicUrl}?v=${Date.now()}`;

      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: logoUrl }),
      });

      if (!res.ok) throw new Error(await res.text());

      const updated = await res.json();
      onSaved(updated);

      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview ?? partner.logo_url;

  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Partner logo</h2>

      {/* Current / preview */}
      <div className="flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
        {displayUrl ? (
          <img src={displayUrl} alt="Logo preview" className="max-h-24 max-w-full object-contain" />
        ) : (
          <p className="text-sm text-gray-400">No logo uploaded</p>
        )}
      </div>

      {/* File picker */}
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="logo-file"
        />

        {!pendingFile ? (
          <label
            htmlFor="logo-file"
            className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Choose image…
          </label>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={uploading}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Save logo'}
            </button>
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-xs text-gray-500">{pendingFile.name}</span>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-gray-400">Max 2 MB · PNG, JPG, SVG, or WebP</p>
      </div>
    </div>
  );
}
