'use client';

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { inputClass, FieldWrapper } from './shared';

type Props = {
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  required: boolean;
  labels: {
    label: string;
    owner: string;
    tenant: string;
    other: string;
    error: string;
  };
};

export function HousingTypeField({ register, errors, required, labels }: Props) {
  const err = errors['housing_type' as keyof typeof errors];
  return (
    <FieldWrapper
      label={labels.label}
      htmlFor="housing_type"
      error={err ? labels.error : undefined}
      errorId="housing-type-error"
    >
      <select
        id="housing_type"
        aria-invalid={!!err}
        aria-describedby={err ? 'housing-type-error' : undefined}
        aria-required={required}
        className={inputClass}
        {...register('housing_type', { required })}
      >
        <option value="" disabled />
        <option value="owner">{labels.owner}</option>
        <option value="tenant">{labels.tenant}</option>
        <option value="other">{labels.other}</option>
      </select>
    </FieldWrapper>
  );
}
