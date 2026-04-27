'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DailyPoint } from '@/lib/analytics';

type SingleLineProps = {
  data: DailyPoint[];
  primaryColor: string;
  mode: 'single';
};

type MultiLineProps = {
  lines: Array<{ partnerId: string; partnerName: string; color: string; data: DailyPoint[] }>;
  mode: 'multi';
};

type Props = SingleLineProps | MultiLineProps;

function formatDay(day: string) {
  const d = new Date(day);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function LeadsChart(props: Props) {
  if (props.mode === 'single') {
    const { data, primaryColor } = props;
    const allZero = data.every((d) => d.leads_count === 0);
    if (allZero) return null;

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-gray-900">Leads over time</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="leads_count"
              name="Total leads"
              stroke={primaryColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="completed_count"
              name="Completed"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Multi-partner mode
  const { lines } = props;
  if (lines.length === 0) return null;

  // Merge all partner data onto a shared day axis
  const allDays = lines[0]?.data.map((d) => d.day) ?? [];
  const merged = allDays.map((day, i) => {
    const point: Record<string, unknown> = { day };
    for (const line of lines) {
      point[line.partnerId] = line.data[i]?.leads_count ?? 0;
    }
    return point;
  });

  const allZero = merged.every((p) =>
    lines.every((l) => (p[l.partnerId] as number) === 0)
  );
  if (allZero) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-gray-900">Leads over time — all partners</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={merged} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="day"
            tickFormatter={formatDay}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            labelFormatter={(l) => `Date: ${l}`}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {lines.map((line) => (
            <Line
              key={line.partnerId}
              type="monotone"
              dataKey={line.partnerId}
              name={line.partnerName}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LeadsChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
      <div className="h-[300px] rounded bg-gray-100" />
    </div>
  );
}
