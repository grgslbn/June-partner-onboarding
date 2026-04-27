import { getTranslations } from 'next-intl/server';
import { MailIcon } from 'lucide-react';
import { createServiceClient } from '@june/db';
import { contrastForeground } from '@june/shared';
import IbanForm from '@/components/public/IbanForm';

const TOKEN_TTL_DAYS = 30;

type Partner = {
  name: string;
  logo_url: string | null;
  primary_color: string;
};

type PageState =
  | { kind: 'invalid' }
  | { kind: 'expired' }
  | { kind: 'already_complete'; confirmationId: string; partner: Partner }
  | { kind: 'pending'; token: string; confirmationId: string; partner: Partner };

async function resolveState(token: string): Promise<PageState> {
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('confirmation_id, created_at, deferred_completed_at, partner:partners(name, logo_url, primary_color)')
    .eq('deferred_token', token)
    .maybeSingle();

  if (!lead) return { kind: 'invalid' };

  const partner = Array.isArray(lead.partner) ? lead.partner[0] : lead.partner;
  if (!partner) return { kind: 'invalid' };

  const p: Partner = {
    name: partner.name,
    logo_url: partner.logo_url,
    primary_color: partner.primary_color ?? '#1a56db',
  };

  if (lead.deferred_completed_at) {
    return { kind: 'already_complete', confirmationId: lead.confirmation_id, partner: p };
  }

  const ageMs = Date.now() - new Date(lead.created_at!).getTime();
  if (ageMs > TOKEN_TTL_DAYS * 86_400_000) {
    return { kind: 'expired' };
  }

  return { kind: 'pending', token, confirmationId: lead.confirmation_id, partner: p };
}

function StatusCard({
  primaryColor,
  logoUrl,
  partnerName,
  icon,
  title,
  message,
  contactEmail,
  confirmationId,
  refLabel,
}: {
  primaryColor: string;
  logoUrl: string | null;
  partnerName: string;
  icon: React.ReactNode;
  title: string;
  message: string;
  contactEmail?: string;
  confirmationId?: string;
  refLabel?: string;
}) {
  const fg = contrastForeground(primaryColor);
  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-white">
      <header
        className="flex flex-col items-center px-6 pt-12 pb-10 text-center"
        style={{ backgroundColor: primaryColor, color: fg }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={partnerName} className="h-8 w-auto" />
        ) : (
          <span className="text-lg font-bold">{partnerName} × June</span>
        )}
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="text-neutral-400">{icon}</div>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        <p className="text-neutral-600">
          {message}{' '}
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">
              {contactEmail}
            </a>
          )}
        </p>
        {confirmationId && refLabel && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <span className="text-sm text-neutral-500">{refLabel}</span>
            <span className="font-mono text-lg font-semibold tracking-wider text-neutral-900">
              {confirmationId}
            </span>
          </div>
        )}
      </section>
    </main>
  );
}

export default async function CompletePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: 'public.complete' });

  const state = await resolveState(token);

  if (state.kind === 'invalid') {
    return (
      <StatusCard
        primaryColor="#1a56db"
        logoUrl={null}
        partnerName="June"
        icon={<MailIcon className="mx-auto size-12" />}
        title={t('invalidTitle')}
        message={t('invalidMessage')}
        contactEmail={t('contactEmail')}
      />
    );
  }

  if (state.kind === 'expired') {
    return (
      <StatusCard
        primaryColor="#1a56db"
        logoUrl={null}
        partnerName="June"
        icon={<MailIcon className="mx-auto size-12" />}
        title={t('expiredTitle')}
        message={t('expiredMessage')}
        contactEmail={t('contactEmail')}
      />
    );
  }

  const { partner } = state;
  const fg = contrastForeground(partner.primary_color);

  if (state.kind === 'already_complete') {
    return (
      <StatusCard
        primaryColor={partner.primary_color}
        logoUrl={partner.logo_url}
        partnerName={partner.name}
        icon={<MailIcon className="mx-auto size-12" />}
        title={t('alreadyTitle')}
        message={t('alreadyMessage')}
        confirmationId={state.confirmationId}
        refLabel={t('reference')}
      />
    );
  }

  // pending — render the IBAN form
  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-white">
      <header
        className="flex flex-col items-center gap-4 px-6 pt-12 pb-10 text-center"
        style={{ backgroundColor: partner.primary_color, color: fg }}
      >
        {partner.logo_url ? (
          <img src={partner.logo_url} alt={partner.name} className="h-8 w-auto" />
        ) : (
          <span className="text-lg font-bold">{partner.name} × June</span>
        )}
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{t('heading')}</h1>
          <p className="mt-2 text-sm opacity-85">{t('subline')}</p>
        </div>
      </header>

      <section className="flex flex-col gap-6 px-6 pt-8 pb-10">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t('reference')}</span>
          <span className="font-mono text-base font-semibold tracking-wider text-neutral-900">
            {state.confirmationId}
          </span>
        </div>

        <IbanForm
          token={token}
          locale={locale}
          primaryColor={partner.primary_color}
          strings={{
            ibanLabel: t('ibanLabel'),
            ibanPlaceholder: t('ibanPlaceholder'),
            ibanError: t('ibanError'),
            sepaLabel: t('sepaLabel'),
            submit: t('submit'),
            submitting: t('submitting'),
            successTitle: t('successTitle'),
            successMessage: t('successMessage'),
            reference: t('reference'),
            errorGeneric: t('submitError.generic'),
            errorNetwork: t('submitError.network'),
            errorTooFast: t('submitError.tooFast'),
          }}
          confirmationId={state.confirmationId}
        />
      </section>
    </main>
  );
}
