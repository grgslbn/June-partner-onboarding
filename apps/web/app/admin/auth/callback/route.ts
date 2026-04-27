import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Supabase Auth PKCE callback — the magic link redirects here with a `code`
// query param. We exchange it for a session (sets the session cookie) and
// redirect the user to the CMS dashboard (or the `next` param if set).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  if (!code) {
    return NextResponse.redirect(new URL('/admin/login?error=missing_code', origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // Ensure `next` only redirects to internal paths (prevent open-redirect)
  const redirectTo = next.startsWith('/') ? next : '/admin';
  return NextResponse.redirect(new URL(redirectTo, origin));
}
