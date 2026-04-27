import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { CopyToken } from '@/components/cms/CopyToken';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('partners').select('name').eq('id', id).single();
  return { title: data ? `${data.name} — Shops — June CMS` : 'Shops — June CMS' };
}

export default async function ShopsListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId } = await params;

  const supabase = createServiceClient();

  const [partnerRes, shopsRes] = await Promise.all([
    supabase.from('partners').select('id, name, slug').eq('id', partnerId).single(),
    supabase
      .from('shops')
      .select('id, name, address, city, zip, qr_token, active, created_at')
      .eq('partner_id', partnerId)
      .order('name'),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();

  const partner = partnerRes.data;
  const shops = shopsRes.data ?? [];

  // Rep counts
  const shopIds = shops.map((s) => s.id);
  const repCounts: Record<string, number> = {};
  if (shopIds.length > 0) {
    const { data: reps } = await supabase
      .from('sales_reps')
      .select('shop_id')
      .in('shop_id', shopIds)
      .eq('active', true);
    for (const r of reps ?? []) {
      repCounts[r.shop_id] = (repCounts[r.shop_id] ?? 0) + 1;
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partner.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Shops</span>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Shops</h1>
          <Link
            href={`/admin/partners/${partnerId}/shops/new`}
            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            + New shop
          </Link>
        </div>

        {shops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No shops yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Add your first shop to start generating QR codes.
            </p>
            <Link
              href={`/admin/partners/${partnerId}/shops/new`}
              className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              + New shop
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">QR Token</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Reps</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{shop.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {[shop.address, shop.city, shop.zip].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-6 py-4"><CopyToken token={shop.qr_token} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{repCounts[shop.id] ?? 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${shop.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {shop.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/partners/${partnerId}/shops/${shop.id}`}
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
