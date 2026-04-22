import { NextResponse } from 'next/server';

// Stub — real implementation lands in Briefing 06 (public lead submit endpoint
// with honeypot + timing + RLS service-role insert + Resend hand-off).
// For now returns a fake confirmation_id so the form can route to /done.
export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  return NextResponse.json({ confirmation_id: 'JUN-STUB01' }, { status: 200 });
}
