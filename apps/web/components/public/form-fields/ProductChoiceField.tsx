'use client';

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FieldWrapper } from './shared';

type ProductChoice = {
  id: string;
  label_i18n: Record<string, string>;
};

type Props = {
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  required: boolean;
  locale: string;
  productChoices: ProductChoice[];
  labels: { label: string; error: string };
};

export function ProductChoiceField({ register, errors, required, locale, productChoices, labels }: Props) {
  const err = errors['product_choice' as keyof typeof errors];

  return (
    <FieldWrapper
      label={labels.label}
      htmlFor="product_choice"
      error={err ? labels.error : undefined}
      errorId="product-choice-error"
    >
      <div className="flex flex-col gap-2" role="radiogroup" aria-required={required}>
        {productChoices.map((choice) => {
          const choiceLabel = choice.label_i18n[locale] ?? choice.label_i18n['fr'] ?? choice.id;
          return (
            <label
              key={choice.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm text-neutral-900 has-[:checked]:border-[var(--partner-primary)] has-[:checked]:bg-[color-mix(in_oklch,var(--partner-primary)_8%,white)]"
            >
              <input
                type="radio"
                value={choice.id}
                aria-invalid={!!err}
                className="h-4 w-4 accent-[var(--partner-primary)]"
                {...register('product_choice', { required })}
              />
              <span>{choiceLabel}</span>
            </label>
          );
        })}
      </div>
    </FieldWrapper>
  );
}
