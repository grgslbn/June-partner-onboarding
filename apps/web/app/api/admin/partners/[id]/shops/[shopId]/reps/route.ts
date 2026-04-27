import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = createServiceClient();

  const { data: reps, error } = await supabase
    .from('sales_reps')
    .select('id, shop_id, display_name, email, active, created_at')
    .eq('shop_id', shopId)
    .order('display_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Single aggregated leads_count query — no N+1
  const repIds = (reps ?? []).map((r) => r.id);
  const leadCounts: Record<string, number> = {};

  if (repIds.length > 0) {
    const { data: counts } = await supabase
      .from('leads')
      .select('sales_rep_id')
      .in('sales_rep_id', repIds);

    for (const row of counts ?? []) {
      if (row.sales_rep_id) {
        leadCounts[row.sales_rep_id] = (leadCounts[row.sales_rep_id] ?? 0) + 1;
      }
    }
  }

  const result = (reps ?? []).map((r) => ({
    ...r,
    leads_count: leadCounts[r.id] ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string }> }
) {
  const { shopId } = await params;
  const body = await request.json();

  const display_name = (body.display_name as string | undefined)?.trim();
  if (!display_name) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
  }
  if (display_name.length > 80) {
    return NextResponse.json({ error: 'display_name must be 80 chars or fewer' }, { status: 400 });
  }

  const email = (body.email as string | undefined)?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid email format' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('sales_reps')
    .insert({ shop_id: shopId, display_name, email, active: body.active ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
