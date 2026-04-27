'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type ParsedRow =
  | { status: 'valid'; display_name: string; email: string | null; raw: string }
  | { status: 'invalid'; reason: string; raw: string };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRows(text: string): ParsedRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Single-column detection: if no line contains a comma, treat as names only
  const hasComma = lines.some((l) => l.includes(','));

  return lines.map((raw) => {
    if (!hasComma) {
      // Name-only mode
      const display_name = raw.trim();
      if (!display_name) return { status: 'invalid', reason: 'empty line', raw };
      if (display_name.length > 80) return { status: 'invalid', reason: 'name exceeds 80 chars', raw };
      return { status: 'valid', display_name, email: null, raw };
    }

    // Two-column mode: display_name,email
    const commaIdx = raw.indexOf(',');
    const display_name = raw.slice(0, commaIdx).trim();
    const emailRaw = raw.slice(commaIdx + 1).trim();

    if (!display_name) return { status: 'invalid', reason: 'missing display_name', raw };
    if (display_name.length > 80) return { status: 'invalid', reason: 'name exceeds 80 chars', raw };

    const email = emailRaw || null;
    if (email && !validateEmail(email)) {
      return { status: 'invalid', reason: `invalid email: ${email}`, raw };
    }

    return { status: 'valid', display_name, email, raw };
  });
}

type Props = { partnerId: string; shopId: string };

export function BulkRepImportModal({ partnerId, shopId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: unknown[] } | null>(null);
  const [importError, setImportError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rows = parseRows(text);
  const validRows = rows.filter((r): r is Extract<ParsedRow, { status: 'valid' }> => r.status === 'valid');
  const invalidRows = rows.filter((r) => r.status === 'invalid');

  function handleOpen() {
    setOpen(true);
    setResult(null);
    setImportError('');
    setText('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleClose() {
    setOpen(false);
    setText('');
    setResult(null);
    setImportError('');
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setImportError('');

    try {
      const res = await fetch(
        `/api/admin/partners/${partnerId}/shops/${shopId}/reps/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: validRows.map((r) => ({ display_name: r.display_name, email: r.email })),
          }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      router.refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const hasCommaInInput = text.split('\n').some((l) => l.trim().includes(','));

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        Bulk import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Bulk import reps</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Paste one rep per line.{' '}
                    {hasCommaInInput
                      ? 'Format: display_name,email (email optional)'
                      : 'No commas detected — treating each line as a name.'}
                  </p>
                </div>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>

              {!result ? (
                <>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      'Marie Dupont\nJean Martin\nLotte Jansen\n\n— or with emails —\n\nMarie Dupont,marie@ihpo.example\nJean Martin,jean@ihpo.example'
                    }
                    rows={8}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />

                  {rows.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2 max-h-48 overflow-y-auto">
                      <p className="text-xs font-medium text-gray-600">
                        Parsed {validRows.length} valid{invalidRows.length > 0 ? ` · ${invalidRows.length} invalid` : ''}
                      </p>
                      {rows.map((row, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs ${row.status === 'valid' ? 'text-gray-700' : 'text-red-600'}`}>
                          <span className="shrink-0">{row.status === 'valid' ? '✓' : '✗'}</span>
                          <span className="truncate">
                            {row.status === 'valid'
                              ? `${row.display_name}${row.email ? ` <${row.email}>` : ''}`
                              : `Line ${i + 1}: ${row.reason} — "${row.raw}"`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {importError && <p className="text-sm text-red-600">{importError}</p>}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleImport}
                      disabled={validRows.length === 0 || importing}
                      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      {importing
                        ? 'Importing…'
                        : validRows.length === 0
                        ? 'No valid rows'
                        : `Import ${validRows.length} rep${validRows.length !== 1 ? 's' : ''}`}
                    </button>
                    <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                /* Success state */
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <p className="text-sm font-medium text-green-900">
                      {result.created} rep{result.created !== 1 ? 's' : ''} imported successfully.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
