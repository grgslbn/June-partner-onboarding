import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLeadsDaily, getFunnel, getTopReps, getStatTotals } from '@/lib/analytics';
import { createServiceClient } from '@june/db';

export async function GET(request: NextRequest) {
  const days = Math.min(
    90,
    Math.max(1, parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10) || 30)
  );

  const supabase = createServiceClient();

  const [leadsDaily, funnel, reps, stats, partnersRes] = await Promise.all([
    getLeadsDaily(null, days),
    getFunnel(null),
    getTopReps(null, 10),
    getStatTotals(null),
    supabase
      .from('partners')
      .select('id, name, primary_color')
      .order('name'),
  ]);

  // Per-partner daily lines for the multi-line chart
  const partners = partnersRes.data ?? [];
  const perPartnerLines = await Promise.all(
    partners.map(async (p) => ({
      partnerId:   p.id,
      partnerName: p.name,
      color:       p.primary_color,
      data:        await getLeadsDaily(p.id, days),
    }))
  );

  return NextResponse.json({
    stats,
    leadsDaily,
    funnel,
    reps,
    partners,
    perPartnerLines,
  });
}
