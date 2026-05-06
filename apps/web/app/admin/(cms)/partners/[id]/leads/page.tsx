import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

type Filter = 'today' | '7d' | '30d' | 'all';

const FILTER_LABELS: Record<Filter, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

const FILTERS: Filter[] = ['today', '7d', '30d', 'all'];

function getDateFrom(filter: Filter): string | null {
  if (filter === 'all') return null;
  const now = new Date();
  if (filter === 'today') {
    // Start of today in Brussels time — treat as UTC midnight of the Brussels date (±2h max)
    const brDate = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
    return `${brDate}T00:00:00.000Z`;
  }
  const days = filter === '7d' ? 7 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return from.toISOString();
}

function formatDate(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('fr-BE', {
    timeZone: 'Europe/Brussels',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? 'bg-gray-100 text-gray-500'
      }`}
    >
      {status}
    </span>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('partners').select('name').eq('id', id).single();
  return { title: data ? `${data.name} — Leads — June CMS` : 'Leads — June CMS' };
}

export default async function PartnerLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; limit?: string }>;
}) {
  const { profile } = await getCurrentProfile();
  const { id: partnerId } = await params;
  const { filter: rawFilter, limit: rawLimit } = await searchParams;

  if (profile.role === 'partner_admin' && profile.partner_id !== partnerId) {
    notFound();
  }

  const filter: Filter = FILTERS.includes(rawFilter as Filter) ? (rawFilter as Filter) : '30d';
  const limit = Math.min(Math.max(parseInt(rawLimit ?? '50', 10) || 50, 50), 500);

  const supabase = createServiceClient();

  const [partnerRes, leadsRes] = await Promise.all([
    supabase.from('partners').select('id, name').eq('id', partnerId).single(),
    (() => {
      const from = getDateFrom(filter);
      const q = supabase
        .from('leads')
        .select(
          'id, first_name, last_name, email, phone, mobile, promo_code, status, created_at, shops(name), sales_reps(display_name)'
        )
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return from ? q.gte('created_at', from) : q;
    })(),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();

  const partner = partnerRes.data;
  const leads = leadsRes.data ?? [];
  const hasMore = leads.length === limit;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/partners" className="hover:text-gray-700">
            Partners
          </Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">
            {partner.name}
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Leads</span>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            {FILTERS.map((f, i) => (
              <Link
                key={f}
                href={`/admin/partners/${partnerId}/leads?filter=${f}`}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  i > 0 ? 'border-l border-gray-200' : ''
                } ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {FILTER_LABELS[f]}
              </Link>
            ))}
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No leads yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Once customers start signing up, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Date', 'Name', 'Email', 'Phone', 'Shop', 'Rep', 'Promo', 'Status'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.map((lead) => {
                      const shop = lead.shops as { name: string } | null;
                      const rep = lead.sales_reps as { display_name: string } | null;
                      return (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{lead.email}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                            {lead.phone ?? lead.mobile ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {shop?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {rep?.display_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-500">
                            {lead.promo_code ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={lead.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <Link
                  href={`/admin/partners/${partnerId}/leads?filter=${filter}&limit=${limit + 50}`}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Load more
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
