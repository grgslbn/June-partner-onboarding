'use client';

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { inputClass, FieldWrapper } from './shared';

type Props = {
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  required: boolean;
  labels: { label: string; error: string };
};

export function BirthDateField({ register, errors, required, labels }: Props) {
  const err = errors['birth_date' as keyof typeof errors];
  return (
    <FieldWrapper
      label={labels.label}
      htmlFor="birth_date"
      error={err ? labels.error : undefined}
      errorId="birth-date-error"
    >
      <input
        id="birth_date"
        type="date"
        autoComplete="bday"
        aria-invalid={!!err}
        aria-describedby={err ? 'birth-date-error' : undefined}
        aria-required={required}
        className={inputClass}
        {...register('birth_date', { required })}
      />
    </FieldWrapper>
  );
}
