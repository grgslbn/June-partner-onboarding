import { render } from '@react-email/render';
import { Resend } from 'resend';
import { createServiceClient } from '@june/db';
import { SelfOnboardingEmail } from '@/emails/SelfOnboardingEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@pos.june-energy.app';
const REPLY_TO = process.env.REPLY_TO_EMAIL ?? 'info@june.energy';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pos.june-energy.app').replace(/\/$/, '');

const DEV_MODE =
  process.env.NODE_ENV !== 'production' && !process.env.RESEND_DEV_SEND;

const SUBJECT_I18N = {
  fr: (firstName: string, partner: string) =>
    `${firstName}, finalisez votre contrat June chez ${partner}`,
  nl: (firstName: string, partner: string) =>
    `${firstName}, voltooi uw June-contract bij ${partner}`,
  en: (firstName: string, partner: string) =>
    `${firstName}, complete your June contract via ${partner}`,
} as const;

type SubjectLocale = keyof typeof SUBJECT_I18N;

export async function sendSelfOnboardingEmail(
  leadId: string,
  stripeUrl: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from('leads')
    .select(
      `id, first_name, email, locale, confirmation_id,
       partner:partners(id, name, logo_url, primary_color)`,
    )
    .eq('id', leadId)
    .single();

  if (!lead) {
    console.error('[send-self-onboarding] lead not found', leadId);
    return;
  }

  const partner = Array.isArray(lead.partner) ? lead.partner[0] : lead.partner;
  if (!partner) {
    console.error('[send-self-onboarding] partner missing for lead', leadId);
    return;
  }

  const locale = lead.locale ?? 'fr';
  const subjectFn =
    SUBJECT_I18N[(locale as SubjectLocale) in SUBJECT_I18N ? (locale as SubjectLocale) : 'fr'];
  const subject = subjectFn(lead.first_name ?? '', partner.name ?? '');

  const emailEl = (
    <SelfOnboardingEmail
      partner={partner}
      lead={{
        first_name: lead.first_name ?? '',
        email: lead.email ?? '',
        confirmation_id: lead.confirmation_id ?? '',
      }}
      stripeUrl={stripeUrl}
      locale={locale}
      leadId={leadId}
      siteUrl={SITE_URL}
    />
  );

  const html = await render(emailEl);
  const text = await render(emailEl, { plainText: true });

  if (DEV_MODE) {
    console.info(
      '[send-self-onboarding] DEV MODE — email HTML (set RESEND_DEV_SEND=true to send for real):\n',
      html,
    );
    return;
  }

  const from = `${partner.name} × June <${FROM_EMAIL}>`;
  const unsubscribeUrl = `${SITE_URL}/${locale}/unsubscribe/${leadId}`;

  try {
    await resend.emails.send({
      from,
      to: lead.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=unsubscribe>, <${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'leadId', value: leadId }],
    });
  } catch (err) {
    console.error('[send-self-onboarding] Resend error', err);
    await supabase.from('email_send_queue').insert({
      email_type:    'confirmation',
      to_address:    lead.email,
      subject,
      body_html:     html,
      body_text:     text,
      lead_id:       leadId,
      max_failures:  5,
      next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_error:    String(err),
      failure_count: 1,
    });
  }
}
