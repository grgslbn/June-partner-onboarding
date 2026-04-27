import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { DiscountEditShell } from '@/components/cms/DiscountEditShell';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; discountId: string }>;
}) {
  const { discountId } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('discount_codes')
    .select('code')
    .eq('id', discountId)
    .single();
  return { title: data ? `${data.code} — Discount codes — June CMS` : 'Edit code — June CMS' };
}

export default async function DiscountEditPage({
  params,
}: {
  params: Promise<{ id: string; discountId: string }>;
}) {
  await getCurrentProfile();
  const { id: partnerId, discountId } = await params;

  const supabase = createServiceClient();

  const [partnerRes, codeRes] = await Promise.all([
    supabase.from('partners').select('id, name').eq('id', partnerId).single(),
    supabase.from('discount_codes').select('*').eq('id', discountId).eq('partner_id', partnerId).single(),
  ]);

  if (partnerRes.error || !partnerRes.data) notFound();
  if (codeRes.error || !codeRes.data) notFound();

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/partners" className="hover:text-gray-700">Partners</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}`} className="hover:text-gray-700">{partnerRes.data.name}</Link>
          <span>/</span>
          <Link href={`/admin/partners/${partnerId}/discounts`} className="hover:text-gray-700">Discount codes</Link>
          <span>/</span>
          <span className="font-mono text-gray-900 font-medium">{codeRes.data.code}</span>
        </nav>

        <DiscountEditShell partnerId={partnerId} discount={codeRes.data} />
      </div>
    </main>
  );
}
