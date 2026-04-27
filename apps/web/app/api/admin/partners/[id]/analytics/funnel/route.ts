import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getFunnel } from '@/lib/analytics';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: partnerId } = await params;
  const data = await getFunnel(partnerId);
  return NextResponse.json(data);
}
