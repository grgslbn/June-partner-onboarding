import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { BulkRepImportModal } from '@/components/cms/BulkRepImportModal';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; shopId: string }>;
}) {
  const { shopId } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('shops').select('name').eq('id', shopId).single();
  return { title: data ? `${data.name} — Reps — June CMS` : 'Reps — June CMS' };
}

export default async function RepsListPage({
  params,
}: {
  params: Promise<{ id: string; shopId: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId, shopId } = await params;

  const supabase = createServiceClient();

  const [partnerRes, shopRes, repsRes] = await Promise.all([
    supabase.from('partners').select('id, name').eq('id', partnerId).single(),
    supabase.from('shops').select('id, name').eq('id', shopId).eq('partner_id', partnerId).single(),
    supabase
      .from('sales_reps')
      .select('id, display_name, email, active, created_at')
      .eq('shop_id', shopId)
      .order('display_name'),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();
  if (shopRes.error || !shopRes.data) notFound();

  const partner = partnerRes.data;
  const shop = shopRes.data;
  const reps = repsRes.data ?? [];

  // Single aggregated leads_count query
  const repIds = reps.map((r) => r.id);
  const leadCounts: Record<string, number> = {};
  if (repIds.length > 0) {
    const { data: leadRows } = await supabase
      .from('leads')
      .select('sales_rep_id')
      .in('sales_rep_id', repIds);
    for (const row of leadRows ?? []) {
      if (row.sales_rep_id) {
        leadCounts[row.sales_rep_id] = (leadCounts[row.sales_rep_id] ?? 0) + 1;
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partner.name}</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/shops`} className="hover:text-gray-700">Shops</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/shops/${shopId}`} className="hover:text-gray-700">{shop.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Reps</span>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Sales reps</h1>
          <div className="flex items-center gap-3">
            <BulkRepImportModal partnerId={partnerId} shopId={shopId} />
            <Link
              href={`/admin/partners/${partnerId}/shops/${shopId}/reps/new`}
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              + New rep
            </Link>
          </div>
        </div>

        {reps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No sales reps yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Add reps so customers can attribute their signup to the right person.
            </p>
            <Link
              href={`/admin/partners/${partnerId}/shops/${shopId}/reps/new`}
              className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              + New rep
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Leads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Added</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reps.map((rep) => (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{rep.display_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{rep.email ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rep.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {rep.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{leadCounts[rep.id] ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/partners/${partnerId}/shops/${shopId}/reps/${rep.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
