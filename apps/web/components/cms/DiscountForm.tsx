'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import type { Database } from '@june/db';

type DiscountCode = Database['public']['Tables']['discount_codes']['Row'];

type Props = {
  partnerId: string;
  // For new: action is the Server Action. For edit: not used (autosave handles it).
  action: (formData: FormData) => Promise<{ error: string }>;
  // Prefill values for edit mode — omit for new
  defaultValues?: Partial<DiscountCode>;
  readOnlyCode?: boolean;
};

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export function DiscountForm({ partnerId, action, defaultValues, readOnlyCode = false }: Props) {
  const [type, setType] = useState<'fixed_eur' | 'percent'>(
    (defaultValues?.type as 'fixed_eur' | 'percent') ?? 'fixed_eur',
  );

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => action(formData),
    { error: '' },
  );

  const toDatetimeLocal = (s: string | null | undefined) => {
    if (!s) return '';
    return s.slice(0, 16); // "YYYY-MM-DDTHH:MM"
  };

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Code */}
      <div className="space-y-1">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Code <span className="text-red-500">*</span>
        </label>
        {readOnlyCode ? (
          <p className="font-mono text-sm font-semibold text-gray-900 uppercase py-2">
            {defaultValues?.code}
            <input type="hidden" name="code" value={defaultValues?.code ?? ''} />
          </p>
        ) : (
          <input
            id="code"
            name="code"
            type="text"
            required
            maxLength={32}
            autoFocus
            placeholder="BLACK50"
            defaultValue={defaultValues?.code ?? ''}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            }}
            className={`${inputClass} font-mono uppercase`}
          />
        )}
        {state.error && state.error.includes('already exists') && (
          <p className="text-xs text-red-600">{state.error}</p>
        )}
        <p className="text-xs text-gray-400">Letters, digits, and dashes only. Max 32 chars.</p>
      </div>

      {/* Type */}
      <div className="space-y-2">
        <p className="block text-sm font-medium text-gray-700">Type <span className="text-red-500">*</span></p>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="fixed_eur"
              checked={type === 'fixed_eur'}
              onChange={() => setType('fixed_eur')}
              className="text-gray-900"
            />
            Fixed amount (€)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="percent"
              checked={type === 'percent'}
              onChange={() => setType('percent')}
              className="text-gray-900"
            />
            Percentage (%)
          </label>
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {type === 'fixed_eur' ? '€' : '%'}
          </span>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min={0}
            max={type === 'percent' ? 100 : 10000}
            step={type === 'percent' ? 1 : 0.01}
            defaultValue={defaultValues?.amount ?? ''}
            className={`${inputClass} pl-7`}
          />
        </div>
      </div>

      {/* Validity window */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="valid_from" className="block text-sm font-medium text-gray-700">Valid from</label>
          <input
            id="valid_from"
            name="valid_from"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.valid_from)}
            className={inputClass}
          />
          <p className="text-xs text-gray-400">Leave blank for immediate</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="valid_to" className="block text-sm font-medium text-gray-700">Valid to</label>
          <input
            id="valid_to"
            name="valid_to"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.valid_to)}
            className={inputClass}
          />
          <p className="text-xs text-gray-400">Leave blank for no expiry</p>
        </div>
      </div>

      {/* Max uses */}
      <div className="space-y-1">
        <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700">Max uses</label>
        <input
          id="max_uses"
          name="max_uses"
          type="number"
          min={1}
          step={1}
          defaultValue={defaultValues?.max_uses ?? ''}
          placeholder="Unlimited"
          className={inputClass}
        />
        <p className="text-xs text-gray-400">Leave blank for unlimited uses.</p>
      </div>

      {/* Active */}
      <div className="flex items-center gap-3">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={defaultValues?.active ?? true}
          className="h-4 w-4 rounded border-gray-300 text-gray-900"
        />
        <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
      </div>

      {state.error && !state.error.includes('already exists') && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Create code'}
        </button>
        <Link
          href={`/admin/partners/${partnerId}/discounts`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
