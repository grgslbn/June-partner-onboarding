import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@june/db';
import type { Database } from '@june/db';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type CurrentUser = {
  user: { id: string; email: string };
  profile: Profile;
};

const DEV_ADMIN_EMAIL = 'georgeslieben@gmail.com';

/**
 * Returns the authenticated user and their profile row.
 * Redirects to /admin/login if there is no valid session or no profile exists.
 *
 * When DEV_AUTH_BYPASS=true (dev/staging only), skips session validation and
 * returns the seeded june_admin profile directly via service role. Never enable
 * DEV_AUTH_BYPASS in production.
 */
export async function getCurrentProfile(): Promise<CurrentUser> {
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    const service = createServiceClient();

    const { data: profile, error } = await service
      .from('profiles')
      .select('*')
      .eq('email', DEV_ADMIN_EMAIL)
      .single();

    if (error || !profile) {
      // Seed not applied — fall through to normal auth so the error is visible.
      redirect('/admin/login');
    }

    return {
      user: { id: profile.id, email: profile.email },
      profile,
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/admin/login');
  }

  return {
    user: { id: user.id, email: user.email! },
    profile,
  };
}
