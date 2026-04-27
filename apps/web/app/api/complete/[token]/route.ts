import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidIBAN } from 'ibantools';
import { createServiceClient } from '@june/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const TOKEN_TTL_DAYS = 30;

const bodySchema = z.object({
  iban: z.string().min(1).max(34),
  sepaAccepted: z.literal(true),
  locale: z.enum(['nl', 'fr', 'en']),
  honeypot: z.string().nullable().optional(),
});

function validateBelgianIban(iban: string): boolean {
  const canonical = iban.replace(/\s/g, '').toUpperCase();
  if (!canonical.startsWith('BE')) return false;
  if (canonical.length !== 16) return false;
  return isValidIBAN(canonical);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Rate limit: 10 attempts per 5 min per IP
  const ip = clientIp(request);
  const ok = await rateLimit(`complete:ip:${ip}`, 10, 300);
  if (!ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const { iban, honeypot } = parsed.data;

  if (honeypot && honeypot.length > 0) {
    return NextResponse.json({ error: 'rejected' }, { status: 400 });
  }

  if (!validateBelgianIban(iban)) {
    return NextResponse.json({ error: 'invalid_iban' }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('id, confirmation_id, created_at, deferred_completed_at, partner_id')
    .eq('deferred_token', token)
    .maybeSingle();

  // Return 404 for both "not found" and "token belongs to wrong partner" — no leakage
  if (!lead) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (lead.deferred_completed_at) {
    return NextResponse.json(
      { error: 'already_completed', confirmationId: lead.confirmation_id },
      { status: 409 },
    );
  }

  const ageMs = Date.now() - new Date(lead.created_at!).getTime();
  if (ageMs > TOKEN_TTL_DAYS * 86_400_000) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  // Atomic update
  const canonicalIban = iban.replace(/\s/g, '').toUpperCase();
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      iban: canonicalIban,
      deferred_completed_at: new Date().toISOString(),
      status: 'complete',
    })
    .eq('id', lead.id)
    .is('deferred_completed_at', null); // guard against race condition

  if (updateError) {
    console.error('[complete] update failed', updateError);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  // Analytics event (non-critical)
  await supabase
    .from('events')
    .insert({ event_type: 'deferred_completed', lead_id: lead.id, partner_id: lead.partner_id })
    .then(({ error }) => {
      if (error) console.error('[complete] event insert failed', error);
    });

  return NextResponse.json({ success: true, confirmationId: lead.confirmation_id });
}
