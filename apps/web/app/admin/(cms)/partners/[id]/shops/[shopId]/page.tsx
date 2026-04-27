import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { ShopEditShell } from '@/components/cms/ShopEditShell';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; shopId: string }>;
}) {
  const { shopId } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('shops').select('name').eq('id', shopId).single();
  return { title: data ? `${data.name} — Shop — June CMS` : 'Shop — June CMS' };
}

export default async function ShopEditPage({
  params,
}: {
  params: Promise<{ id: string; shopId: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId, shopId } = await params;

  const supabase = createServiceClient();

  const [partnerRes, shopRes] = await Promise.all([
    supabase
      .from('partners')
      .select('id, name, slug, logo_url, primary_color, default_locale')
      .eq('id', partnerId)
      .single(),
    supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .eq('partner_id', partnerId)
      .single(),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();
  if (shopRes.error || !shopRes.data) notFound();

  const partner = partnerRes.data;
  const shop = shopRes.data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partner.name}</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/shops`} className="hover:text-gray-700">Shops</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{shop.name}</span>
        </nav>

        <h1 className="text-xl font-semibold text-gray-900">{shop.name}</h1>

        <ShopEditShell
          shop={shop}
          partner={partner}
          siteUrl={siteUrl}
        />
      </div>
    </main>
  );
}
