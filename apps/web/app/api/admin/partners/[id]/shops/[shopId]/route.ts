import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';
import type { Database } from '@june/db';

type ShopUpdate = Database['public']['Tables']['shops']['Update'];

const ALLOWED_FIELDS = new Set(['name', 'address', 'city', 'zip', 'active', 'promo_code']);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string }> }
) {
  const { id: partnerId, shopId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .eq('partner_id', partnerId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string }> }
) {
  const { id: partnerId, shopId } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('shops')
    .update(patch as ShopUpdate)
    .eq('id', shopId)
    .eq('partner_id', partnerId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
