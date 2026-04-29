'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { BrandCheckbox } from '@/components/public/BrandCheckbox';

type Props = {
  control: Control<Record<string, unknown>>;
  label: string;
};

export function SepaField({ control, label }: Props) {
  return (
    <Controller
      control={control}
      name="sepa_accepted"
      rules={{ validate: (v) => v === true }}
      render={({ field }) => (
        <label className="mt-1 flex cursor-pointer items-start gap-3 text-sm font-normal leading-snug text-neutral-700">
          <BrandCheckbox
            id="sepa_accepted"
            checked={field.value === true}
            onCheckedChange={(v) => field.onChange(v === true)}
            className="mt-0.5"
            aria-required="true"
          />
          <span>{label}</span>
        </label>
      )}
    />
  );
}
