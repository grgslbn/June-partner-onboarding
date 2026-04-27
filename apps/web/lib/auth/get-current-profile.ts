import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@june/db';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type CurrentUser = {
  user: { id: string; email: string };
  profile: Profile;
};

/**
 * Returns the authenticated user and their profile row.
 * Redirects to /admin/login if there is no valid session or no profile exists.
 * Call this at the top of every CMS Server Component or Route Handler that
 * requires authentication.
 */
export async function getCurrentProfile(): Promise<CurrentUser> {
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
    // Authenticated user has no profile — likely a direct auth.users insert
    // without a corresponding profiles row. Treat as unauthorised.
    redirect('/admin/login');
  }

  return {
    user: { id: user.id, email: user.email! },
    profile,
  };
}
