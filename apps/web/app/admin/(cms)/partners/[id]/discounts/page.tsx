import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('partners').select('name').eq('id', id).single();
  return { title: data ? `${data.name} — Discount codes — June CMS` : 'Discount codes — June CMS' };
}

function formatValidity(from: string | null, to: string | null): string {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!from && !to) return 'No expiry';
  if (!to) return `From ${fmt(from!)}`;
  if (!from) return `Until ${fmt(to)}`;
  return `${fmt(from)} – ${fmt(to)}`;
}

function formatDiscount(type: string, amount: number): string {
  if (type === 'percent') return `−${amount}%`;
  return `−€${amount}`;
}

export default async function DiscountsListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId } = await params;

  const supabase = createServiceClient();

  const [partnerRes, codesRes] = await Promise.all([
    supabase.from('partners').select('id, name').eq('id', partnerId).single(),
    supabase
      .from('discount_codes')
      .select('*')
      .eq('partner_id', partnerId)
      .order('active', { ascending: false })
      .order('valid_to', { ascending: true, nullsFirst: false }),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();

  const partner = partnerRes.data;
  const codes = codesRes.data ?? [];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partner.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Discount codes</span>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Discount codes</h1>
          <Link
            href={`/admin/partners/${partnerId}/discounts/new`}
            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            + New code
          </Link>
        </div>

        {codes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No discount codes yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Create one to offer customers an incentive at signup.
            </p>
            <Link
              href={`/admin/partners/${partnerId}/discounts/new`}
              className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              + New code
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Validity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Uses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-gray-900 uppercase">{c.code}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDiscount(c.type, c.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatValidity(c.valid_from, c.valid_to)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {c.used_count} / {c.max_uses ?? '∞'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/partners/${partnerId}/discounts/${c.id}`}
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
