'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAutosave, type SaveState } from '@/hooks/useAutosave';
import { SaveIndicator } from './SaveIndicator';
import { ShopQrSection } from './ShopQrSection';
import type { Database } from '@june/db';

type Shop = Database['public']['Tables']['shops']['Row'];
type Partner = Pick<
  Database['public']['Tables']['partners']['Row'],
  'id' | 'name' | 'slug' | 'logo_url' | 'primary_color' | 'default_locale'
>;

type FormValues = {
  name: string;
  address: string;
  city: string;
  zip: string;
  active: boolean;
};

type Props = {
  shop: Shop;
  partner: Partner;
  siteUrl: string;
  onDisabled?: () => void;
};

export function ShopEditShell({ shop: initialShop, partner, siteUrl }: Props) {
  const [shop, setShop] = useState(initialShop);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const { register, handleSubmit: _hs, formState } = useForm<FormValues>({
    defaultValues: {
      name:    shop.name,
      address: shop.address ?? '',
      city:    shop.city ?? '',
      zip:     shop.zip ?? '',
      active:  shop.active,
    },
  });

  const { save } = useAutosave<Shop>({
    resourcePath: `partners/${partner.id}/shops/${shop.id}`,
    onSaved: (updated) => setShop(updated),
    onStateChange: setSaveState,
  });

  function handleBlur(field: keyof FormValues, value: string | boolean) {
    save({ [field]: value === '' ? null : value });
  }

  async function handleDisable() {
    setDisabling(true);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/shops/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setShop(updated);
      setShowDisableConfirm(false);
    } finally {
      setDisabling(false);
    }
  }

  async function handleEnable() {
    const res = await fetch(`/api/admin/partners/${partner.id}/shops/${shop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setShop(updated);
    }
  }

  return (
    <div className="space-y-8">
      {/* Shop details form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Shop details</h2>
          <SaveIndicator state={saveState} />
        </div>

        <Field label="Shop name">
          <input
            type="text"
            {...register('name')}
            onBlur={(e) => handleBlur('name', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Address">
          <input
            type="text"
            {...register('address')}
            onBlur={(e) => handleBlur('address', e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input
              type="text"
              {...register('city')}
              onBlur={(e) => handleBlur('city', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ZIP">
            <input
              type="text"
              {...register('zip')}
              onBlur={(e) => handleBlur('zip', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${shop.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {shop.active ? 'Active' : 'Inactive'}
          </span>
          {!shop.active && (
            <button
              onClick={handleEnable}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Re-enable shop
            </button>
          )}
        </div>
      </div>

      {/* QR section */}
      <ShopQrSection
        partnerId={partner.id}
        shopId={shop.id}
        shopName={shop.name}
        partnerName={partner.name}
        partnerSlug={partner.slug}
        partnerLogoUrl={partner.logo_url}
        partnerPrimaryColor={partner.primary_color}
        qrToken={shop.qr_token}
        defaultLocale={partner.default_locale}
        siteUrl={siteUrl}
        onTokenRegenerated={(newToken) => setShop((s) => ({ ...s, qr_token: newToken }))}
      />

      {/* Disable section */}
      {shop.active && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Disable shop</h2>
          <p className="text-sm text-gray-500">
            Disabling hides this shop from the rep picker and stops new leads. Existing leads keep their attribution.
          </p>

          {!showDisableConfirm ? (
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Disable this shop…
            </button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-medium text-red-900">
                Disabling this shop hides it from the rep picker and stops new leads. Existing leads keep their attribution. Confirm?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDisable}
                  disabled={disabling}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {disabling ? 'Disabling…' : 'Disable shop'}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
