import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';

type RepRow = { display_name: string; email?: string | null };

function validateRow(row: unknown): { valid: true; data: RepRow } | { valid: false; reason: string } {
  if (!row || typeof row !== 'object') return { valid: false, reason: 'invalid row' };
  const r = row as Record<string, unknown>;

  const display_name = typeof r.display_name === 'string' ? r.display_name.trim() : '';
  if (!display_name) return { valid: false, reason: 'missing display_name' };
  if (display_name.length > 80) return { valid: false, reason: 'display_name exceeds 80 chars' };

  const email = typeof r.email === 'string' ? r.email.trim() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, reason: `invalid email: ${email}` };
  }

  return { valid: true, data: { display_name, email: email || null } };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string }> }
) {
  const { shopId } = await params;
  const body = await request.json();

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
  }

  // Re-validate server-side (defense in depth — client already validated)
  const valid: RepRow[] = [];
  const errors: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < body.rows.length; i++) {
    const result = validateRow(body.rows[i]);
    if (result.valid) {
      valid.push(result.data);
    } else {
      errors.push({ index: i, reason: result.reason });
    }
  }

  if (valid.length === 0) {
    return NextResponse.json({ created: 0, errors }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('sales_reps')
    .insert(valid.map((r) => ({ shop_id: shopId, ...r, active: true })))
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: data?.length ?? 0, errors });
}
