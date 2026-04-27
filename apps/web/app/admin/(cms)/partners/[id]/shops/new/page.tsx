import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export const metadata = { title: 'New Shop — June CMS' };

export default async function NewShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId } = await params;

  const supabase = createServiceClient();
  const { data: partner } = await supabase
    .from('partners')
    .select('id, name')
    .eq('id', partnerId)
    .single();

  if (!partner) notFound();

  async function createShop(formData: FormData) {
    'use server';

    const name    = (formData.get('name') as string | null)?.trim();
    const address = (formData.get('address') as string | null)?.trim() || null;
    const city    = (formData.get('city') as string | null)?.trim() || null;
    const zip     = (formData.get('zip') as string | null)?.trim() || null;

    if (!name) return; // client validation handles this

    const svc = createServiceClient();

    const { data, error } = await svc
      .from('shops')
      .insert({ partner_id: partnerId, name, address, city, zip, active: true })
      .select('id')
      .single();

    if (error || !data) {
      // In a production app we'd surface this via useFormState; for now re-render
      throw new Error(error?.message ?? 'Failed to create shop');
    }

    redirect(`/admin/partners/${partnerId}/shops/${data.id}`);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partner.name}</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/shops`} className="hover:text-gray-700">Shops</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">New</span>
        </nav>

        <h1 className="text-xl font-semibold text-gray-900">New shop</h1>

        <form action={createShop} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Shop name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="IHPO Brussels Central"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="Rue Royale 1"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="Brussels"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700">ZIP</label>
              <input
                id="zip"
                name="zip"
                type="text"
                placeholder="1000"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            A QR code will be generated automatically. You can download it from the shop's edit page.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Create shop
            </button>
            <Link
              href={`/admin/partners/${partnerId}/shops`}
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
