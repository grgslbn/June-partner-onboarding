'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Partner } from '../PartnerEditShell';
import { SaveIndicator } from '../SaveIndicator';
import { useAutosave, type SaveState } from '@/hooks/useAutosave';

type SubmissionRoute = 'cs_handoff' | 'self_onboarding' | 'in_shop_stripe';

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
  submission_route: SubmissionRoute;
  stripe_url_template: string;
  stripe_promo_code: string;
  june_backup_email: string;
};

const ROUTE_OPTIONS: { value: SubmissionRoute; label: string; description: string }[] = [
  {
    value: 'cs_handoff',
    label: 'CS handoff',
    description: 'Lead is sent to June CS who contacts the customer within 48h.',
  },
  {
    value: 'self_onboarding',
    label: 'Self-onboarding',
    description: 'Customer receives an email with a Stripe link to complete payment themselves.',
  },
  {
    value: 'in_shop_stripe',
    label: 'In-shop Stripe',
    description: 'Browser redirects immediately to Stripe. Rep walks customer through payment on the spot.',
  },
];

function buildPreviewUrl(
  template: string,
  promo: string,
  locale: string,
): string | null {
  try {
    const url = new URL(template);
    url.searchParams.set('prefilled_email', 'customer@example.com');
    if (promo.trim()) url.searchParams.set('prefilled_promo_code', promo.trim());
    url.searchParams.set('locale', locale || 'fr');
    return url.toString();
  } catch {
    return null;
  }
}

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
      submission_route:     (partner.submission_route as SubmissionRoute) ?? 'cs_handoff',
      stripe_url_template:  partner.stripe_url_template ?? '',
      stripe_promo_code:    partner.stripe_promo_code ?? '',
      june_backup_email:    partner.june_backup_email ?? '',
    },
  });

  const { save } = useAutosave<Partner>({
    resourcePath: `partners/${partner.id}`,
    onSaved,
    onStateChange: setSaveState,
  });

  const v = watch();
  const isStripeRoute = v.submission_route !== 'cs_handoff';
  const previewUrl = isStripeRoute
    ? buildPreviewUrl(v.stripe_url_template, v.stripe_promo_code, v.default_locale)
    : null;

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
      submission_route:     v.submission_route,
      stripe_url_template:  v.stripe_url_template || null,
      stripe_promo_code:    v.stripe_promo_code || null,
      june_backup_email:    v.june_backup_email || null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    v.name, v.slug, v.active, v.content_status, v.default_locale,
    v.flow_preset, v.iban_behavior, v.product_sold, v.savings_sim_enabled,
    v.digest_partner_email, v.submission_route, v.stripe_url_template,
    v.stripe_promo_code, v.june_backup_email,
  ]);

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
            <option value="standard">Standard</option>
            <option value="complete">Complete</option>
          </select>
        </Field>

        <Field label="IBAN behavior">
          <select {...register('iban_behavior')} className={inputCls}>
            <option value="in_flow">In flow (collected in form)</option>
            <option value="deferred">Deferred (via email link)</option>
            <option value="skip">Skip (not collected)</option>
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

      {/* ── Submission flow ─────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Submission flow</h3>

        <fieldset className="space-y-2">
          <legend className="sr-only">Submission route</legend>
          {ROUTE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                value={opt.value}
                {...register('submission_route')}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
              </div>
            </label>
          ))}
        </fieldset>

        <Field label="June backup email" hint="Receives a notification for every new lead.">
          <input
            type="email"
            placeholder="cs@june.energy"
            {...register('june_backup_email')}
            className={inputCls}
          />
        </Field>

        {isStripeRoute && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <Field label="Stripe URL template" hint="The base Stripe checkout URL for this partner.">
              <input
                type="url"
                placeholder="https://billing.stripe.com/p/..."
                {...register('stripe_url_template')}
                className={inputCls}
              />
            </Field>

            <Field label="Default promo code" hint="Applied to Stripe unless a ?promo= URL param overrides it. Leave blank for no default.">
              <input
                type="text"
                placeholder="SUMMERPROMO"
                {...register('stripe_promo_code')}
                className={`${inputCls} font-mono uppercase`}
              />
            </Field>

            {/* Live preview */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Preview URL</p>
              {previewUrl ? (
                <p className="break-all rounded border border-gray-200 bg-white px-2 py-1.5 font-mono text-xs text-gray-600">
                  {previewUrl}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">Enter a valid Stripe URL above to see the preview.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}
