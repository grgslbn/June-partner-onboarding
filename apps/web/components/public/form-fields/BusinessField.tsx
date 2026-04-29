'use client';

import type { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form';
import { BrandCheckbox } from '@/components/public/BrandCheckbox';
import { inputClass, FieldWrapper } from './shared';

type Props = {
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
  onChange: (field: string, value: unknown) => void;
  required: boolean;
  labels: {
    toggleLabel: string;
    nameLabel: string;
    namePlaceholder: string;
    vatLabel: string;
    vatPlaceholder: string;
    error: string;
  };
};

export function BusinessField({ register, errors, watch, onChange, required, labels }: Props) {
  const isBusiness = watch('is_business') as boolean | undefined;
  const nameErr = errors['business_name' as keyof typeof errors];
  const vatErr = errors['business_vat' as keyof typeof errors];

  return (
    <div className="flex flex-col gap-4">
      <label className="mt-1 flex cursor-pointer items-start gap-3 text-sm font-normal leading-snug text-neutral-700">
        <BrandCheckbox
          id="is_business"
          checked={isBusiness === true}
          onCheckedChange={(v) => onChange('is_business', v === true)}
          className="mt-0.5"
        />
        <span>{labels.toggleLabel}</span>
      </label>

      {isBusiness && (
        <div className="flex flex-col gap-4 pl-7">
          <FieldWrapper
            label={labels.nameLabel}
            htmlFor="business_name"
            error={nameErr ? labels.error : undefined}
            errorId="business-name-error"
          >
            <input
              id="business_name"
              type="text"
              autoComplete="organization"
              placeholder={labels.namePlaceholder}
              aria-invalid={!!nameErr}
              aria-describedby={nameErr ? 'business-name-error' : undefined}
              aria-required={required}
              className={inputClass}
              {...register('business_name', { required: required && isBusiness })}
            />
          </FieldWrapper>

          <FieldWrapper
            label={labels.vatLabel}
            htmlFor="business_vat"
            error={vatErr ? labels.error : undefined}
            errorId="business-vat-error"
          >
            <input
              id="business_vat"
              type="text"
              autoComplete="off"
              placeholder={labels.vatPlaceholder}
              aria-invalid={!!vatErr}
              aria-describedby={vatErr ? 'business-vat-error' : undefined}
              aria-required={required}
              className={`${inputClass} font-mono uppercase`}
              {...register('business_vat', { required: required && isBusiness })}
            />
          </FieldWrapper>
        </div>
      )}
    </div>
  );
}
