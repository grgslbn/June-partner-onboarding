import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@june/db';
import { getPartnerCopy, type Locale } from '@june/shared';

export default async function PartnerLandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const supabase = createServiceClient();
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!partner) notFound();
  if (!partner.locales_enabled.includes(locale)) notFound();

  const t = await getTranslations('public.landing');
  const slogan = getPartnerCopy(partner, locale as Locale, 'slogan_i18n');

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>{t('welcome')}</h1>
      <section>
        <h2>Partner-controlled (DB JSONB)</h2>
        <p>Slogan: {slogan || <em>(no slogan set for {locale})</em>}</p>
      </section>
      <section>
        <h2>Context</h2>
        <ul>
          <li>Partner: {partner.name}</li>
          <li>Slug: {partner.slug}</li>
          <li>Locale: {locale}</li>
          <li>Default locale: {partner.default_locale}</li>
          <li>Enabled locales: {partner.locales_enabled.join(', ')}</li>
        </ul>
      </section>
    </main>
  );
}
