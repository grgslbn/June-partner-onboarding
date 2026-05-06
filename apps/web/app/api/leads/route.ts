import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@june/db';
import { simpleLeadSubmitSchema } from '@june/shared';
import { getCachedPartnerBySlug } from '@/lib/partner-cache';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { sendConfirmationEmail } from '@/lib/emails/send-confirmation';
import { sendSelfOnboardingEmail } from '@/lib/emails/send-self-onboarding';
import { sendJuneBackupEmail } from '@/lib/emails/send-june-backup';
import { parseFormSchema } from '@/lib/forms/form-schema';
import { validateFormFields } from '@/lib/forms/validate-submission';

// Returns the discount_code id if the code was valid and incremented, null if dropped.
// Never throws — the lead must succeed even if the discount increment fails.
async function applyDiscount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  partnerId: string,
  leadId: string,
  code: string,
): Promise<string | null> {
  const upperCode = code.toUpperCase();

  // Re-validate inline (race protection)
  const { data: dc } = await supabase
    .from('discount_codes')
    .select('id, active, valid_from, valid_to, max_uses, used_count')
    .eq('partner_id', partnerId)
    .eq('code', upperCode)
    .maybeSingle();

  if (!dc || !dc.active) return null;

  const now = new Date();
  if (dc.valid_from && new Date(dc.valid_from) > now) return null;
  if (dc.valid_to   && new Date(dc.valid_to)   < now) return null;
  if (dc.max_uses != null && dc.used_count >= dc.max_uses) return null;

  // Atomic increment with exhaustion guard
  const { data: updated } = await supabase
    .from('discount_codes')
    .update({ used_count: dc.used_count + 1 })
    .eq('id', dc.id)
    .or(`max_uses.is.null,used_count.lt.${dc.max_uses}`)
    .select('id')
    .single();

  if (!updated) {
    // Race: another request exhausted the code between our select and update
    console.warn('[leads] discount race-exhausted, dropping', { code: upperCode, leadId });
    return null;
  }

  // Stamp the discount on the lead row
  await supabase
    .from('leads')
    .update({ discount_code: upperCode })
    .eq('id', leadId);

  return dc.id;
}

function generateDeferredToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function safeIp(raw: string): string | null {
  if (!raw || raw === 'unknown') return null;
  if (/^[0-9a-fA-F:.]+$/.test(raw)) return raw;
  return null;
}

