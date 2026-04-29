'use client';

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { inputClass, FieldWrapper } from './shared';

type Props = {
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  required: boolean;
  labels: { label: string; placeholder: string; error: string };
};

export function MobileField({ register, errors, required, labels }: Props) {
  const err = errors['mobile'];
  return (
    <FieldWrapper label={labels.label} htmlFor="mobile" error={err ? labels.error : undefined} errorId="mobile-error">
      <input
        id="mobile"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={labels.placeholder}
        aria-invalid={!!err}
        aria-describedby={err ? 'mobile-error' : undefined}
        aria-required={required}
        className={inputClass}
        {...register('mobile', { required })}
      />
    </FieldWrapper>
  );
}
