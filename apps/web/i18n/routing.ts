import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['nl', 'fr', 'en'],
  defaultLocale: 'nl',
  localePrefix: 'always',
});
