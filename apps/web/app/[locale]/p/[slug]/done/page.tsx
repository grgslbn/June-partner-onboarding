import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CircleCheckIcon } from 'lucide-react';
import { createServiceClient } from '@june/db';
import { contrastForeground } from '@june/shared';

export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale, slug } = await params;
  const { ref } = await searchParams;

  const supabase = createServiceClient();
  const { data: partner } = await supabase
    .from('partners')
    .select('name, primary_color, locales_enabled, active')
    .eq('slug', slug)
    .maybeSingle();

  if (!partner || !partner.active) notFound();
  if (!partner.locales_enabled.includes(locale)) notFound();

  const fg = contrastForeground(partner.primary_color);
  const t = await getTranslations({ locale, namespace: 'public.success' });

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-white">
      <header
        className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center"
        style={{ backgroundColor: partner.primary_color, color: fg }}
      >
        <CircleCheckIcon
          className="size-20"
          aria-hidden="true"
          strokeWidth={1.5}
        />
        <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          {t('title')}
        </h1>
      </header>

      <section className="flex flex-col items-center gap-8 px-6 pt-12 pb-12 text-center text-neutral-900">
        <p className="text-lg leading-snug">{t('message')}</p>

        {ref && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm text-neutral-600">{t('reference')}</span>
            <span className="font-mono text-xl font-semibold tracking-wider text-neutral-900">
              {ref}
            </span>
          </div>
        )}

        <p className="max-w-[28ch] text-sm text-neutral-600">{t('checkEmail')}</p>

        <p className="text-xs text-neutral-500">{partner.name}</p>
      </section>
    </main>
  );
}
