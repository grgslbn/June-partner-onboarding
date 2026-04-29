'use client';

import { useEffect, useRef, useState } from 'react';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { inputClass, FieldWrapper } from './shared';

type PostcodeEntry = { code: string; nl: string; fr: string };

let postcodeCache: PostcodeEntry[] | null = null;

async function loadPostcodes(): Promise<PostcodeEntry[]> {
  if (postcodeCache) return postcodeCache;
  const res = await fetch('/belgian-postcodes.json');
  postcodeCache = await res.json();
  return postcodeCache!;
}

type Props = {
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
  required: boolean;
  locale: string;
  labels: {
    streetLabel: string;
    streetPlaceholder: string;
    postalCodeLabel: string;
    postalCodePlaceholder: string;
    cityLabel: string;
    cityPlaceholder: string;
    error: string;
  };
};

export function AddressField({ register, errors, setValue, watch, required, locale, labels }: Props) {
  const postalValue = watch('address.postal_code') as string | undefined;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!postalValue || postalValue.length !== 4) {
      setSuggestion(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const entries = await loadPostcodes();
      const match = entries.find((e) => e.code === postalValue);
      if (match) {
        const city = locale === 'nl' ? match.nl : match.fr;
        setSuggestion(city);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (setValue as any)('address.city', city, { shouldValidate: true });
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [postalValue, locale, setValue]);

  const streetErr = errors['address.street' as keyof typeof errors];
  const postalErr = errors['address.postal_code' as keyof typeof errors];
  const cityErr = errors['address.city' as keyof typeof errors];
  const hasError = !!(streetErr || postalErr || cityErr);

  return (
    <div className="flex flex-col gap-4">
      <FieldWrapper
        label={labels.streetLabel}
        htmlFor="address-street"
        error={streetErr ? labels.error : undefined}
        errorId="address-street-error"
      >
        <input
          id="address-street"
          type="text"
          autoComplete="street-address"
          placeholder={labels.streetPlaceholder}
          aria-invalid={!!streetErr}
          aria-describedby={streetErr ? 'address-street-error' : undefined}
          aria-required={required}
          className={inputClass}
          {...register('address.street', { required })}
        />
      </FieldWrapper>

      <div className="flex gap-3">
        <FieldWrapper
          label={labels.postalCodeLabel}
          htmlFor="address-postal-code"
          error={postalErr ? labels.error : undefined}
          errorId="address-postal-code-error"
        >
          <input
            id="address-postal-code"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder={labels.postalCodePlaceholder}
            maxLength={4}
            aria-invalid={!!postalErr}
            aria-describedby={postalErr ? 'address-postal-code-error' : undefined}
            aria-required={required}
            className={`${inputClass} w-28`}
            {...register('address.postal_code', {
              required,
              pattern: /^\d{4}$/,
            })}
          />
        </FieldWrapper>

        <div className="flex-1">
          <FieldWrapper
            label={labels.cityLabel}
            htmlFor="address-city"
            error={cityErr ? labels.error : undefined}
            errorId="address-city-error"
          >
            <input
              id="address-city"
              type="text"
              autoComplete="address-level2"
              placeholder={suggestion ?? labels.cityPlaceholder}
              aria-invalid={!!cityErr}
              aria-describedby={cityErr ? 'address-city-error' : undefined}
              aria-required={required}
              className={inputClass}
              {...register('address.city', { required })}
            />
          </FieldWrapper>
        </div>
      </div>

      {hasError && !streetErr && !postalErr && !cityErr && (
        <p role="alert" className="text-sm text-red-600">{labels.error}</p>
      )}
    </div>
  );
}
