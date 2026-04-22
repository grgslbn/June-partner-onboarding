import { NextResponse } from 'next/server';

// Stub — real implementation lands in Briefing 06 (public lead + event endpoints).
// Accepts any well-formed event payload and returns 202 so the client doesn't retry.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.info('[events stub] received:', body?.event_type ?? 'unknown');
  } catch {
    // ignore malformed bodies — stub is permissive
  }
  return new NextResponse(null, { status: 202 });
}
