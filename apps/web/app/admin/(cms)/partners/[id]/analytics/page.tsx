import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { AnalyticsDashboard } from '@/components/cms/analytics/AnalyticsDashboard';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('partners').select('name').eq('id', id).single();
  return { title: data ? `${data.name} Analytics — June CMS` : 'Analytics — June CMS' };
}

export default async function PartnerAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentProfile();
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: partner, error } = await supabase
    .from('partners')
    .select('id, name, primary_color')
    .eq('id', id)
    .single();

  if (error || !partner) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/admin/partners/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← {partner.name}
          </Link>
        </div>
        <AnalyticsDashboard
          partnerId={partner.id}
          partnerName={partner.name}
          primaryColor={partner.primary_color ?? undefined}
          mode="single"
        />
      </div>
    </div>
  );
}
