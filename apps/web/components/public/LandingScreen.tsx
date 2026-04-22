'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Locale } from '@june/shared';

type Partner = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  foregroundColor: '#000000' | '#FFFFFF';
};

type Shop = { id: string; name: string; qr_token: string };
type Rep = { id: string; display_name: string };

export default function LandingScreen({
  partner,
  shop,
  reps,
  locale,
  slug,
  slogan,
  labels,
}: {
  partner: Partner;
  shop: Shop | null;
  reps: Rep[];
  locale: Locale;
  slug: string;
  slogan: string;
  labels: {
    welcome: string;
    startButton: string;
    repPickerLabel: string;
    repPickerPlaceholder: string;
    continueWithoutRep: string;
    noEngagement: string;
    poweredBy: string;
  };
}) {
  const router = useRouter();
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'landing_view',
        partner_id: partner.id,
        shop_id: shop?.id ?? null,
        meta: { locale, slug },
      }),
      keepalive: true,
    }).catch(() => {
      // stub; ignore
    });
  }, [partner.id, shop?.id, locale, slug]);

  const hasReps = reps.length > 0;
  const ctaReady = !hasReps || selectedRepId !== null;

  const onStart = () => {
    const qs = new URLSearchParams();
    if (shop) qs.set('shop', shop.qr_token);
    if (selectedRepId) qs.set('rep', selectedRepId);
    const query = qs.toString();
    router.push(`/${locale}/p/${slug}/form${query ? `?${query}` : ''}`);
  };

  const heroStyle = {
    '--partner-primary': partner.primaryColor,
    '--partner-fg': partner.foregroundColor,
    '--partner-fg-muted':
      partner.foregroundColor === '#FFFFFF'
        ? 'rgba(255,255,255,0.78)'
        : 'rgba(0,0,0,0.65)',
  } as React.CSSProperties;

  return (
    <main style={heroStyle} className="mx-auto flex min-h-screen max-w-[420px] flex-col">
      <header
        className="flex flex-1 flex-col items-center justify-center px-6 pt-16 pb-12 text-center"
        style={{
          backgroundColor: 'var(--partner-primary)',
          color: 'var(--partner-fg)',
        }}
      >
        {partner.logoUrl ? (
          <img
            src={partner.logoUrl}
            alt={partner.name}
            className="max-h-16 w-auto"
          />
        ) : (
          <div className="text-3xl font-semibold tracking-tight">{partner.name}</div>
        )}

        <h1 className="mt-12 text-4xl font-semibold leading-tight tracking-tight">
          {labels.welcome}
        </h1>

        {slogan && (
          <p className="mt-4 max-w-[22ch] text-lg leading-snug">{slogan}</p>
        )}
      </header>

      <section className="flex flex-col gap-6 bg-white px-6 pt-8 pb-10 text-neutral-900">
        {shop && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="rep-picker"
              className="text-sm font-medium text-neutral-700"
            >
              {labels.repPickerLabel}
            </label>

            {hasReps ? (
              <Select
                value={selectedRepId ?? undefined}
                onValueChange={(value) => setSelectedRepId(value)}
              >
                <SelectTrigger id="rep-picker" className="h-12 w-full">
                  <SelectValue placeholder={labels.repPickerPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {reps.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-neutral-600">{labels.continueWithoutRep}</p>
            )}
          </div>
        )}

        <Button
          type="button"
          onClick={onStart}
          disabled={!ctaReady}
          className="h-14 w-full text-base font-medium"
          style={{
            backgroundColor: 'var(--partner-primary)',
            color: 'var(--partner-fg)',
          }}
        >
          {labels.startButton}
        </Button>

        <p className="text-center text-xs text-neutral-500">{labels.noEngagement}</p>

        <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
          <span>{labels.poweredBy}</span>
          <img
            src="https://raw.githubusercontent.com/grgslbn/June-brand-assets/main/logo/June_logo_white.svg"
            alt="June"
            className="h-3 w-auto"
            style={{ filter: 'invert(1)' }}
          />
        </div>
      </section>
    </main>
  );
}
