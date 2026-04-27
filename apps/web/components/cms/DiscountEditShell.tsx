'use client';

import { useState } from 'react';
import type { Database } from '@june/db';
import { useAutosave } from '@/hooks/useAutosave';
import { SaveIndicator } from './SaveIndicator';
import type { SaveState } from '@/hooks/useAutosave';

type DiscountCode = Database['public']['Tables']['discount_codes']['Row'];

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

const toDatetimeLocal = (s: string | null | undefined) =>
  s ? s.slice(0, 16) : '';

type Props = {
  partnerId: string;
  discount: DiscountCode;
};

export function DiscountEditShell({ partnerId, discount }: Props) {
  const [current, setCurrent] = useState<DiscountCode>(discount);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const { save } = useAutosave<DiscountCode>({
    resourcePath: `partners/${partnerId}/discounts/${discount.id}`,
    onSaved: setCurrent,
    onStateChange: setSaveState,
  });

  const handleBlur = (field: keyof DiscountCode, value: unknown) => {
    save({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-mono uppercase">{current.code}</h1>
        <SaveIndicator state={saveState} />
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Code — read-only */}
        <div className="space-y-1">
          <p className="block text-sm font-medium text-gray-700">Code</p>
          <p className="font-mono text-sm font-semibold text-gray-900 uppercase py-2">{current.code}</p>
          <p className="text-xs text-gray-400">Code cannot be changed after creation.</p>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <p className="block text-sm font-medium text-gray-700">Type</p>
          <div className="flex gap-6">
            {(['fixed_eur', 'percent'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={current.type === t}
                  onChange={() => {
                    setCurrent((p) => ({ ...p, type: t }));
                    save({ type: t });
                  }}
                />
                {t === 'fixed_eur' ? 'Fixed amount (€)' : 'Percentage (%)'}
              </label>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {current.type === 'fixed_eur' ? '€' : '%'}
            </span>
            <input
              id="amount"
              type="number"
              min={0}
              max={current.type === 'percent' ? 100 : 10000}
              step={current.type === 'percent' ? 1 : 0.01}
              defaultValue={current.amount}
              key={`amount-${current.type}`}
              className={`${inputClass} pl-7`}
              onBlur={(e) => handleBlur('amount', Number(e.target.value))}
            />
          </div>
        </div>

        {/* Validity window */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="valid_from" className="block text-sm font-medium text-gray-700">Valid from</label>
            <input
              id="valid_from"
              type="datetime-local"
              defaultValue={toDatetimeLocal(current.valid_from)}
              className={inputClass}
              onBlur={(e) => handleBlur('valid_from', e.target.value || null)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="valid_to" className="block text-sm font-medium text-gray-700">Valid to</label>
            <input
              id="valid_to"
              type="datetime-local"
              defaultValue={toDatetimeLocal(current.valid_to)}
              className={inputClass}
              onBlur={(e) => handleBlur('valid_to', e.target.value || null)}
            />
          </div>
        </div>

        {/* Max uses */}
        <div className="space-y-1">
          <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700">Max uses</label>
          <input
            id="max_uses"
            type="number"
            min={1}
            step={1}
            defaultValue={current.max_uses ?? ''}
            placeholder="Unlimited"
            className={inputClass}
            onBlur={(e) => handleBlur('max_uses', e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        {/* Active */}
        <div className="flex items-center gap-3">
          <input
            id="active"
            type="checkbox"
            checked={current.active}
            onChange={(e) => {
              setCurrent((p) => ({ ...p, active: e.target.checked }));
              save({ active: e.target.checked });
            }}
            className="h-4 w-4 rounded border-gray-300 text-gray-900"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
        </div>

        {/* Used count — read-only */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">
            Used <span className="font-semibold text-gray-900">{current.used_count}</span>{' '}
            {current.used_count === 1 ? 'time' : 'times'}
          </p>
        </div>
      </div>
    </div>
  );
}
