import { NextResponse } from 'next/server';
import { createServiceClient, type Json } from '@june/db';
import { eventPingSchema } from '@june/shared';
import { getCachedPartnerBySlug } from '@/lib/partner-cache';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// Event pings are fire-and-forget from the client. Always return 204 so a
// failure here (rate limit, validation, partner lookup, DB insert) never
// blocks the page flow. Errors are logged, not surfaced.

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = eventPingSchema.safeParse(await request.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!parsed.success) {
    return new NextResponse(null, { status: 204 });
  }
  const body = parsed.data;

  const ip = clientIp(request);
  const ok = await rateLimit(`events:ip:${ip}`, 120, 60);
  if (!ok) return new NextResponse(null, { status: 204 });

  const partner = await getCachedPartnerBySlug(body.partnerSlug);
  if (!partner || !partner.active) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = createServiceClient();

  let shopId: string | null = null;
  if (body.shopToken) {
    const { data: shopRow } = await supabase
      .from('shops')
      .select('id, partner_id, active')
      .eq('qr_token', body.shopToken)
      .maybeSingle();
    if (shopRow && shopRow.partner_id === partner.id && shopRow.active) {
      shopId = shopRow.id;
    }
  }

  const { error } = await supabase.from('events').insert({
    event_type: body.eventType,
    partner_id: partner.id,
    shop_id: shopId,
    lead_id: body.leadId ?? null,
    session_id: body.sessionId ?? null,
    meta: (body.meta ?? null) as Json,
  });
  if (error) {
    console.error('[events] insert failed', error);
  }

  return new NextResponse(null, { status: 204 });
}
