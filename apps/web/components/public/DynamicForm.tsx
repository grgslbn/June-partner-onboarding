'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowRightIcon, ChevronLeftIcon, Loader2Icon } from 'lucide-react';
import {
  simpleLeadSchema,
  type SimpleLeadInput,
  type Locale,
} from '@june/shared';
import { BrandCheckbox } from '@/components/public/BrandCheckbox';
import {
  parseFormSchema,
  hasExtraFields,
  isVisible,
  isRequired,
  type PartnerFormSchema,
} from '@/lib/forms/form-schema';
import { computeSteps } from '@/lib/forms/compute-steps';
import { MobileField } from './form-fields/MobileField';
import { AddressField } from './form-fields/AddressField';
import { BusinessField } from './form-fields/BusinessField';
import { HousingTypeField } from './form-fields/HousingTypeField';
import { BirthDateField } from './form-fields/BirthDateField';
import { BillingFrequencyField } from './form-fields/BillingFrequencyField';
import { ProductChoiceField } from './form-fields/ProductChoiceField';
import { IbanField } from './form-fields/IbanField';
import { SepaField } from './form-fields/SepaField';

type Partner = {
  id: string;
  name: string;
  primaryColor?: string;
  tcUrl: string | null;
};

type Shop = { id: string; qr_token: string };
type Rep = { id: string };

type ProductChoice = { id: string; label_i18n: Record<string, string> };

const MIN_FILL_MS = 1500;

const inputClass =
  'h-12 w-full rounded-lg border border-neutral-200 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-[var(--partner-primary)] not-placeholder-shown:border-[var(--partner-primary)] aria-[invalid=true]:border-red-500';

