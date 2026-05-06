import { createServiceClient } from '@june/db';

function formatBrusselsDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-BE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function row(label: string, value: string | null | undefined): string {
  return `
    <tr>
      <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:4px 0;color:#111827;font-size:13px">${value ?? '<em style="color:#9ca3af">—</em>'}</td>
    </tr>`;
}

function section(title: string, rows: string): string {
  return `
    <tr><td colspan="2" style="padding:16px 0 4px">
      <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#374151">${title}</strong>
    </td></tr>
    ${rows}`;
}

export async function sendJuneCsEmail(leadId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from('leads')
    .select(
      `id, first_name, last_name, email, mobile, birth_date, address,
       is_business, business_name, business_vat,
       iban, sepa_accepted, tc_accepted_at,
       locale, confirmation_id, promo_code, created_at,
       partner:partners(name, june_cs_email),
       shop:shops(name),
       sales_rep:sales_reps(display_name)`,
    )
    .eq('id', leadId)
    .single();

  if (!lead) {
    console.error('[send-june-cs] lead not found', leadId);
    return;
  }

  const partner = Array.isArray(lead.partner) ? lead.partner[0] : lead.partner;
  const shop    = Array.isArray(lead.shop)    ? lead.shop[0]    : lead.shop;
  const rep     = Array.isArray(lead.sales_rep) ? lead.sales_rep[0] : lead.sales_rep;

  if (!partner?.june_cs_email) {
    console.info('[send-june-cs] june_cs_email not configured — skipping', leadId);
    return;
  }

  const addr = lead.address as { street?: string; postal_code?: string; city?: string } | null;
  const createdAt = lead.created_at ? formatBrusselsDate(lead.created_at) : '—';
  const ref = lead.confirmation_id ?? leadId.slice(0, 8).toUpperCase();

  const tableRows = [
    row('Référence', ref),
    row('Date', createdAt + ' (Brussels)'),
    row('Partenaire', partner.name),
    row('Magasin', shop?.name),
    row('Vendeur', rep?.display_name),
    row('Code promo', lead.promo_code),

    section('Coordonnées client', [
      row('Prénom', lead.first_name),
      row('Nom', lead.last_name),
      row('Email', lead.email),
      row('Téléphone', lead.mobile),
      row('Date de naissance', lead.birth_date ?? undefined),
    ].join('')),

    section('Adresse', [
      row('Rue', addr?.street),
      row('Code postal', addr?.postal_code),
      row('Ville', addr?.city),
    ].join('')),

    section('Entreprise', [
      row('Client professionnel', lead.is_business ? 'Oui' : lead.is_business === false ? 'Non' : undefined),
      row('Nom entreprise', lead.business_name),
      row('N° TVA', lead.business_vat),
    ].join('')),

    section('Paiement', [
      row('IBAN', lead.iban),
      row('Mandat SEPA', lead.sepa_accepted ? 'Accepté' : lead.sepa_accepted === false ? 'Refusé' : undefined),
    ].join('')),

    section('Conditions', [
      row('CGV acceptées', lead.tc_accepted_at ? 'Oui' : 'Non'),
    ].join('')),
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Nouveau lead ${partner.name}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:32px 0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1e3a5f;padding:20px 28px">
      <p style="margin:0;color:#fff;font-size:16px;font-weight:700">June POS — Nouveau lead</p>
      <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${partner.name} · ${ref}</p>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse">
        ${tableRows}
      </table>
    </div>
    <div style="padding:12px 28px 20px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af">
        Cet email est généré automatiquement par June POS. Ne pas répondre.
        Lead ID&nbsp;: ${leadId}
      </p>
    </div>
  </div>
</body>
</html>`;

  const subject = `Nouveau lead ${partner.name} — ${lead.first_name ?? ''} ${lead.last_name ?? ''} — ${ref}`;

  const { error } = await supabase.from('email_send_queue').insert({
    email_type:    'june_cs_lead',
    to_address:    partner.june_cs_email,
    subject,
    body_html:     html,
    lead_id:       leadId,
    max_failures:  3,
    status:        'pending',
    next_retry_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[send-june-cs] queue insert failed', error.message);
  }
}
