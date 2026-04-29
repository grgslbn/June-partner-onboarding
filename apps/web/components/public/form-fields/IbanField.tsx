'use client';

import { useState } from 'react';
import { isValidIBAN } from 'ibantools';
import type { UseFormSetValue, FieldErrors } from 'react-hook-form';
import { inputClass, FieldWrapper } from './shared';

function formatIban(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}
function canonicalIban(display: string): string {
  return display.replace(/\s/g, '').toUpperCase();
}
function validateBelgianIban(display: string): boolean {
  const iban = canonicalIban(display);
  return iban.startsWith('BE') && iban.length === 16 && isValidIBAN(iban);
}

type Props = {
  setValue: UseFormSetValue<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  required: boolean;
  labels: { label: string; placeholder: string; error: string };
};

export function IbanField({ setValue, errors, required, labels }: Props) {
  const [display, setDisplay] = useState('');
  const [touched, setTouched] = useState(false);

  const valid = validateBelgianIban(display);
  const showError = (touched && !valid && display.length > 0) || !!errors['iban'];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
    const formatted = formatIban(raw);
    setDisplay(formatted);
    setValue('iban', valid ? canonicalIban(formatted) : null, { shouldValidate: true });
  }

  return (
    <FieldWrapper
      label={labels.label}
      htmlFor="iban"
      error={showError ? labels.error : undefined}
      errorId="iban-error"
    >
      <input
        id="iban"
        type="text"
        inputMode="text"
        autoComplete="off"
        placeholder={labels.placeholder}
        value={display}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={showError ? 'iban-error' : undefined}
        aria-required={required}
        className={`${inputClass} font-mono uppercase tracking-wider`}
        maxLength={23}
      />
    </FieldWrapper>
  );
}
