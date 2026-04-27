-- Briefing 12: Narrow profiles RLS to block client-side INSERT.
--
-- The initial rls_policies migration created "users_own_profile" as FOR ALL,
-- which inadvertently permits any authenticated user to INSERT their own profile
-- row and choose their own role + partner_id. The CMS is invite-only: profile
-- rows are created exclusively by admin code using the service_role key (which
-- bypasses RLS). No INSERT policy is intentional — any authenticated INSERT will
-- be rejected by RLS.
--
-- Also adds a comment on the table to document this invariant for future readers.

-- Drop the overly broad FOR ALL policy
drop policy if exists "users_own_profile" on profiles;

-- SELECT: users see only their own profile row
create policy "profiles_select_own" on profiles
  for select
  using (auth.uid() = id);

-- UPDATE: users may update only their own profile row
-- (email sync on auth.users change, display name, etc.)
create policy "profiles_update_own" on profiles
  for update
  using (auth.uid() = id);

-- No INSERT policy — only service_role (bypasses RLS) may create profile rows.
-- This enforces the invite-only pattern: a June admin provisions profiles via
-- server-side admin endpoints, never from the browser.

comment on table profiles is
  'One row per CMS user. INSERT is service_role-only (bypasses RLS). '
  'Authenticated clients may SELECT and UPDATE their own row only.';
