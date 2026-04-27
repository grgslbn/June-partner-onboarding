import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@june/db';

const DEV_ADMIN_EMAIL = 'georgeslieben@gmail.com';

/**
 * Dev-only endpoint that creates a real Supabase session for the seeded
 * june_admin without requiring a magic-link email round-trip.
 *
 * Flow: generate a server-side OTP link → redirect the browser through
 * /admin/auth/callback → real session cookie is set → /admin renders normally.
 *
 * Gate: returns 403 if DEV_AUTH_BYPASS !== 'true'. This endpoint is completely
 * inert in production where the env var is absent.
 */
export async function POST(request: NextRequest) {
  if (process.env.DEV_AUTH_BYPASS !== 'true') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const service = createServiceClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const callbackUrl = `${siteUrl}/admin/auth/callback`;

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: DEV_ADMIN_EMAIL,
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate login link' },
      { status: 500 }
    );
  }

  // Redirect the browser through Supabase's verify endpoint, which exchanges
  // the token and then redirects to callbackUrl, setting the session cookie.
  return NextResponse.redirect(data.properties.action_link, { status: 302 });
}