// Builds the Stripe checkout URL with the three allowed prefill params.
// Only adds prefilled_promo_code when promo is non-empty — never passes empty string.
function buildStripeUrl(
  template: string,
  email: string,
  promo: string | null,
  locale: string,
): string {
  const url = new URL(template);
  url.searchParams.set('prefilled_email', email);
  if (promo) url.searchParams.set('prefilled_promo_code', promo);
  url.searchParams.set('locale', locale);
  return url.toString();
}

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = simpleLeadSubmitSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Honeypot — any non-empty value is a bot. Server-side check is the
  // authoritative one; the client's early return is a UX nicety.
  if (body.honeypot && body.honeypot.length > 0) {
    return NextResponse.json({ error: 'rejected' }, { status: 400 });
  }

  const ip = clientIp(request);
  const ipOk = await rateLimit(`leads:ip:${ip}`, 5, 60);
  if (!ipOk) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  if (body.shopToken) {
    const shopOk = await rateLimit(`leads:shop:${body.shopToken}`, 20, 60);
    if (!shopOk) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const partner = await getCachedPartnerBySlug(body.partnerSlug);
  if (!partner || !partner.active) {
    return NextResponse.json({ error: 'partner_not_found' }, { status: 404 });
  }
  if (partner.flow_preset !== 'simple') {
    return NextResponse.json({ error: 'preset_not_supported' }, { status: 400 });
  }

  // Pre-flight config check: Stripe routes require stripe_url_template.
  // june_backup_email is important but missing config is non-fatal — log and continue.
  const route = partner.submission_route ?? 'cs_handoff';
  if (route !== 'cs_handoff' && !partner.stripe_url_template) {
    console.error('[leads] stripe_url_template not configured', { partnerId: partner.id, route });
    return NextResponse.json(
      { error: 'partner_config_error', message: 'stripe_url_template not configured for this submission route' },
      { status: 500 },
    );
  }
  if (!partner.june_backup_email) {
    console.warn('[leads] june_backup_email not configured — backup email will be skipped', { partnerId: partner.id, route });
  }

  // Validate configurable fields against partner's form_schema.
  const formSchema = parseFormSchema(partner.form_schema);
  const missingFields = validateFormFields(formSchema, {
    mobile:           body.mobile ?? null,
    address:          body.address ?? null,
    is_business:      body.is_business ?? null,
    business_name:    body.business_name ?? null,
    business_vat:     body.business_vat ?? null,
    iban:             body.iban ?? null,
    sepa_accepted:    body.sepa_accepted ?? null,
    housing_type:     body.housing_type ?? null,
    birth_date:       body.birth_date ?? null,
    billing_frequency: body.billing_frequency ?? null,
    product_choice:   body.product_choice ?? null,
  });
  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: 'missing_required_fields', fields: missingFields },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  let shopId: string | null = null;
  if (body.shopToken) {
    const { data: shopRow } = await supabase
      .from('shops')
      .select('id, partner_id, active')
      .eq('qr_token', body.shopToken)
      .maybeSingle();
    if (!shopRow || shopRow.partner_id !== partner.id || !shopRow.active) {
      return NextResponse.json({ error: 'shop_not_found' }, { status: 404 });
    }
    shopId = shopRow.id;
  }

  let salesRepId: string | null = null;
  if (body.salesRepId && shopId) {
    const { data: repRow } = await supabase
      .from('sales_reps')
      .select('id, shop_id, active')
      .eq('id', body.salesRepId)
      .maybeSingle();
    if (repRow && repRow.shop_id === shopId && repRow.active) {
      salesRepId = repRow.id;
    } else {
      // Graceful degradation per briefing: log and continue with rep = null.
      console.warn('[leads] salesRepId mismatch; proceeding without rep', {
        salesRepId: body.salesRepId,
        shopId,
      });
    }
  }

  const deferredToken =
    partner.iban_behavior === 'deferred' ? generateDeferredToken() : null;

  // Promo code: URL param (body.promoCode) wins; stored on the lead as-is.
  // The resolved promo for Stripe (body param OR partner default) is computed below.
  const promoCode = body.promoCode ?? null;

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      partner_id: partner.id,
      shop_id: shopId,
      sales_rep_id: salesRepId,
      status: 'submitted',
      locale: body.locale,
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      tc_accepted_at: new Date().toISOString(),
      user_agent: request.headers.get('user-agent'),
      ip_address: safeIp(ip),
      deferred_token: deferredToken,
      promo_code: promoCode,
      // Configurable fields — null when not collected
      mobile:            body.mobile ?? null,
      address:           body.address ?? null,
      is_business:       body.is_business ?? null,
      business_name:     body.business_name ?? null,
      business_vat:      body.business_vat ?? null,
      iban:              body.iban ?? null,
      sepa_accepted:     body.sepa_accepted ?? null,
      housing_type:      body.housing_type ?? null,
      birth_date:        body.birth_date ?? null,
      billing_frequency: body.billing_frequency ?? null,
      product_choice:    body.product_choice ?? null,
    })
    .select('id, confirmation_id, deferred_token, email')
    .single();

  if (insertError || !lead) {
    console.error('[leads] insert failed', insertError);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  // Discount: apply if provided, but never fail the lead over it
  if (body.discountCode) {
    await applyDiscount(supabase, partner.id, lead.id, body.discountCode);
  }

  const { error: eventError } = await supabase.from('events').insert({
    event_type: 'form_submitted',
    partner_id: partner.id,
    shop_id: shopId,
    lead_id: lead.id,
  });
  if (eventError) {
    // Don't fail the request — event is analytics, not critical path.
    console.error('[leads] form_submitted event insert failed', eventError);
  }

  // ── Route dispatch ────────────────────────────────────────────────────────

  // Build Stripe URL for routes that need it (null for cs_handoff).
  const stripeUrl =
    route !== 'cs_handoff'
      ? buildStripeUrl(
          partner.stripe_url_template!,
          lead.email!,
          promoCode || partner.stripe_promo_code || null,
          body.locale,
        )
      : null;

  // Backup notification fires for every route. Fire-and-forget.
  sendJuneBackupEmail(lead.id, stripeUrl).catch((err) => {
    console.error('[leads] sendJuneBackupEmail failed', err);
  });

  if (route === 'cs_handoff') {
    await sendConfirmationEmail(lead.id, partner.id);
    return NextResponse.json(
      { confirmationId: lead.confirmation_id, deferredToken: lead.deferred_token ?? null },
      { status: 200 },
    );
  }

  if (route === 'self_onboarding') {
    await sendSelfOnboardingEmail(lead.id, stripeUrl!);
    return NextResponse.json(
      { confirmationId: lead.confirmation_id, deferredToken: lead.deferred_token ?? null },
      { status: 200 },
    );
  }

  // route === 'in_shop_stripe': client handles the redirect immediately
  return NextResponse.json(
    {
      confirmationId: lead.confirmation_id,
      deferredToken: lead.deferred_token ?? null,
      redirectUrl: stripeUrl,
    },
    { status: 200 },
  );
}
