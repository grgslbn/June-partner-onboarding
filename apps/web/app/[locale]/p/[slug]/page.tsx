import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { contrastForeground, getPartnerCopy, type Locale } from '@june/shared';
import LandingScreen from '@/components/public/LandingScreen';

export default async function PartnerLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ shop?: string }>;
}) {
  const { locale, slug } = await params;
  const { shop: shopToken } = await searchParams;

  const supabase = createServiceClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('id, slug, name, logo_url, primary_color, accent_color, default_locale, locales_enabled, active, tc_url_i18n, slogan_i18n, trust_badge_i18n, privacy_url_i18n')
    .eq('slug', slug)
    .maybeSingle();

  if (!partner || !partner.active) notFound();
  if (!partner.locales_enabled.includes(locale)) notFound();

  let shop: { id: string; name: string; qr_token: string } | null = null;
  let reps: Array<{ id: string; display_name: string }> = [];

  if (shopToken) {
    const { data: shopRow } = await supabase
      .from('shops')
      .select('id, name, qr_token, partner_id, active')
      .eq('qr_token', shopToken)
      .maybeSingle();

    if (!shopRow || shopRow.partner_id !== partner.id || !shopRow.active) {
      notFound();
    }

    shop = { id: shopRow.id, name: shopRow.name, qr_token: shopRow.qr_token };

    const { data: repRows } = await supabase
      .from('sales_reps')
      .select('id, display_name, active')
      .eq('shop_id', shop.id)
      .eq('active', true)
      .order('display_name');

    reps = (repRows ?? []).map((r) => ({ id: r.id, display_name: r.display_name }));
  }

  const tcUrl = getPartnerCopy(partner, locale as Locale, 'tc_url_i18n') || null;
  const foreground = contrastForeground(partner.primary_color);

  return (
    <LandingScreen
      partner={{
        id: partner.id,
        name: partner.name,
        logoUrl: partner.logo_url,
        primaryColor: partner.primary_color,
        foregroundColor: foreground,
        tcUrl,
      }}
      shop={shop}
      reps={reps}
      locale={locale as Locale}
      slug={slug}
    />
  );
}
