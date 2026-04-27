import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';
import type { Database } from '@june/db';

type DiscountUpdate = Database['public']['Tables']['discount_codes']['Update'];

const ALLOWED_FIELDS = new Set([
  'type', 'amount', 'valid_from', 'valid_to', 'max_uses', 'active',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; discountId: string }> },
) {
  const { id: partnerId, discountId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('discount_codes')
    .update(patch as DiscountUpdate)
    .eq('id', discountId)
    .eq('partner_id', partnerId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'update_failed' }, { status: 500 });
  }

  return NextResponse.json(data);
}
