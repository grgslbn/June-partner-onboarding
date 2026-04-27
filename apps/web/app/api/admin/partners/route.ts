import { NextResponse } from 'next/server';
import { createServiceClient } from '@june/db';

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('partners')
    .select('id, slug, name, logo_url, active, content_status, primary_color, accent_color, updated_at')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
