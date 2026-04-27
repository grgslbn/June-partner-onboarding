import type { RepRow } from '@/lib/analytics';

type Props = {
  reps: RepRow[];
  showPartnerCol?: boolean;
  partnerNames?: Record<string, string>; // partnerId → name
};

export function TopRepsTable({ reps, showPartnerCol = false, partnerNames = {} }: Props) {
  // Hide table for single-rep or no-rep partners
  if (reps.length <= 1) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Top reps — last 30 days</p>
      </div>
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">#</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Rep</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Shop</th>
            {showPartnerCol && (
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Partner</th>
            )}
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Leads</th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Completed</th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reps.map((rep, i) => {
            const rate = rep.leads_count > 0
              ? Math.round((rep.completed_count / rep.leads_count) * 100)
              : 0;
            return (
              <tr key={rep.sales_rep_id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">{rep.display_name}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{rep.shop_name}</td>
                {showPartnerCol && (
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {partnerNames[rep.partner_id] ?? rep.partner_id}
                  </td>
                )}
                <td className="px-5 py-3 text-sm text-right text-gray-700">{rep.leads_count}</td>
                <td className="px-5 py-3 text-sm text-right text-gray-700">{rep.completed_count}</td>
                <td className="px-5 py-3 text-sm text-right">
                  <span className={`font-medium ${rate >= 50 ? 'text-green-600' : rate >= 25 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {rate}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
