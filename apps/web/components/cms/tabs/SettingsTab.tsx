'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Partner } from '../PartnerEditShell';
import { SaveIndicator } from '../SaveIndicator';
import { useAutosave, type SaveState } from '@/hooks/useAutosave';

type FormValues = {
  name: string;
  slug: string;
  active: boolean;
  content_status: 'draft' | 'review' | 'live';
  default_locale: string;
  flow_preset: string;
  iban_behavior: string;
  product_sold: string;
  savings_sim_enabled: boolean;
  digest_partner_email: string;
};

export function SettingsTab({ partner, onSaved }: { partner: Partner; onSaved: (p: Partner) => void }) {
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const { register, watch } = useForm<FormValues>({
    defaultValues: {
      name:                 partner.name,
      slug:                 partner.slug,
      active:               partner.active,
      content_status:       (partner.content_status as FormValues['content_status']) ?? 'draft',
      default_locale:       partner.default_locale,
      flow_preset:          partner.flow_preset,
      iban_behavior:        partner.iban_behavior,
      product_sold:         partner.product_sold,
      savings_sim_enabled:  partner.savings_sim_enabled,
      digest_partner_email: partner.digest_partner_email ?? '',
    },
  });

  const { save } = useAutosave<Partner>({
    resourcePath: `partners/${partner.id}`,
    onSaved,
    onStateChange: setSaveState,
  });

  const v = watch();

  useEffect(() => {
    save({
      name:                 v.name,
      slug:                 v.slug,
      active:               v.active,
      content_status:       v.content_status,
      default_locale:       v.default_locale,
      flow_preset:          v.flow_preset,
      iban_behavior:        v.iban_behavior,
      product_sold:         v.product_sold,
      savings_sim_enabled:  v.savings_sim_enabled,
      digest_partner_email: v.digest_partner_email || null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.name, v.slug, v.active, v.content_status, v.default_locale, v.flow_preset, v.iban_behavior, v.product_sold, v.savings_sim_enabled, v.digest_partner_email]);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Partner settings</h2>
        <SaveIndicator state={saveState} />
      </div>

      <div className="space-y-4">
        <Field label="Partner name">
          <input type="text" {...register('name')} className={inputCls} />
        </Field>

        <Field label="Slug">
          <input type="text" {...register('slug')} className={`${inputCls} font-mono`} />
        </Field>

        <Field label="Content status">
          <select {...register('content_status')} className={inputCls}>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="live">Live</option>
          </select>
        </Field>

        <Field label="Default locale">
          <select {...register('default_locale')} className={inputCls}>
            <option value="fr">French (fr)</option>
            <option value="nl">Dutch (nl)</option>
          </select>
        </Field>

        <Field label="Flow preset">
          <select {...register('flow_preset')} className={inputCls}>
            <option value="simple">Simple</option>
            <option value="full">Full</option>
          </select>
        </Field>

        <Field label="IBAN behavior">
          <select {...register('iban_behavior')} className={inputCls}>
            <option value="deferred">Deferred</option>
            <option value="required">Required</option>
          </select>
        </Field>

        <Field label="Product sold">
          <input type="text" {...register('product_sold')} className={inputCls} />
        </Field>

        <Field label="Digest email">
          <input type="email" {...register('digest_partner_email')} placeholder="reports@partner.example" className={inputCls} />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <input type="checkbox" id="active" {...register('active')} className="h-4 w-4 rounded border-gray-300" />
          <label htmlFor="active" className="text-sm text-gray-700">Partner is active (public page accessible)</label>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="savings_sim" {...register('savings_sim_enabled')} className="h-4 w-4 rounded border-gray-300" />
          <label htmlFor="savings_sim" className="text-sm text-gray-700">Savings simulator enabled</label>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
