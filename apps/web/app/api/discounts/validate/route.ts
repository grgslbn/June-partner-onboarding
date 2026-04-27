import { NextResponse } from 'next/server';
import { createServiceClient } from '@june/db';
import { getCachedPartnerBySlug } from '@/lib/partner-cache';
import { clientIp, rateLimit } from '@/lib/rate-limit';

function formatDisplay(type: string, amount: number): string {
  return type === 'percent' ? `−${amount}%` : `−€${amount}`;
}

export async function POST(request: Request) {
  // Rate limit first — before any DB lookup to prevent enumeration
  const ip = clientIp(request);
  const allowed = await rateLimit(`discount:validate:${ip}`, 30, 300);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: { code?: unknown; partnerSlug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : null;
  const partnerSlug = typeof body.partnerSlug === 'string' ? body.partnerSlug.trim() : null;

  if (!code || !partnerSlug) {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }

  const partner = await getCachedPartnerBySlug(partnerSlug);
  if (!partner || !partner.active) {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }

  const supabase = createServiceClient();
  const { data: dc } = await supabase
    .from('discount_codes')
    .select('id, type, amount, active, valid_from, valid_to, max_uses, used_count')
    .eq('partner_id', partner.id)
    .eq('code', code)
    .maybeSingle();

  // "not found" and "wrong partner" both return 'invalid' — no info leakage
  if (!dc || !dc.active) {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }

  const now = new Date();
  if (dc.valid_from && new Date(dc.valid_from) > now) {
    return NextResponse.json({ valid: false, reason: 'expired' });
  }
  if (dc.valid_to && new Date(dc.valid_to) < now) {
    return NextResponse.json({ valid: false, reason: 'expired' });
  }

  if (dc.max_uses != null && dc.used_count >= dc.max_uses) {
    return NextResponse.json({ valid: false, reason: 'exhausted' });
  }

  return NextResponse.json({
    valid: true,
    type: dc.type,
    amount: dc.amount,
    formattedDisplay: formatDisplay(dc.type, dc.amount),
  });
}
