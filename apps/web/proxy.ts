import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip /p/[slug] (no locale) so our page handler can redirect to the
  // partner-specific default locale. Skip Next internals and static files.
  matcher: ['/((?!api|_next|_vercel|p/[^/]+$|.*\\..*).*)'],
};
