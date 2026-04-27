import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@june/db';

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET ?? '';

function verify(rawBody: string, headers: Record<string, string>): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET not set — skipping signature verification');
    return true;
  }
  try {
    const msgId = headers['svix-id'] ?? '';
    const timestamp = headers['svix-timestamp'] ?? '';
    const sigHeader = headers['svix-signature'] ?? '';

    const secret = Buffer.from(WEBHOOK_SECRET.replace(/^whsec_/, ''), 'base64');
    const toSign = `${msgId}.${timestamp}.${rawBody}`;
    const expected = createHmac('sha256', secret).update(toSign).digest('base64');
    const expectedBuf = Buffer.from(expected);

    return sigHeader.split(' ').some((part) => {
      if (!part.startsWith('v1,')) return false;
      const candidate = Buffer.from(part.slice(3));
      if (candidate.length !== expectedBuf.length) return false;
      return timingSafeEqual(candidate, expectedBuf);
    });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const ok = verify(rawBody, {
    'svix-id': request.headers.get('svix-id') ?? '',
    'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
    'svix-signature': request.headers.get('svix-signature') ?? '',
  });
  if (!ok) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (event.type === 'email.opened') {
    const tags = (event.data?.tags ?? []) as { name: string; value: string }[];
    const leadId = tags.find((t) => t.name === 'leadId')?.value;
    if (leadId) {
      const supabase = createServiceClient();
      await supabase
        .from('leads')
        .update({ confirmation_email_opened_at: new Date().toISOString() })
        .eq('id', leadId)
        .is('confirmation_email_opened_at', null);
    }
  }

  return NextResponse.json({ received: true });
}
