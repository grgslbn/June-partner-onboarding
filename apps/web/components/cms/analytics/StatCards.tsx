import type { StatTotals } from '@/lib/analytics';

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-gray-400">no change</span>;
  const positive = value > 0;
  return (
    <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? '+' : ''}{value}
    </span>
  );
}

function Card({ label, value, delta, sub }: { label: string; value: number; delta: number; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900">{value}</p>
      <div className="flex items-center gap-1.5">
        <Delta value={delta} />
        <span className="text-xs text-gray-400">{sub}</span>
      </div>
    </div>
  );
}

export function StatCards({ stats }: { stats: StatTotals }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card label="Today"      value={stats.today}     delta={stats.todayDelta}  sub="vs yesterday" />
      <Card label="This week"  value={stats.thisWeek}  delta={stats.weekDelta}   sub="vs prev 7 days" />
      <Card label="This month" value={stats.thisMonth} delta={stats.monthDelta}  sub="vs prev 30 days" />
    </div>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 animate-pulse">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-8 w-12 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
