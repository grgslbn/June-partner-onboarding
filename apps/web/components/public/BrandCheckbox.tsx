'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Circular, partner-primary outlined checkbox used in the public flow.
// v0 spec: empty red ring when unchecked, red fill + white tick when checked.
// Colour comes from the `--partner-primary` CSS variable set by the surrounding
// page; the IHPO red (#E53935) is a fallback for contexts without the var.
export function BrandCheckbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer relative grid size-5 shrink-0 place-content-center rounded-full border-[1.5px] outline-none transition-colors',
        'border-[var(--partner-primary,#E53935)]',
        'data-[state=checked]:bg-[var(--partner-primary,#E53935)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--partner-primary,#E53935)]/40 focus-visible:ring-offset-1',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator asChild>
        <CheckIcon className="size-3 text-white" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
