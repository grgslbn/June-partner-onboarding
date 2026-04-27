'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAutosave, type SaveState } from '@/hooks/useAutosave';
import { SaveIndicator } from './SaveIndicator';
import type { Database } from '@june/db';

type Rep = Database['public']['Tables']['sales_reps']['Row'];

type FormValues = {
  display_name: string;
  email: string;
  active: boolean;
};

type Props = {
  rep: Rep;
  leadsCount: number;
  partnerId: string;
  shopId: string;
};

export function RepEditShell({ rep: initialRep, leadsCount, partnerId, shopId }: Props) {
  const [rep, setRep] = useState(initialRep);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const { register } = useForm<FormValues>({
    defaultValues: {
      display_name: rep.display_name,
      email: rep.email ?? '',
      active: rep.active,
    },
  });

  const { save } = useAutosave<Rep>({
    resourcePath: `partners/${partnerId}/shops/${shopId}/reps/${rep.id}`,
    onSaved: (updated) => setRep(updated),
    onStateChange: setSaveState,
  });

  function handleBlur(field: keyof FormValues, value: string | boolean) {
    save({ [field]: value === '' ? null : value });
  }

  async function handleDisable() {
    setDisabling(true);
    try {
      const res = await fetch(
        `/api/admin/partners/${partnerId}/shops/${shopId}/reps/${rep.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setRep(updated);
      setShowDisableConfirm(false);
    } finally {
      setDisabling(false);
    }
  }

  async function handleEnable() {
    const res = await fetch(
      `/api/admin/partners/${partnerId}/shops/${shopId}/reps/${rep.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setRep(updated);
    }
  }

  return (
    <div className="space-y-6">
      {/* Main form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Rep details</h2>
          <SaveIndicator state={saveState} />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Display name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            maxLength={80}
            {...register('display_name')}
            onBlur={(e) => handleBlur('display_name', e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-gray-400">Shown to customers in the rep picker.</p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Email <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            {...register('email')}
            onBlur={(e) => handleBlur('email', e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-gray-400">Not shown to customers. Internal reference only.</p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rep.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {rep.active ? 'Active' : 'Inactive'}
          </span>
          {!rep.active && (
            <button
              onClick={handleEnable}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Re-enable rep
            </button>
          )}
        </div>
      </div>

      {/* Attribution history */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Attribution history</h2>
        <p className="text-sm text-gray-600">
          This rep has been attributed to <strong>{leadsCount}</strong> lead{leadsCount !== 1 ? 's' : ''}.
          {rep.active
            ? ' They are visible in the public landing rep picker.'
            : ' Disabling them hides the rep from the public landing rep picker, but past attribution is preserved on those leads.'}
        </p>
      </div>

      {/* Disable section */}
      {rep.active && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Disable rep</h2>
          <p className="text-sm text-gray-500">
            Hiding this rep removes them from the public picker. Past lead attribution is preserved.
          </p>

          {!showDisableConfirm ? (
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Disable this rep…
            </button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-medium text-red-900">
                Disabling this rep hides them from the public landing's picker. Past attribution on {leadsCount} lead{leadsCount !== 1 ? 's' : ''} is preserved. Confirm?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDisable}
                  disabled={disabling}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {disabling ? 'Disabling…' : 'Disable rep'}
                </button>
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
