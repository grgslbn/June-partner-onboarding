'use client';

import { useRef, useState } from 'react';
import { CircleCheckIcon, Loader2Icon } from 'lucide-react';
import { isValidIBAN } from 'ibantools';
import { BrandCheckbox } from '@/components/public/BrandCheckbox';

type Strings = {
  ibanLabel: string;
  ibanPlaceholder: string;
  ibanError: string;
  sepaLabel: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successMessage: string;
  reference: string;
  errorGeneric: string;
  errorNetwork: string;
  errorTooFast: string;
};

/** Format a raw IBAN string with a space every 4 chars for display. */
function formatIban(raw: string): string {
  return raw
    .replace(/\s/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/** Strip spaces and uppercase — the canonical form for validation/submission. */
function canonicalIban(display: string): string {
  return display.replace(/\s/g, '').toUpperCase();
}

function validateBelgianIban(raw: string): boolean {
  const iban = canonicalIban(raw);
  if (!iban.startsWith('BE')) return false;
  if (iban.length !== 16) return false;
  return isValidIBAN(iban);
}

export default function IbanForm({
  token,
  locale,
  primaryColor,
  strings: s,
  confirmationId,
}: {
  token: string;
  locale: string;
  primaryColor: string;
  strings: Strings;
  confirmationId: string;
}) {
  const mountedAt = useRef(Date.now());
  const hpRef = useRef<HTMLInputElement>(null);

  const [ibanDisplay, setIbanDisplay] = useState('');
  const [ibanTouched, setIbanTouched] = useState(false);
  const [sepa, setSepa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [completed, setCompleted] = useState(false);

  const ibanCanonical = canonicalIban(ibanDisplay);
  const ibanValid = validateBelgianIban(ibanDisplay);
  const showIbanError = ibanTouched && !ibanValid && ibanDisplay.length > 0;
  const canSubmit = ibanValid && sepa && !submitting;

  function handleIbanChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
    setIbanDisplay(formatIban(raw));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    if (Date.now() - mountedAt.current < 1500) {
      setServerError(s.errorTooFast);
      return;
    }
    if (hpRef.current?.value) return; // honeypot

    setSubmitting(true);
    setServerError('');

    try {
      const res = await fetch(`/api/complete/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iban: ibanCanonical,
          sepaAccepted: sepa,
          locale,
          honeypot: hpRef.current?.value ?? '',
        }),
      });

      if (res.ok) {
        setCompleted(true);
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (body.error === 'already_completed') {
        setCompleted(true);
        return;
      }
      setServerError(s.errorGeneric);
    } catch {
      setServerError(s.errorNetwork);
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <CircleCheckIcon
          className="size-16 text-green-500"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="text-xl font-semibold text-neutral-900">{s.successTitle}</h2>
        <p className="text-neutral-600">{s.successMessage}</p>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-neutral-500">{s.reference}</span>
          <span className="font-mono text-base font-semibold tracking-wider text-neutral-900">
            {confirmationId}
          </span>
        </div>
      </div>
    );
  }

  const inputClass =
    'h-12 w-full rounded-lg border border-neutral-200 bg-white px-4 font-mono text-base text-neutral-900 uppercase tracking-wider placeholder:text-neutral-400 outline-none transition-colors focus:border-[var(--partner-primary)] aria-[invalid=true]:border-red-500';

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      style={{ '--partner-primary': primaryColor } as React.CSSProperties}
      noValidate
    >
      {/* Honeypot */}
      <input
        ref={hpRef}
        type="text"
        name="_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ display: 'none' }}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="iban" className="text-sm font-medium text-neutral-700">
          {s.ibanLabel}
        </label>
        <input
          id="iban"
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder={s.ibanPlaceholder}
          value={ibanDisplay}
          onChange={handleIbanChange}
          onBlur={() => setIbanTouched(true)}
          aria-invalid={showIbanError}
          aria-describedby={showIbanError ? 'iban-error' : undefined}
          className={inputClass}
          maxLength={23} // BE + 14 digits + 4 spaces
        />
        {showIbanError && (
          <p id="iban-error" role="alert" className="text-sm text-red-600">
            {s.ibanError}
          </p>
        )}
      </div>

      <label className="mt-1 flex cursor-pointer items-start gap-3 text-sm font-normal leading-snug text-neutral-700">
        <BrandCheckbox
          checked={sepa}
          onCheckedChange={(v) => setSepa(v === true)}
          className="mt-0.5"
          aria-required="true"
        />
        <span>{s.sepaLabel}</span>
      </label>

      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 text-base font-medium text-white outline-none transition-colors hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        style={canSubmit ? { backgroundColor: primaryColor } : undefined}
      >
        {submitting ? (
          <>
            <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
            <span>{s.submitting}</span>
          </>
        ) : (
          <span>{s.submit}</span>
        )}
      </button>
    </form>
  );
}
