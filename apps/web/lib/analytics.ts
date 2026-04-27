import { createServiceClient } from '@june/db';

export type DailyPoint = { day: string; leads_count: number; completed_count: number };
export type FunnelData = {
  landing_view: number;
  form_started: number;
  form_submitted: number;
  email_opened: number;
  has_events: boolean;
};
export type RepRow = {
  sales_rep_id: string;
  display_name: string;
  shop_name: string;
  partner_id: string;
  leads_count: number;
  completed_count: number;
};
export type StatTotals = {
  today: number;      todayDelta: number;
  thisWeek: number;   weekDelta: number;
  thisMonth: number;  monthDelta: number;
};

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Zero-filled daily lead counts. Server-side fill using date series. */
export async function getLeadsDaily(
  partnerId: string | null,
  days: number
): Promise<DailyPoint[]> {
  const supabase = createServiceClient();

  let q = supabase
    .from('partner_leads_daily')
    .select('day, leads_count, completed_count, partner_id');

  if (partnerId) q = q.eq('partner_id', partnerId);

  const { data } = await q;

  // Aggregate by day (cross-partner sums across all partner_ids)
  const byDay = new Map<string, DailyPoint>();
  for (const row of data ?? []) {
    const day = typeof row.day === 'string' ? row.day.slice(0, 10) : String(row.day ?? '').slice(0, 10);
    if (!day) continue;
    const existing = byDay.get(day);
    if (existing) {
      existing.leads_count     += row.leads_count ?? 0;
      existing.completed_count += row.completed_count ?? 0;
    } else {
      byDay.set(day, {
        day,
        leads_count:     row.leads_count ?? 0,
        completed_count: row.completed_count ?? 0,
      });
    }
  }

  // Fill every day in the range with zeroes where no data exists
  const result: DailyPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const key = daysAgoStr(i);
    result.push(byDay.get(key) ?? { day: key, leads_count: 0, completed_count: 0 });
  }
  return result;
}

export async function getFunnel(
  partnerId: string | null
): Promise<FunnelData> {
  const supabase = createServiceClient();

  let q = supabase
    .from('partner_funnel_30d')
    .select('event_type, event_count');

  if (partnerId) q = q.eq('partner_id', partnerId);

  const { data } = await q;
  const rows = data ?? [];

  const sum = (type: string) =>
    rows
      .filter((r) => r.event_type === type)
      .reduce((acc, r) => acc + (r.event_count ?? 0), 0);

  return {
    landing_view:   sum('landing_view'),
    form_started:   sum('form_started'),
    form_submitted: sum('form_submitted'),
    email_opened:   sum('email_opened'),
    has_events:     rows.length > 0,
  };
}

export async function getTopReps(
  partnerId: string | null,
  limit: number
): Promise<RepRow[]> {
  const supabase = createServiceClient();

  let q = supabase
    .from('partner_rep_performance_30d')
    .select('sales_rep_id, display_name, shop_name, partner_id, leads_count, completed_count')
    .gt('leads_count', 0)
    .order('leads_count', { ascending: false })
    .limit(limit);

  if (partnerId) q = q.eq('partner_id', partnerId);

  const { data } = await q;
  return (data as RepRow[]) ?? [];
}

export async function getStatTotals(partnerId: string | null): Promise<StatTotals> {
  const supabase = createServiceClient();

  let q = supabase
    .from('partner_leads_daily')
    .select('day, leads_count');

  if (partnerId) q = q.eq('partner_id', partnerId);

  const { data } = await q;
  const rows = data ?? [];

  const sum = (from: string, to: string) =>
    rows
      .filter((r) => {
        const day = typeof r.day === 'string' ? r.day.slice(0, 10) : String(r.day ?? '').slice(0, 10);
        return day >= from && day <= to;
      })
      .reduce((acc, r) => acc + (r.leads_count ?? 0), 0);

  const today    = sum(todayStr(), todayStr());
  const yest     = sum(daysAgoStr(1), daysAgoStr(1));
  const thisWeek = sum(daysAgoStr(6), todayStr());
  const prevWeek = sum(daysAgoStr(13), daysAgoStr(7));
  const thisMonth = sum(daysAgoStr(29), todayStr());
  const prevMonth = sum(daysAgoStr(59), daysAgoStr(30));

  return {
    today,       todayDelta:  today - yest,
    thisWeek,    weekDelta:   thisWeek - prevWeek,
    thisMonth,   monthDelta:  thisMonth - prevMonth,
  };
}
