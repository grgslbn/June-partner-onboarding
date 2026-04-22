'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2Icon } from 'lucide-react';
import {
  simpleLeadSchema,
  type SimpleLeadInput,
  type Locale,
} from '@june/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type Partner = {
  id: string;
  name: string;
  primaryColor: string;
  foregroundColor: '#000000' | '#FFFFFF';
  tcUrl: string | null;
};

type Shop = { id: string; qr_token: string };
type Rep = { id: string };

const MIN_FILL_MS = 1500;

export default function SimpleForm({
  partner,
  shop,
  rep,
  locale,
  slug,
}: {
  partner: Partner;
  shop: Shop | null;
  rep: Rep | null;
  locale: Locale;
  slug: string;
}) {
  const router = useRouter();
  const t = useTranslations('public.form');
  const mountedAt = useRef(Date.now());
  const hpRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<SimpleLeadInput>({
    resolver: zodResolver(simpleLeadSchema),
    mode: 'onBlur',
    defaultValues: { firstName: '', lastName: '', email: '', tcAccepted: false as unknown as true },
  });

  // form_started fires once per session for this partner+shop combination.
  useEffect(() => {
    const key = `form_started:${partner.id}:${shop?.id ?? 'no-shop'}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1');
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'form_started',
        partnerSlug: slug,
        shopToken: shop?.qr_token ?? null,
        meta: { locale },
      }),
      keepalive: true,
    }).catch(() => {
      // analytics is fire-and-forget
    });
  }, [partner.id, shop?.id, shop?.qr_token, locale, slug]);

  const onSubmit = async (data: SimpleLeadInput) => {
    if (Date.now() - mountedAt.current < MIN_FILL_MS) {
      toast.error(t('submitError.tooFast'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          partnerSlug: slug,
          shopToken: shop?.qr_token ?? null,
          salesRepId: rep?.id ?? null,
          locale,
          honeypot: hpRef.current?.value ?? '',
        }),
      });
      if (!res.ok) {
        toast.error(
          res.status >= 500 ? t('submitError.server') : t('submitError.generic'),
        );
        return;
      }
      const body: { confirmationId?: string } = await res.json().catch(() => ({}));
      const ref = body.confirmationId ?? '';
      router.push(`/${locale}/p/${slug}/done?ref=${encodeURIComponent(ref)}`);
    } catch {
      toast.error(t('submitError.network'));
    } finally {
      setSubmitting(false);
    }
  };

  const tcLink = (chunks: ReactNode) =>
    partner.tcUrl ? (
      <a
        href={partner.tcUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        {chunks}
      </a>
    ) : (
      <span className="underline underline-offset-2">{chunks}</span>
    );

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <input
        ref={hpRef}
        type="text"
        name="_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ display: 'none' }}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">{t('firstName')}</Label>
        <Input
          id="firstName"
          autoComplete="given-name"
          aria-invalid={!!errors.firstName}
          aria-describedby={errors.firstName ? 'firstName-error' : undefined}
          className="h-12"
          {...register('firstName')}
        />
        {errors.firstName && (
          <p
            id="firstName-error"
            role="alert"
            className="text-sm text-red-600"
          >
            {t('validation.required')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="lastName">{t('lastName')}</Label>
        <Input
          id="lastName"
          autoComplete="family-name"
          aria-invalid={!!errors.lastName}
          aria-describedby={errors.lastName ? 'lastName-error' : undefined}
          className="h-12"
          {...register('lastName')}
        />
        {errors.lastName && (
          <p id="lastName-error" role="alert" className="text-sm text-red-600">
            {t('validation.required')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="h-12"
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-red-600">
            {t('validation.email')}
          </p>
        )}
      </div>

      <Controller
        control={control}
        name="tcAccepted"
        render={({ field }) => (
          <Label
            htmlFor="tcAccepted"
            className="flex cursor-pointer items-start gap-3 text-sm font-normal leading-snug text-neutral-700"
          >
            <Checkbox
              id="tcAccepted"
              checked={field.value === true}
              onCheckedChange={(v) => field.onChange(v === true)}
              className="mt-0.5"
              aria-required="true"
            />
            <span>{t.rich('tcAccept', { link: tcLink })}</span>
          </Label>
        )}
      />

      <Button
        type="submit"
        disabled={!isValid || submitting}
        className="h-14 w-full text-base font-medium disabled:opacity-60"
        style={{
          backgroundColor: partner.primaryColor,
          color: partner.foregroundColor,
        }}
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
            {t('submitting')}
          </span>
        ) : (
          t('submitButton')
        )}
      </Button>
    </form>
  );
}
