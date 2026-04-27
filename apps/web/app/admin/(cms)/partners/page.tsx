import Link from 'next/link';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export const metadata = { title: 'Partners — June CMS' };

const STATUS_STYLES: Record<string, string> = {
  draft:  'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  live:   'bg-green-100 text-green-800',
};

export default async function PartnersListPage() {
  await getCurrentProfile();

  const supabase = createServiceClient();
  const { data: partners, error } = await supabase
    .from('partners')
    .select('id, slug, name, logo_url, active, content_status, primary_color, updated_at')
    .order('name');

  if (error) throw new Error(error.message);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Partners</h1>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Partner</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Updated</th>
                <th className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {partners?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                      ) : (
                        <div
                          className="h-8 w-8 rounded"
                          style={{ backgroundColor: p.primary_color ?? '#E53935' }}
                        />
                      )}
                      <span className="text-sm font-medium text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[p.content_status ?? 'draft'] ?? STATUS_STYLES.draft}`}>
                      {p.content_status ?? 'draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/partners/${p.id}`}
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
      </div>
    </main>
  );
}
