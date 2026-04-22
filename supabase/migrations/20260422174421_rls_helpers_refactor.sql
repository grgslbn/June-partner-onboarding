-- Refactor the RLS helpers introduced in 20260422173057_rls_helpers_fix_recursion.sql:
--   * Role checks become boolean (is_june_admin, is_partner_admin) so policies read
--     as plain predicates. The text-valued current_user_role() went away.
--   * Grants are tightened to authenticated only (was authenticated + anon).
--   * Admin policies gain `to authenticated` so anon never evaluates predicates
--     that call helpers it can't execute.
--   * profiles policies stay inline — the helpers query profiles internally, so
--     calling them from profiles' own policies would require reasoning about
--     recursion safety case-by-case. Inline keeps profiles easy to audit.

-- Drop the policies that reference the old helpers
drop policy if exists "june_admin_all_profiles" on profiles;

drop policy if exists "june_admin_all_partners" on partners;
drop policy if exists "partner_admin_own_partner" on partners;

drop policy if exists "june_admin_all_shops" on shops;
drop policy if exists "partner_admin_own_shops" on shops;

drop policy if exists "june_admin_all_reps" on sales_reps;
drop policy if exists "partner_admin_own_reps" on sales_reps;

drop policy if exists "june_admin_all_discounts" on discount_codes;
drop policy if exists "partner_admin_own_discounts" on discount_codes;

drop policy if exists "june_admin_all_leads" on leads;
drop policy if exists "partner_admin_own_leads" on leads;

drop policy if exists "june_admin_all_events" on events;
drop policy if exists "partner_admin_own_events" on events;

-- Drop old helpers
drop function if exists public.current_user_role();
drop function if exists public.current_user_partner_id();

-- New helpers: boolean role checks + partner id lookup.
-- language sql + stable + security definer + pinned search_path, read-only.

create or replace function public.is_june_admin() returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'june_admin'
    );
  $$;

create or replace function public.is_partner_admin() returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'partner_admin'
    );
  $$;

create or replace function public.current_partner_id() returns uuid
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select partner_id from public.profiles where id = auth.uid();
  $$;

-- Grants: authenticated only.
revoke execute on function public.is_june_admin() from public;
revoke execute on function public.is_partner_admin() from public;
revoke execute on function public.current_partner_id() from public;

grant execute on function public.is_june_admin() to authenticated;
grant execute on function public.is_partner_admin() to authenticated;
grant execute on function public.current_partner_id() to authenticated;

-- profiles: users_own_profile (from the initial RLS migration) stays as-is.
-- We intentionally do NOT recreate june_admin_all_profiles. June admins manage
-- other profiles server-side via the service_role key.

-- ---- partners ----

create policy "june_admin_all_partners" on partners
  for all to authenticated
  using (public.is_june_admin());

create policy "partner_admin_own_partner" on partners
  for all to authenticated
  using (
    public.is_partner_admin()
    and public.current_partner_id() = partners.id
  );

-- ---- shops ----

create policy "june_admin_all_shops" on shops
  for all to authenticated
  using (public.is_june_admin());

create policy "partner_admin_own_shops" on shops
  for all to authenticated
  using (
    public.is_partner_admin()
    and public.current_partner_id() = shops.partner_id
  );

-- ---- sales_reps (scoped via shop.partner_id) ----

create policy "june_admin_all_reps" on sales_reps
  for all to authenticated
  using (public.is_june_admin());

create policy "partner_admin_own_reps" on sales_reps
  for all to authenticated
  using (
    public.is_partner_admin()
    and exists (
      select 1 from shops s
      where s.id = sales_reps.shop_id
        and s.partner_id = public.current_partner_id()
    )
  );

-- ---- discount_codes ----

create policy "june_admin_all_discounts" on discount_codes
  for all to authenticated
  using (public.is_june_admin());

create policy "partner_admin_own_discounts" on discount_codes
  for all to authenticated
  using (
    public.is_partner_admin()
    and public.current_partner_id() = discount_codes.partner_id
  );

-- ---- leads ----

create policy "june_admin_all_leads" on leads
  for all to authenticated
  using (public.is_june_admin());

create policy "partner_admin_own_leads" on leads
  for all to authenticated
  using (
    public.is_partner_admin()
    and public.current_partner_id() = leads.partner_id
  );

-- ---- events ----

create policy "june_admin_all_events" on events
  for all to authenticated
  using (public.is_june_admin());

create policy "partner_admin_own_events" on events
  for all to authenticated
  using (
    public.is_partner_admin()
    and public.current_partner_id() = events.partner_id
  );
