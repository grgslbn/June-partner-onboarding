import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';
import type { Database } from '@june/db';

type PartnerUpdate = Database['public']['Tables']['partners']['Update'];

const ALLOWED_FIELDS = new Set([
  'name', 'slug', 'active', 'content_status',
  'primary_color', 'accent_color', 'tertiary_color',
  'success_color', 'danger_color', 'muted_text_color',
  'logo_url',
  'slogan_i18n', 'trust_badge_i18n', 'privacy_url_i18n', 'tc_url_i18n',
  'flow_preset', 'iban_behavior', 'locales_enabled', 'default_locale',
  'product_sold', 'savings_sim_enabled',
  'digest_partner_email',
  'confirmation_email_subject_i18n', 'confirmation_email_body_i18n',
  'submission_route', 'stripe_url_template', 'stripe_promo_code', 'june_backup_email',
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Strip any keys not in the allowlist — prevents accidental id/created_at overwrite.
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('partners')
    .update(patch as PartnerUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