export default function DynamicForm({
  partner,
  shop,
  rep,
  locale,
  slug,
  promoCode,
  formSchema: rawSchema,
  productChoices,
}: {
  partner: Partner;
  shop: Shop | null;
  rep: Rep | null;
  locale: Locale;
  slug: string;
  promoCode: string | null;
  formSchema?: unknown;
  productChoices?: ProductChoice[] | null;
}) {
  const router = useRouter();
  const t = useTranslations('public.form');
  const mountedAt = useRef(Date.now());
  const hpRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0); // 0-based index

  const schema: PartnerFormSchema = parseFormSchema(rawSchema);
  const multiStep = hasExtraFields(schema);
  const steps = computeSteps(schema);
  const totalStepCount = steps.length;
  const isLastStep = step === totalStepCount - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(simpleLeadSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      tcAccepted: false as unknown as true,
    },
  });
  const { register, handleSubmit, control, formState: { errors, isValid }, setValue, watch, trigger } = form;

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

  const onSubmit = async (data: SimpleLeadInput & Record<string, unknown>) => {
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
          promoCode: promoCode ?? null,
        }),
      });
      if (!res.ok) {
        toast.error(
          res.status >= 500 ? t('submitError.server') : t('submitError.generic'),
        );
        return;
      }
      const body: { confirmationId?: string; redirectUrl?: string } = await res.json().catch(() => ({}));
      if (body.redirectUrl) {
        window.location.href = body.redirectUrl;
        return;
      }
      const confirmationId = body.confirmationId ?? '';
      router.push(`/${locale}/p/${slug}/done?ref=${encodeURIComponent(confirmationId)}`);
    } catch {
      toast.error(t('submitError.network'));
    } finally {
      setSubmitting(false);
    }
  };

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

  // Step navigation
  async function handleNext() {
    const valid = await trigger();
    if (valid) setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  const currentStepFields = steps[step]?.fields ?? [];
  const primaryColor = partner.primaryColor;

  // Submit button style — partner-colored on multi-step; bg-neutral-900 on single step
  // (preserving byte-for-byte parity with SimpleForm for empty schema).
  const submitBtnClass =
    'mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 text-base font-medium text-white outline-none transition-colors hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400';
  const submitBtnStyle =
    multiStep && primaryColor && (!submitting && isValid)
      ? { backgroundColor: primaryColor }
      : undefined;

  const nextBtnStyle =
    primaryColor ? { backgroundColor: primaryColor } : undefined;

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

      {/* Step counter — only shown when there are multiple steps */}
      {multiStep && (
        <p className="text-xs font-medium text-neutral-500" aria-live="polite">
          {step + 1} / {totalStepCount}
        </p>
      )}

      {/* ── Step 1: core fields (always) ── */}
      {step === 0 && (
        <>
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
        </>
      )}

      {/* ── Extra steps: configurable fields ── */}
      {step > 0 && currentStepFields.map((fieldKey) => {
        const required = isRequired(schema, fieldKey);
        switch (fieldKey) {
          case 'mobile':
            return (
              <MobileField
                key="mobile"
                register={register}
                errors={errors}
                required={required}
                labels={{
                  label: t('mobile.label'),
                  placeholder: t('mobile.placeholder'),
                  error: t('validation.required'),
                }}
              />
            );
          case 'address':
            return (
              <AddressField
                key="address"
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                required={required}
                locale={locale}
                labels={{
                  streetLabel: t('address.streetLabel'),
                  streetPlaceholder: t('address.streetPlaceholder'),
                  postalCodeLabel: t('address.postalCodeLabel'),
                  postalCodePlaceholder: t('address.postalCodePlaceholder'),
                  cityLabel: t('address.cityLabel'),
                  cityPlaceholder: t('address.cityPlaceholder'),
                  error: t('validation.required'),
                }}
              />
            );
          case 'business':
            return (
              <BusinessField
                key="business"
                register={register}
                errors={errors}
                watch={watch}
                onChange={(field, value) => setValue(field, value, { shouldValidate: true })}
                required={required}
                labels={{
                  toggleLabel: t('business.toggleLabel'),
                  nameLabel: t('business.nameLabel'),
                  namePlaceholder: t('business.namePlaceholder'),
                  vatLabel: t('business.vatLabel'),
                  vatPlaceholder: t('business.vatPlaceholder'),
                  error: t('validation.required'),
                }}
              />
            );
          case 'housing_type':
            return (
              <HousingTypeField
                key="housing_type"
                register={register}
                errors={errors}
                required={required}
                labels={{
                  label: t('housingType.label'),
                  owner: t('housingType.owner'),
                  tenant: t('housingType.tenant'),
                  other: t('housingType.other'),
                  error: t('validation.required'),
                }}
              />
            );
          case 'birth_date':
            return (
              <BirthDateField
                key="birth_date"
                register={register}
                errors={errors}
                required={required}
                labels={{
                  label: t('birthDate.label'),
                  error: t('validation.required'),
                }}
              />
            );
          case 'billing_frequency':
            return (
              <BillingFrequencyField
                key="billing_frequency"
                register={register}
                errors={errors}
                required={required}
                labels={{
                  label: t('billingFrequency.label'),
                  monthly: t('billingFrequency.monthly'),
                  bimonthly: t('billingFrequency.bimonthly'),
                  annual: t('billingFrequency.annual'),
                  error: t('validation.required'),
                }}
              />
            );
          case 'product_choice':
            return (
              <ProductChoiceField
                key="product_choice"
                register={register}
                errors={errors}
                required={required}
                locale={locale}
                productChoices={productChoices ?? []}
                labels={{
                  label: t('productChoice.label'),
                  error: t('validation.required'),
                }}
              />
            );
          case 'iban':
            return (
              <IbanField
                key="iban"
                setValue={setValue}
                errors={errors}
                required={required}
                labels={{
                  label: t('iban.label'),
                  placeholder: t('iban.placeholder'),
                  error: t('iban.error'),
                }}
              />
            );
          case 'sepa_accepted':
            return (
              <SepaField
                key="sepa_accepted"
                control={control}
                label={t('sepa.label')}
              />
            );
          default:
            return null;
        }
      })}

      {/* T&C + submit on last step */}
      {isLastStep && (
        <>
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
            className={submitBtnClass}
            style={submitBtnStyle}
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
        </>
      )}

      {/* Navigation buttons for multi-step */}
      {multiStep && !isLastStep && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleNext}
            className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg text-base font-medium text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            style={nextBtnStyle ?? { backgroundColor: '#1a1a1a' }}
          >
            {t('nextButton')}
          </button>

          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white text-base font-medium text-neutral-700 outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2"
            >
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
              {t('prevButton')}
            </button>
          )}
        </div>
      )}

      {/* Back button on last step of multi-step form */}
      {multiStep && isLastStep && totalStepCount > 1 && (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white text-base font-medium text-neutral-700 outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2"
        >
          <ChevronLeftIcon className="size-5" aria-hidden="true" />
          {t('prevButton')}
        </button>
      )}
    </form>
  );
}
