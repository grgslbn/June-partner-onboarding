import { createServiceClient } from '@june/db';

export async function sendStripeBackupEmail(
  leadId: string,
  stripeUrl: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from('leads')
    .select(
      `id, first_name, last_name, email, locale, confirmation_id, promo_code, created_at,
       partner:partners(name, june_backup_email, stripe_promo_code),
       shop:shops(name),
       sales_rep:sales_reps(display_name)`,
    )
    .eq('id', leadId)
    .single();

  if (!lead) {
    console.error('[send-stripe-backup] lead not found', leadId);
    return;
  }

  const partner = Array.isArray(lead.partner) ? lead.partner[0] : lead.partner;
  const shop    = Array.isArray(lead.shop)    ? lead.shop[0]    : lead.shop;
  const rep     = Array.isArray(lead.sales_rep) ? lead.sales_rep[0] : lead.sales_rep;

  if (!partner?.june_backup_email) {
    console.error('[send-stripe-backup] june_backup_email missing for lead', leadId);
    return;
  }

  const resolvedPromo =
    (lead.promo_code ?? null) ||
    (partner.stripe_promo_code ?? null) ||
    null;

  const timestamp = new Date(lead.created_at ?? Date.now()).toISOString();

  const body = [
    `[June] Stripe redirect — ${lead.confirmation_id}`,
    '',
    `Customer:  ${lead.first_name ?? ''} ${lead.last_name ?? ''} <${lead.email ?? ''}>`,
    `Reference: ${lead.confirmation_id ?? ''}`,
    `Partner:   ${partner.name ?? ''}`,
    `Shop:      ${shop?.name ?? '(no shop)'}`,
    `Rep:       ${rep?.display_name ?? '(no rep)'}`,
    `Promo:     ${resolvedPromo ?? '(none)'}`,
    `Locale:    ${lead.locale ?? ''}`,
    '',
    `Stripe URL: ${stripeUrl}`,
    '',
    `Timestamp: ${timestamp}`,
  ].join('\n');

  const subject = `[June] Lead ${lead.confirmation_id} — Stripe redirect for ${lead.first_name ?? ''} ${lead.last_name ?? ''} (${partner.name ?? ''})`;

  const { error } = await supabase.from('email_send_queue').insert({
    email_type:    'stripe_redirect_backup',
    to_address:    partner.june_backup_email,
    subject,
    body_text:     body,
    lead_id:       leadId,
    max_failures:  3,
    status:        'pending',
    next_retry_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[send-stripe-backup] queue insert failed', error.message);
  }
}
