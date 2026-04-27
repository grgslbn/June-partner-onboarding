import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { PartnerEditShell } from '@/components/cms/PartnerEditShell';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from('partners').select('name').eq('id', id).single();
  return { title: data ? `${data.name} — June CMS` : 'Partner — June CMS' };
}

export default async function PartnerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentProfile();
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: partner, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !partner) notFound();

  return <PartnerEditShell partner={partner} />;
}
