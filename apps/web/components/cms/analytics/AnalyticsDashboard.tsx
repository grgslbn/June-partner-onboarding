'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { StatCards, StatCardsSkeleton } from './StatCards';
import { LeadsChart, LeadsChartSkeleton } from './LeadsChart';
import { FunnelChart, FunnelChartSkeleton } from './FunnelChart';
import { TopRepsTable } from './TopRepsTable';
import type { StatTotals, DailyPoint, FunnelData, RepRow } from '@/lib/analytics';

type SinglePartnerData = {
  stats: StatTotals;
  leadsDaily: DailyPoint[];
  funnel: FunnelData;
  reps: RepRow[];
};

type CrossPartnerData = SinglePartnerData & {
  partners: Array<{ id: string; name: string; primary_color: string }>;
  perPartnerLines: Array<{ partnerId: string; partnerName: string; color: string; data: DailyPoint[] }>;
};

type Props = {
  partnerId?: string;       // undefined = cross-partner view
  partnerName: string;
  primaryColor?: string;
  mode: 'single' | 'multi';
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RANGE_OPTIONS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function useRelativeTime(date: Date | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!date) return;
    const tick = () => {
      const secs = Math.floor((Date.now() - date.getTime()) / 1000);
      if (secs < 60)        setLabel(`${secs}s ago`);
      else if (secs < 3600) setLabel(`${Math.floor(secs / 60)}m ago`);
      else                  setLabel(`${Math.floor(secs / 3600)}h ago`);
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [date]);

  return label;
}

export function AnalyticsDashboard({ partnerId, partnerName, primaryColor = '#E53935', mode }: Props) {
  const [days, setDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const updatedAgo = useRelativeTime(lastUpdated);

  const statsUrl  = partnerId ? `/api/admin/partners/${partnerId}/analytics/leads-daily?days=90` : null;
  const chartUrl  = partnerId ? `/api/admin/partners/${partnerId}/analytics/leads-daily?days=${days}` : `/api/admin/analytics?days=${days}`;
  const funnelUrl = partnerId ? `/api/admin/partners/${partnerId}/analytics/funnel` : null;
  const repsUrl   = partnerId ? `/api/admin/partners/${partnerId}/analytics/reps` : null;
  const crossUrl  = mode === 'multi' ? `/api/admin/analytics?days=${days}` : null;

  const { data: statsData,  isLoading: statsLoading  } = useSWR<DailyPoint[]>(statsUrl,  fetcher, { refreshInterval: 60_000 });
  const { data: chartData,  isLoading: chartLoading  } = useSWR<DailyPoint[] | CrossPartnerData>(chartUrl, fetcher, {
    refreshInterval: 60_000,
    onSuccess: () => setLastUpdated(new Date()),
  });
  const { data: funnelData, isLoading: funnelLoading } = useSWR<FunnelData>(funnelUrl, fetcher, { refreshInterval: 60_000 });
  const { data: repsData,   isLoading: repsLoading   } = useSWR<RepRow[]>(repsUrl,   fetcher, { refreshInterval: 60_000 });
  const { data: crossData,  isLoading: crossLoading  } = useSWR<CrossPartnerData>(crossUrl, fetcher, {
    refreshInterval: 60_000,
    onSuccess: () => setLastUpdated(new Date()),
  });

  // Derive stat totals client-side from the 90-day daily data
  function computeStats(daily: DailyPoint[] | undefined): StatTotals | null {
    if (!daily) return null;
    const byDay = new Map(daily.map((d) => [d.day, d.leads_count]));
    const todayKey = new Date().toISOString().slice(0, 10);
    const dStr = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    const sum = (from: string, to: string) => [...byDay.entries()].filter(([k]) => k >= from && k <= to).reduce((a, [, v]) => a + v, 0);
    return {
      today:     sum(todayKey, todayKey),  todayDelta:  sum(todayKey, todayKey) - sum(dStr(1), dStr(1)),
      thisWeek:  sum(dStr(6), todayKey),   weekDelta:   sum(dStr(6), todayKey) - sum(dStr(13), dStr(7)),
      thisMonth: sum(dStr(29), todayKey),  monthDelta:  sum(dStr(29), todayKey) - sum(dStr(59), dStr(30)),
    };
  }

  const stats = mode === 'single'
    ? computeStats(statsData)
    : crossData?.stats ?? null;

  const isSingleChartData = (d: unknown): d is DailyPoint[] => Array.isArray(d);

  const allZeroLeads = mode === 'single'
    ? (isSingleChartData(chartData) && chartData.every((d) => d.leads_count === 0))
    : (crossData ? crossData.leadsDaily.every((d) => d.leads_count === 0) : true);

  const isLoading = mode === 'single'
    ? (statsLoading || chartLoading || funnelLoading || repsLoading)
    : crossLoading;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{partnerName}</h1>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {updatedAgo}</span>
          )}
          {/* Date range toggle — affects chart + reps only */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === opt.days
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards — fixed (not range-dependent) */}
      {isLoading || !stats ? <StatCardsSkeleton /> : <StatCards stats={stats} />}

      {/* Empty state */}
      {!isLoading && allZeroLeads && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
          <p className="text-sm font-medium text-gray-500">
            Once your first customer signs up, your numbers will appear here.
          </p>
        </div>
      )}

      {/* Leads chart */}
      {isLoading ? (
        <LeadsChartSkeleton />
      ) : mode === 'single' && isSingleChartData(chartData) ? (
        <LeadsChart mode="single" data={chartData} primaryColor={primaryColor} />
      ) : mode === 'multi' && crossData?.perPartnerLines ? (
        <LeadsChart mode="multi" lines={crossData.perPartnerLines} />
      ) : null}

      {/* Funnel */}
      {mode === 'single' && (
        funnelLoading ? <FunnelChartSkeleton /> : funnelData ? <FunnelChart funnel={funnelData} /> : null
      )}
      {mode === 'multi' && crossData?.funnel && (
        <FunnelChart funnel={crossData.funnel} />
      )}

      {/* Top reps */}
      {mode === 'single' && !repsLoading && repsData && repsData.length > 1 && (
        <TopRepsTable reps={repsData} />
      )}
      {mode === 'multi' && crossData?.reps && crossData.reps.length > 1 && (
        <TopRepsTable
          reps={crossData.reps}
          showPartnerCol
          partnerNames={Object.fromEntries(
            (crossData.partners ?? []).map((p) => [p.id, p.name])
          )}
        />
      )}
    </div>
  );
}
