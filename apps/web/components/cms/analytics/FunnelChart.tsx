'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, LabelList,
} from 'recharts';
import type { FunnelData } from '@/lib/analytics';

const STEPS = [
  { key: 'landing_view',   label: 'Landing view' },
  { key: 'form_started',   label: 'Form started' },
  { key: 'form_submitted', label: 'Form submitted' },
  { key: 'email_opened',   label: 'Email opened' },
] as const;

const BAR_COLOR = '#6366f1'; // indigo-500, neutral across all partner brand colors

export function FunnelChart({ funnel }: { funnel: FunnelData }) {
  if (!funnel.has_events) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 mb-2">Conversion funnel</p>
        <p className="text-sm text-gray-400">
          Funnel data coming soon — events tracking starts after the first lead.
        </p>
      </div>
    );
  }

  const top = funnel.landing_view || 1; // avoid division by zero
  const data = STEPS.map(({ key, label }) => ({
    label,
    value: funnel[key],
    pct:   Math.round((funnel[key] / top) * 100),
  }));

  // Drop-off from landing → form_started is the headline metric
  const dropOff = funnel.landing_view > 0
    ? Math.round(((funnel.landing_view - funnel.form_started) / funnel.landing_view) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Conversion funnel</p>
        {funnel.landing_view > 0 && (
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{dropOff}%</span> drop-off at form entry
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, bottom: 0, left: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
            width={96}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(value, _name, props) =>
              [`${value as number} (${(props.payload as { pct?: number } | undefined)?.pct ?? 0}%)`, 'Events']
            }
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_COLOR} fillOpacity={1 - i * 0.18} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v: unknown) => `${v as number}%`}
              style={{ fontSize: 11, fill: '#6b7280' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-4 w-36 rounded bg-gray-200 mb-4" />
      <div className="h-[200px] rounded bg-gray-100" />
    </div>
  );
}
