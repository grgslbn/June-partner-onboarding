import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTopReps } from '@/lib/analytics';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: partnerId } = await params;
  const data = await getTopReps(partnerId, 5);
  return NextResponse.json(data);
}
