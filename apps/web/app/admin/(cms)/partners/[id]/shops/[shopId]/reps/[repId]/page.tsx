import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { RepEditShell } from '@/components/cms/RepEditShell';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; shopId: string; repId: string }>;
}) {
  const { repId } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('sales_reps').select('display_name').eq('id', repId).single();
  return { title: data ? `${data.display_name} — Rep — June CMS` : 'Rep — June CMS' };
}

export default async function RepEditPage({
  params,
}: {
  params: Promise<{ id: string; shopId: string; repId: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId, shopId, repId } = await params;

  const supabase = createServiceClient();

  const [partnerRes, shopRes, repRes, countRes] = await Promise.all([
    supabase.from('partners').select('id, name').eq('id', partnerId).single(),
    supabase.from('shops').select('id, name').eq('id', shopId).eq('partner_id', partnerId).single(),
    supabase.from('sales_reps').select('*').eq('id', repId).eq('shop_id', shopId).single(),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('sales_rep_id', repId),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();
  if (shopRes.error || !shopRes.data) notFound();
  if (repRes.error || !repRes.data) notFound();

  const partner = partnerRes.data;
  const shop = shopRes.data;
  const rep = repRes.data;
  const leadsCount = countRes.count ?? 0;

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
          <span className="text-gray-900 font-medium">{rep.display_name}</span>
        </nav>

        <h1 className="text-xl font-semibold text-gray-900">{rep.display_name}</h1>

        <RepEditShell
          rep={rep}
          leadsCount={leadsCount}
          partnerId={partnerId}
          shopId={shopId}
        />
      </div>
    </main>
  );
}
