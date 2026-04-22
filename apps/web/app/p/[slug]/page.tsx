import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@june/db';

export default async function PartnerLandingRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createServiceClient();
  const { data: partner } = await supabase
    .from('partners')
    .select('default_locale')
    .eq('slug', slug)
    .single();

  if (!partner) notFound();
  redirect(`/${partner.default_locale}/p/${slug}`);
}
