export type Locale = 'nl' | 'fr' | 'en';

export type LocalizedField = Partial<Record<Locale, string>>;

export function getPartnerCopy<
  P extends { default_locale: string } & Record<K, unknown>,
  K extends keyof P,
>(partner: P, locale: Locale, field: K): string {
  const value = partner[field] as LocalizedField | null | undefined;
  if (!value || typeof value !== 'object') return '';
  return (
    value[locale] ??
    value[partner.default_locale as Locale] ??
    ''
  );
}
