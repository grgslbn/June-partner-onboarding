'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowRightIcon, Loader2Icon } from 'lucide-react';
import {
  simpleLeadSchema,
  type SimpleLeadInput,
  type Locale,
} from '@june/shared';
import { BrandCheckbox } from '@/components/public/BrandCheckbox';

type Partner = {
  id: string;
  name: string;
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
  const startedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<SimpleLeadInput>({
    resolver: zodResolver(simpleLeadSchema),
    mode: 'onChange',
    defaultValues: { firstName: '', lastName: '', email: '', tcAccepted: false as unknown as true },
  });

  // form_started fires on first focus of any form field, once per session
  // (sessionStorage-guarded across refreshes).
  const handleFormFocus = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const key = `form_started:${partner.id}:${shop?.id ?? 'no-shop'}`;
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    }
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
    }).catch(() => {});
  };

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
          salesRepId: rep?.id || null,
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
      const confirmationId = body.confirmationId ?? '';
      router.push(`/${locale}/p/${slug}/done?ref=${encodeURIComponent(confirmationId)}`);
    } catch {
      toast.error(t('submitError.network'));
    } finally {
      setSubmitting(false);
    }
  };

  // Link text is partner-themed, but `var(--partner-primary)` on white fails
  // WCAG AA 4.5:1 for every primary we're likely to see at normal size (red
  // #E53935 is 4.22:1). Derive a darker variant via color-mix so the tint
  // reads partner-branded while staying accessible on white.
  const linkStyle: React.CSSProperties = {
    color: 'color-mix(in oklch, var(--partner-primary) 70%, black)',
  };
  const tcLink = (chunks: ReactNode) =>
    partner.tcUrl ? (
      <a
        href={partner.tcUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        className="font-medium underline underline-offset-2"
      >
        {chunks}
      </a>
    ) : (
      <span style={linkStyle} className="font-medium underline underline-offset-2">
        {chunks}
      </span>
    );

  const inputClass =
    'h-12 w-full rounded-lg border border-neutral-200 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-[var(--partner-primary)] not-placeholder-shown:border-[var(--partner-primary)] aria-[invalid=true]:border-red-500';

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      onFocus={handleFormFocus}
      className="flex flex-col gap-5"
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
        <label htmlFor="firstName" className="text-sm font-medium text-neutral-700">
          {t('firstName')}
        </label>
        <input
          id="firstName"
          autoComplete="given-name"
          placeholder={t('placeholderFirstName')}
          aria-invalid={!!errors.firstName}
          aria-describedby={errors.firstName ? 'firstName-error' : undefined}
          className={inputClass}
          {...register('firstName')}
        />
        {errors.firstName && (
          <p id="firstName-error" role="alert" className="text-sm text-red-600">
            {t('validation.required')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lastName" className="text-sm font-medium text-neutral-700">
          {t('lastName')}
        </label>
        <input
          id="lastName"
          autoComplete="family-name"
          placeholder={t('placeholderLastName')}
          aria-invalid={!!errors.lastName}
          aria-describedby={errors.lastName ? 'lastName-error' : undefined}
          className={inputClass}
          {...register('lastName')}
        />
        {errors.lastName && (
          <p id="lastName-error" role="alert" className="text-sm text-red-600">
            {t('validation.required')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          {t('email')}
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('placeholderEmail')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={inputClass}
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
          <label
            htmlFor="tcAccepted"
            className="mt-1 flex cursor-pointer items-start gap-3 text-sm font-normal leading-snug text-neutral-700"
          >
            <BrandCheckbox
              id="tcAccepted"
              checked={field.value === true}
              onCheckedChange={(v) => field.onChange(v === true)}
              className="mt-0.5"
              aria-required="true"
            />
            <span>
              {t.rich('tcAccept', { link: tcLink, partnerName: partner.name })}
            </span>
          </label>
        )}
      />

      <button
        type="submit"
        disabled={!isValid || submitting}
        className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 text-base font-medium text-white outline-none transition-colors hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        {submitting ? (
          <>
            <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
            <span>{t('submitting')}</span>
          </>
        ) : (
          <>
            <span>{t('submitButton')}</span>
            <ArrowRightIcon className="size-5" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
