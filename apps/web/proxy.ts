import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CMS routes (/admin/**) ────────────────────────────────────────────────
  // These are outside [locale]; next-intl must not run on them.
  if (pathname.startsWith('/admin')) {
    // Auth endpoints are always public (login page + PKCE callback + logout)
    const isPublicAdminPath =
      pathname === '/admin/login' ||
      pathname.startsWith('/admin/auth/');

    // Refresh the Supabase session cookie on every admin request so that
    // short-lived tokens are transparently rotated.
    const response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // DEV_AUTH_BYPASS skips session checks entirely for all admin routes.
    // Only ever set this in dev/staging. Never set in production.
    if (process.env.DEV_AUTH_BYPASS === 'true') {
      return response;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!isPublicAdminPath && !user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Already logged in and hitting /admin/login → send to dashboard
    if (isPublicAdminPath && pathname === '/admin/login' && user) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return response;
  }

  // ── Public / locale routes — delegate entirely to next-intl ─────────────
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // /admin/** — auth guard (no next-intl)
    '/admin/:path*',
    // All other paths — next-intl locale routing.
    // Excludes: API routes, Next internals, static files, bare /p/[slug] redirector.
    '/((?!api|_next|_vercel|p/[^/]+$|.*\\..*).*)' ,
  ],
};
