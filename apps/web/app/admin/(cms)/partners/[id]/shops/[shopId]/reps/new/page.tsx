import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export const metadata = { title: 'New Rep — June CMS' };

export default async function NewRepPage({
  params,
}: {
  params: Promise<{ id: string; shopId: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId, shopId } = await params;

  const supabase = createServiceClient();
  const [partnerRes, shopRes] = await Promise.all([
    supabase.from('partners').select('id, name').eq('id', partnerId).single(),
    supabase.from('shops').select('id, name').eq('id', shopId).eq('partner_id', partnerId).single(),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();
  if (shopRes.error || !shopRes.data) notFound();

  const partner = partnerRes.data;
  const shop = shopRes.data;

  async function createRep(formData: FormData) {
    'use server';

    const display_name = (formData.get('display_name') as string | null)?.trim();
    const email = (formData.get('email') as string | null)?.trim() || null;

    if (!display_name) return;

    const svc = createServiceClient();
    await svc
      .from('sales_reps')
      .insert({ shop_id: shopId, display_name, email, active: true });

    redirect(`/admin/partners/${partnerId}/shops/${shopId}/reps`);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partner.name}</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/shops`} className="hover:text-gray-700">Shops</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/shops/${shopId}`} className="hover:text-gray-700">{shop.name}</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/shops/${shopId}/reps`} className="hover:text-gray-700">Reps</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">New</span>
        </nav>

        <h1 className="text-xl font-semibold text-gray-900">New sales rep</h1>

        <form action={createRep} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
              Display name <span className="text-red-500">*</span>
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              maxLength={80}
              autoFocus
              placeholder="Marie Dupont"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">Shown to customers in the rep picker. Max 80 characters.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="marie@ihpo.example"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">Not shown to customers. Used for internal reference only.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Add rep
            </button>
            <Link
              href={`/admin/partners/${partnerId}/shops/${shopId}/reps`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
