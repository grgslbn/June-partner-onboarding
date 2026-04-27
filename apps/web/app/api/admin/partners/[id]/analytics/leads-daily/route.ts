import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLeadsDaily } from '@/lib/analytics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: partnerId } = await params;
  const days = Math.min(
    90,
    Math.max(1, parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10) || 30)
  );

  const data = await getLeadsDaily(partnerId, days);
  return NextResponse.json(data);
}
