import { render } from '@react-email/render';
import { Resend } from 'resend';
import { createServiceClient } from '@june/db';
import { ConfirmationEmail } from '@/emails/ConfirmationEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@pos.june-energy.app';
const REPLY_TO = process.env.REPLY_TO_EMAIL ?? 'info@june.energy';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pos.june-energy.app').replace(/\/$/, '');

const DEV_MODE =
  process.env.NODE_ENV !== 'production' && !process.env.RESEND_DEV_SEND;

const SUBJECT_FALLBACK: Record<string, string> = {
  fr: 'Confirmation de votre inscription {{partnerName}} × June – Réf. {{confirmationId}}',
  nl: 'Bevestiging van uw inschrijving {{partnerName}} × June – Ref. {{confirmationId}}',
  en: 'Confirmation of your {{partnerName}} × June sign-up – Ref. {{confirmationId}}',
};

const BODY_FALLBACK: Record<string, string> = {
  fr: 'Merci **{{firstName}}** ! Votre demande a bien été reçue.\n\nRéférence : **{{confirmationId}}**.',
  nl: 'Bedankt **{{firstName}}**! Uw aanvraag is goed ontvangen.\n\nReferentie: **{{confirmationId}}**.',
  en: 'Thank you **{{firstName}}**! Your request has been received.\n\nReference: **{{confirmationId}}**.',
};

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] !== undefined ? htmlEscape(vars[key]) : '',
  );
}

function buildBody(
  template: string,
  vars: Record<string, string>,
  magicLink: string | undefined,
): string {
  let body = template;
  if (!magicLink) {
    // Strip any line containing the {{magicLink}} placeholder
    body = body
      .split('\n')
      .filter((line) => !line.includes('{{magicLink}}'))
      .join('\n')
      .trim();
  }
  return substitute(body, vars);
}

export async function sendConfirmationEmail(
  leadId: string,
  _partnerId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from('leads')
    .select(
      `id, first_name, last_name, email, locale, confirmation_id, deferred_token,
       partner:partners(id, name, logo_url, primary_color, iban_behavior, confirmation_email_subject_i18n, confirmation_email_body_i18n),
       shop:shops(name),
       sales_rep:sales_reps(display_name)`,
    )
    .eq('id', leadId)
    .single();

  if (!lead) {
    console.error('[send-confirmation] lead not found', leadId);
    return;
  }

  // Supabase returns related rows as object (many-to-one) or null
  const partner = Array.isArray(lead.partner) ? lead.partner[0] : lead.partner;
  const shop = Array.isArray(lead.shop) ? lead.shop[0] : lead.shop;
  const rep = Array.isArray(lead.sales_rep)
    ? lead.sales_rep[0]
    : lead.sales_rep;

  if (!partner) {
    console.error('[send-confirmation] partner missing for lead', leadId);
    return;
  }

  const locale = lead.locale ?? 'fr';
  const magicLink = lead.deferred_token
    ? `${SITE_URL}/${locale}/complete/${lead.deferred_token}`
    : undefined;

  const vars: Record<string, string> = {
    firstName: lead.first_name ?? '',
    lastName: lead.last_name ?? '',
    email: lead.email ?? '',
    partnerName: partner.name ?? '',
    repName: rep?.display_name ?? 'our team',
    shopName: shop?.name ?? partner.name ?? '',
    magicLink: magicLink ?? '',
    confirmationId: lead.confirmation_id ?? '',
  };

  const bodyI18n = partner.confirmation_email_body_i18n as
    | Record<string, string>
    | null;
  const rawBody =
    bodyI18n?.[locale] ??
    bodyI18n?.['fr'] ??
    BODY_FALLBACK[locale] ??
    BODY_FALLBACK['fr'];

  const body = buildBody(rawBody, vars, magicLink);

  const emailEl = (
    <ConfirmationEmail
      partner={partner}
      lead={{
        first_name: lead.first_name ?? '',
        last_name: lead.last_name ?? '',
        email: lead.email ?? '',
        confirmation_id: lead.confirmation_id ?? '',
      }}
      customBody={body}
      magicLink={magicLink}
      ibanBehavior={partner.iban_behavior ?? undefined}
      shopName={shop?.name ?? undefined}
      repName={rep?.display_name ?? undefined}
      locale={locale}
      leadId={leadId}
      siteUrl={SITE_URL}
    />
  );

  const html = await render(emailEl);
  const text = await render(emailEl, { plainText: true });

  if (DEV_MODE) {
    console.info(
      '[send-confirmation] DEV MODE — email HTML (set RESEND_DEV_SEND=true to send for real):\n',
      html,
    );
    return;
  }

  const subjectI18n = partner.confirmation_email_subject_i18n as
    | Record<string, string>
    | null;
  const rawSubject =
    subjectI18n?.[locale] ??
    subjectI18n?.['fr'] ??
    SUBJECT_FALLBACK[locale] ??
    SUBJECT_FALLBACK['fr'];

  // Subject is plain text — no HTML escaping, but strip leftover placeholders
  const subject = rawSubject.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] !== undefined ? vars[key] : '',
  );

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

    await supabase
      .from('leads')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', leadId);
  } catch (err) {
    console.error('[send-confirmation] Resend error', err);
    await supabase.from('email_send_queue').insert({
      email_type:  'confirmation',
      to_address:  lead.email,
      subject,
      body_html:   html,
      body_text:   text,
      lead_id:     leadId,
      max_failures: 5,
      next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_error:  String(err),
      failure_count: 1,
    });
  }
}
