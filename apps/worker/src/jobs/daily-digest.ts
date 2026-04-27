import { toZonedTime, fromZonedTime, format as tzFormat } from 'date-fns-tz';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../lib/supabase.js';
import { buildCsv, type LeadRow } from '../lib/build-csv.js';
import { enqueue } from '../lib/queue.js';

const TZ = 'Europe/Brussels';
const DIGEST_FROM = 'digests@pos.june-energy.app';

function yesterdayWindowBrussels(): { start: Date; end: Date; label: string } {
  const nowBrussels = toZonedTime(new Date(), TZ);
  const yesterdayBrussels = subDays(nowBrussels, 1);
  const startLocal = startOfDay(yesterdayBrussels);
  const endLocal = endOfDay(yesterdayBrussels);
  // Convert back to UTC for Supabase query
  const start = fromZonedTime(startLocal, TZ);
  const end = fromZonedTime(endLocal, TZ);
  const label = tzFormat(yesterdayBrussels, 'dd/MM/yyyy', { timeZone: TZ });
  return { start, end, label };
}

export async function runDailyDigest(): Promise<void> {
  const jobStart = Date.now();
  const startedAt = new Date().toISOString();
  const { start, end, label } = yesterdayWindowBrussels();

  // Fetch all leads in window with joins
  const { data: rawLeads, error: leadsErr } = await supabase
    .from('leads')
    .select(`
      id,
      confirmation_id,
      created_at,
      first_name,
      last_name,
      email,
      locale,
      status,
      iban,
      deferred_completed_at,
      discount_code,
      partner:partners(id, slug, name, digest_partner_email, primary_color, flow_preset),
      shop:shops(name, qr_token),
      sales_rep:sales_reps(display_name, email)
    `)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (leadsErr) {
    console.error(JSON.stringify({ job: 'daily-digest', error: leadsErr.message }));
    return;
  }

  const leads = rawLeads ?? [];

  // Normalize Supabase join shape (can be array or object for many-to-one)
  const normalised: LeadRow[] = leads.map((l) => {
    const partner = Array.isArray(l.partner) ? l.partner[0] : l.partner;
    const shop    = Array.isArray(l.shop)    ? l.shop[0]    : l.shop;
    const rep     = Array.isArray(l.sales_rep) ? l.sales_rep[0] : l.sales_rep;

    const createdBrussels = l.created_at
      ? tzFormat(toZonedTime(new Date(l.created_at), TZ), "yyyy-MM-dd'T'HH:mm:ssxxx", { timeZone: TZ })
      : null;

    return {
      confirmation_id:      l.confirmation_id ?? null,
      created_at_utc:       l.created_at ?? null,
      created_at_brussels:  createdBrussels,
      partner_slug:         partner?.slug ?? null,
      partner_name:         partner?.name ?? null,
      shop_name:            shop?.name ?? null,
      shop_qr_token:        shop?.qr_token ?? null,
      sales_rep_name:       rep?.display_name ?? null,
      sales_rep_email:      (rep as { display_name?: string; email?: string } | null)?.email ?? null,
      first_name:           l.first_name ?? null,
      last_name:            l.last_name ?? null,
      email:                l.email ?? null,
      locale:               l.locale ?? null,
      status:               l.status ?? null,
      iban:                 l.iban ?? null,
      deferred_completed_at: l.deferred_completed_at ?? null,
      discount_code:        l.discount_code ?? null,
      flow_preset:          partner?.flow_preset ?? null,
    };
  });

  // Group by partner
  const byPartner = new Map<string, { rows: LeadRow[]; digest_email: string | null; name: string }>();
  for (const row of normalised) {
    const lead = leads[normalised.indexOf(row)]!;
    const partner = Array.isArray(lead.partner) ? lead.partner[0] : lead.partner;
    if (!partner) continue;
    const existing = byPartner.get(partner.id);
    if (existing) {
      existing.rows.push(row);
    } else {
      byPartner.set(partner.id, {
        rows: [row],
        digest_email: partner.digest_partner_email,
        name: partner.name,
      });
    }
  }

  let emailsSent = 0;
  let emailsFailed = 0;

  // Per-partner digest emails (skip if 0 leads or no digest email configured)
  for (const [, partnerData] of byPartner) {
    if (!partnerData.digest_email || partnerData.rows.length === 0) continue;

    const csv = buildCsv(partnerData.rows);
    const subject = `${partnerData.name} — Digest June du ${label}`;
    const html = buildPartnerDigestHtml(partnerData.name, label, partnerData.rows.length);
    const text = `${partnerData.name} — Digest June du ${label}\n\n${partnerData.rows.length} lead(s) en pièce jointe.`;

    try {
      await enqueue({
        email_type:  'digest_partner',
        to_address:  partnerData.digest_email,
        subject,
        body_html:   html,
        body_text:   text,
        attachments: [{ filename: `leads_${label.replace(/\//g, '-')}.csv`, content_base64: csv.toString('base64') }],
        max_failures: 3,
      });
      emailsSent++;
    } catch (err) {
      console.error(`[daily-digest] failed to enqueue partner email for ${partnerData.name}`, err);
      emailsFailed++;
    }
  }

  // Combined June CS email (always sends, even with 0 leads)
  const csEmail = process.env.JUNE_CS_DIGEST_EMAIL;
  if (!csEmail) {
    console.warn('[daily-digest] JUNE_CS_DIGEST_EMAIL not set — skipping CS digest');
  } else {
    const combinedCsv = buildCsv(normalised);
    const subject = `Digest June — ${label} — ${normalised.length} lead${normalised.length !== 1 ? 's' : ''}`;
    const html = buildCsDigestHtml(label, normalised.length, byPartner);
    const text = `Digest June ${label} — ${normalised.length} lead(s) total.`;

    try {
      await enqueue({
        email_type:  'digest_summary',
        to_address:  csEmail,
        subject,
        body_html:   html,
        body_text:   text,
        attachments: [{ filename: `all_leads_${label.replace(/\//g, '-')}.csv`, content_base64: combinedCsv.toString('base64') }],
        max_failures: 3,
      });
      emailsSent++;
    } catch (err) {
      console.error('[daily-digest] failed to enqueue CS digest email', err);
      emailsFailed++;
    }
  }

  console.log(JSON.stringify({
    job:                    'daily-digest',
    started_at:             startedAt,
    window_start_brussels:  fromZonedTime(startOfDay(toZonedTime(new Date(), TZ)), TZ).toISOString().replace('Z', '+00:00'),
    window_end_brussels:    end.toISOString(),
    leads_total:            normalised.length,
    partners_processed:     byPartner.size,
    emails_sent:            emailsSent,
    emails_failed:          emailsFailed,
    duration_ms:            Date.now() - jobStart,
  }));
}

