import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServiceClient } from '@june/db';
import { contrastForeground, getPartnerCopy, type Locale } from '@june/shared';
import SimpleForm from '@/components/public/SimpleForm';

export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ shop?: string; rep?: string }>;
}) {
  const { locale, slug } = await params;
  const { shop: shopToken, rep: repId } = await searchParams;

  const supabase = createServiceClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('id, name, primary_color, accent_color, locales_enabled, default_locale, active, tc_url_i18n')
    .eq('slug', slug)
    .maybeSingle();

  if (!partner || !partner.active) notFound();
  if (!partner.locales_enabled.includes(locale)) notFound();

  let shop: { id: string; qr_token: string } | null = null;
  let rep: { id: string } | null = null;

  if (shopToken) {
    const { data: shopRow } = await supabase
      .from('shops')
      .select('id, qr_token, partner_id, active')
      .eq('qr_token', shopToken)
      .maybeSingle();
    if (shopRow && shopRow.partner_id === partner.id && shopRow.active) {
      shop = { id: shopRow.id, qr_token: shopRow.qr_token };

      if (repId) {
        const { data: repRow } = await supabase
          .from('sales_reps')
          .select('id, shop_id, active')
          .eq('id', repId)
          .maybeSingle();
        if (repRow && repRow.shop_id === shop.id && repRow.active) {
          rep = { id: repRow.id };
        }
      }
    }
  }

  const tcUrl = getPartnerCopy(partner, locale as Locale, 'tc_url_i18n') || null;
  const fg = contrastForeground(partner.primary_color);
  const t = await getTranslations({ locale, namespace: 'public' });

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-white">
      <header
        className="flex flex-col items-center px-6 pt-16 pb-12 text-center"
        style={{ backgroundColor: partner.primary_color, color: fg }}
      >
        <div className="text-2xl font-semibold tracking-tight">{partner.name}</div>
        <h1 className="mt-8 text-3xl font-semibold leading-tight tracking-tight">
          {t('landing.welcome')}
        </h1>
      </header>

      <section className="flex flex-col gap-6 px-6 pt-12 pb-12 text-neutral-900">
        <SimpleForm
          partner={{
            id: partner.id,
            name: partner.name,
            primaryColor: partner.primary_color,
            foregroundColor: fg,
            tcUrl,
          }}
          shop={shop}
          rep={rep}
          locale={locale as Locale}
          slug={slug}
        />
      </section>
    </main>
  );
}
