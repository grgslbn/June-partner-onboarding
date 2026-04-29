'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@june/shared';
import HeroRepPicker from '@/components/public/HeroRepPicker';
import SimpleForm from '@/components/public/SimpleForm';

type Partner = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  foregroundColor: '#000000' | '#FFFFFF';
  tcUrl: string | null;
};

type Shop = { id: string; name: string; qr_token: string };
type Rep = { id: string; display_name: string };

export default function LandingScreen({
  partner,
  shop,
  reps,
  locale,
  slug,
  promoCode,
}: {
  partner: Partner;
  shop: Shop | null;
  reps: Rep[];
  locale: Locale;
  slug: string;
  promoCode: string | null;
}) {
  const tLanding = useTranslations('public.landing');
  const tForm = useTranslations('public.form');
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  // landing_view fires once on mount (unchanged from the pre-consolidation flow).
  useEffect(() => {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'landing_view',
        partnerSlug: slug,
        shopToken: shop?.qr_token ?? null,
        meta: { locale },
      }),
      keepalive: true,
    }).catch(() => {});
  }, [shop?.qr_token, locale, slug]);

  const rootStyle = {
    '--partner-primary': partner.primaryColor,
    '--partner-fg': partner.foregroundColor,
  } as React.CSSProperties;

  const hasShop = shop !== null;
  const hasReps = reps.length > 0;
  const showRepPicker = hasShop && hasReps;
  const rep = selectedRepId ? { id: selectedRepId } : null;

  return (
    <main
      style={rootStyle}
      className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-white"
    >
      <header
        className="flex flex-col items-center px-6 pt-14 pb-12 text-center"
        style={{ backgroundColor: 'var(--partner-primary)', color: 'var(--partner-fg)' }}
      >
        {/* Logo pair — x-height matched via ratios in globals.css. */}
        <div className="flex items-baseline gap-3">
          {partner.logoUrl ? (
            <img
              src={partner.logoUrl}
              alt={partner.name}
              className="w-auto"
              style={{ height: 'calc(var(--logo-xh) / var(--partner-ratio))' }}
            />
          ) : (
            <span
              className="font-bold tracking-tight"
              style={{ fontSize: 'calc(var(--logo-xh) / var(--partner-ratio))', lineHeight: 1 }}
            >
              {partner.name}
            </span>
          )}
          <img
            src="https://raw.githubusercontent.com/grgslbn/June-brand-assets/main/logo/June_logo_white.svg"
            alt="June"
            className="w-auto"
            style={{ height: 'calc(var(--logo-xh) / var(--june-ratio))' }}
          />
        </div>

        <h1
          className="mt-10 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] whitespace-pre-line"
        >
          {tLanding('heroHeadline')}
        </h1>
        {/* Bumped to text-xl + bold so 100% white on the partner hero clears
            WCAG AA "large text" (≥14pt bold needs only 3:1, white on #E53935
            is ~4.18:1). The mockup's 75% opacity sat at 2.96:1 — a11y blocker. */}
        <p className="mt-3 text-xl font-bold leading-snug">
          {tLanding('heroSubline')}
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          {showRepPicker && (
            <HeroRepPicker
              reps={reps}
              selectedId={selectedRepId}
              onSelect={setSelectedRepId}
              labels={{
                placeholder: tLanding('repPickerLabel'),
                selected: (name) => tLanding('repPickerSelected', { name }),
              }}
            />
          )}

          {/* Translucent pill. bg-white/10 (mockup's lighten) drops contrast on
              partner red below WCAG AA; bg-black/10 darkens the composite and
              keeps white text at >=5:1. Same "translucent" feel, inverted
              blend direction. */}
          <div className="inline-flex items-center rounded-full border border-white bg-black/10 px-4 py-2 text-sm font-medium">
            {tLanding('trustBadge', { partnerName: partner.name })}
          </div>
        </div>
      </header>

      {/* Progress bar — hard-edged, first of three segments filled for Simple preset. */}
      <div className="flex gap-1.5 bg-white px-6 pt-3">
        <div
          className="h-1 flex-1 rounded-full"
          style={{ backgroundColor: 'var(--partner-primary)' }}
          aria-hidden="true"
        />
        <div className="h-1 flex-1 rounded-full bg-neutral-200" aria-hidden="true" />
        <div className="h-1 flex-1 rounded-full bg-neutral-200" aria-hidden="true" />
      </div>

      <section
        id="form"
        className="flex scroll-mt-4 flex-col gap-6 bg-white px-6 pt-6 pb-10"
      >
        <div>
          <h2 className="text-[22px] font-medium leading-tight tracking-tight text-neutral-900">
            {tForm('formCardHeading')}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">{tForm('formCardSubline')}</p>
        </div>

        <SimpleForm
          partner={{ id: partner.id, name: partner.name, tcUrl: partner.tcUrl }}
          shop={shop ? { id: shop.id, qr_token: shop.qr_token } : null}
          rep={rep}
          locale={locale}
          slug={slug}
          promoCode={promoCode}
        />

        <p className="text-center text-xs text-neutral-500">
          {tLanding('noEngagement')}
        </p>
      </section>
    </main>
  );
}
