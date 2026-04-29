'use client';

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { inputClass, FieldWrapper } from './shared';

type Props = {
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  required: boolean;
  labels: {
    label: string;
    monthly: string;
    bimonthly: string;
    annual: string;
    error: string;
  };
};

export function BillingFrequencyField({ register, errors, required, labels }: Props) {
  const err = errors['billing_frequency' as keyof typeof errors];
  return (
    <FieldWrapper
      label={labels.label}
      htmlFor="billing_frequency"
      error={err ? labels.error : undefined}
      errorId="billing-frequency-error"
    >
      <select
        id="billing_frequency"
        aria-invalid={!!err}
        aria-describedby={err ? 'billing-frequency-error' : undefined}
        aria-required={required}
        className={inputClass}
        {...register('billing_frequency', { required })}
      >
        <option value="" disabled />
        <option value="monthly">{labels.monthly}</option>
        <option value="bimonthly">{labels.bimonthly}</option>
        <option value="annual">{labels.annual}</option>
      </select>
    </FieldWrapper>
  );
}