function buildPartnerDigestHtml(partnerName: string, date: string, count: number): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Digest June</title></head>
<body style="font-family:sans-serif;color:#1a1a1a;padding:32px;max-width:600px;margin:0 auto">
  <h1 style="font-size:20px;font-weight:600;margin-bottom:8px">${esc(partnerName)} — Digest June du ${esc(date)}</h1>
  <p style="color:#555;font-size:14px;margin-bottom:24px">
    <strong>${count}</strong> lead${count !== 1 ? 's' : ''} reçu${count !== 1 ? 's' : ''} hier.
    Le fichier CSV complet est en pièce jointe.
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="font-size:12px;color:#9ca3af">
    Cet e-mail est envoyé automatiquement par la plateforme June Energy chaque matin.
  </p>
</body>
</html>`;
}

function buildCsDigestHtml(
  date: string,
  total: number,
  byPartner: Map<string, { rows: LeadRow[]; name: string }>,
): string {
  const rows = [...byPartner.entries()]
    .map(([, p]) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #f3f4f6">${esc(p.name)}</td><td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;text-align:right">${p.rows.length}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Digest June CS</title></head>
<body style="font-family:sans-serif;color:#1a1a1a;padding:32px;max-width:600px;margin:0 auto">
  <h1 style="font-size:20px;font-weight:600;margin-bottom:8px">Digest June — ${esc(date)}</h1>
  <p style="font-size:14px;color:#555;margin-bottom:16px">
    <strong>${total}</strong> lead${total !== 1 ? 's' : ''} total reçu${total !== 1 ? 's' : ''} hier.
  </p>
  ${byPartner.size > 0 ? `<table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:24px">
    <thead><tr>
      <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #e5e7eb">Partenaire</th>
      <th style="text-align:right;padding:4px 8px;border-bottom:2px solid #e5e7eb">Leads</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<p style="color:#9ca3af;font-size:14px">Aucun lead hier.</p>'}
  <p style="font-size:13px;color:#555">Le fichier CSV complet est en pièce jointe.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="font-size:12px;color:#9ca3af">Envoyé automatiquement par la plateforme June Energy.</p>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Allow ad-hoc runs: pnpm --filter=worker run daily-digest
if (process.argv[1]?.endsWith('daily-digest.js') || process.argv[1]?.endsWith('daily-digest.ts')) {
  runDailyDigest().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
