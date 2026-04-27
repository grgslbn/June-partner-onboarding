'use client';

import { Select as SelectPrimitive } from 'radix-ui';
import { CheckIcon, ChevronDownIcon, UserIcon } from 'lucide-react';

// Pill-chip rep picker for the partner hero. Visually matches the trust badge:
// translucent white fill, 1px white border, white text.
// Uses Radix Select for keyboard + ARIA semantics.

type Rep = { id: string; display_name: string };

export default function HeroRepPicker({
  reps,
  selectedId,
  onSelect,
  labels,
}: {
  reps: Rep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  labels: {
    placeholder: string;
    selected: (name: string) => string;
  };
}) {
  const selected = reps.find((r) => r.id === selectedId) ?? null;

  return (
    <SelectPrimitive.Root
      value={selectedId ?? ''}
      onValueChange={(v) => onSelect(v)}
    >
      <SelectPrimitive.Trigger
        aria-label={labels.placeholder}
        className="inline-flex items-center gap-2 rounded-full border border-white bg-black/10 px-4 py-2 text-sm font-medium text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--partner-primary)] data-[state=open]:bg-black/15"
      >
        <UserIcon className="size-4" aria-hidden="true" />
        <SelectPrimitive.Value placeholder={labels.placeholder}>
          {selected ? labels.selected(selected.display_name) : labels.placeholder}
        </SelectPrimitive.Value>
        <ChevronDownIcon className="size-4 opacity-80" aria-hidden="true" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-[14rem] overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {reps.map((rep) => (
              <SelectPrimitive.Item
                key={rep.id}
                value={rep.id}
                className="relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 pr-8 text-sm outline-none data-[highlighted]:bg-neutral-100 data-[state=checked]:font-medium"
              >
                <SelectPrimitive.ItemText>{rep.display_name}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <CheckIcon className="size-4" strokeWidth={2.5} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
