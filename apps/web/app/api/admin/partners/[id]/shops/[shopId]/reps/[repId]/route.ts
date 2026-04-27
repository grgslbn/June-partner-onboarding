import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';
import type { Database } from '@june/db';

type RepUpdate = Database['public']['Tables']['sales_reps']['Update'];

const ALLOWED_FIELDS = new Set(['display_name', 'email', 'active']);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string; repId: string }> }
) {
  const { shopId, repId } = await params;
  const supabase = createServiceClient();

  const [repRes, countRes] = await Promise.all([
    supabase
      .from('sales_reps')
      .select('*')
      .eq('id', repId)
      .eq('shop_id', shopId)
      .single(),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('sales_rep_id', repId),
  ]);

  if (repRes.error || !repRes.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...repRes.data,
    leads_count: countRes.count ?? 0,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string; repId: string }> }
) {
  const { shopId, repId } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  // Coerce empty email string to null
  if ('email' in patch && patch.email === '') patch.email = null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('sales_reps')
    .update(patch as RepUpdate)
    .eq('id', repId)
    .eq('shop_id', shopId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
