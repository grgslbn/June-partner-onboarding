import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shopId: string }> }
) {
  const { id: partnerId, shopId } = await params;
  const supabase = createServiceClient();

  // Verify the shop belongs to this partner before regenerating
  const { data: existing, error: fetchError } = await supabase
    .from('shops')
    .select('id, name, qr_token')
    .eq('id', shopId)
    .eq('partner_id', partnerId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Generate a new token via Postgres so it uses the same
  // encode(gen_random_bytes(9), 'base64') logic as the DB default.
  const { data: tokenRow, error: tokenError } = await supabase
    .rpc('generate_qr_token' as never);

  let newToken: string;

  if (tokenError || !tokenRow) {
    // Fallback: generate client-side using crypto (available in Node 18+)
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    newToken = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else {
    newToken = tokenRow as string;
  }

  const { data: updated, error: updateError } = await supabase
    .from('shops')
    .update({ qr_token: newToken })
    .eq('id', shopId)
    .eq('partner_id', partnerId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit log — real audit table is Briefing 21
  console.log(`[audit] regenerate-qr shop=${shopId} partner=${partnerId} old_token=${existing.qr_token} new_token=${newToken}`);

  return NextResponse.json(updated);
}
