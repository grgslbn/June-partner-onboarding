-- The policies in 20260422172049_rls_policies.sql each evaluated
-- `exists (select 1 from profiles where ...)` inside their USING clause.
-- Because profiles itself had a policy that also ran `select ... from profiles`,
-- Postgres flagged this as infinite recursion and rejected every query (error
-- 42P17). Replace the profile-lookup pattern with two SECURITY DEFINER helpers
-- that read profiles once, bypassing RLS.

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

create or replace function public.current_user_role() returns text
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select role from public.profiles where id = auth.uid();
  $$;

create or replace function public.current_user_partner_id() returns uuid
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select partner_id from public.profiles where id = auth.uid();
  $$;

grant execute on function public.current_user_role() to authenticated, anon;
grant execute on function public.current_user_partner_id() to authenticated, anon;

-- ---- profiles ----

create policy "june_admin_all_profiles" on profiles
  for all
  using (public.current_user_role() = 'june_admin');

-- ---- partners ----

create policy "june_admin_all_partners" on partners
  for all
  using (public.current_user_role() = 'june_admin');

create policy "partner_admin_own_partner" on partners
  for all
  using (
    public.current_user_role() = 'partner_admin'
    and public.current_user_partner_id() = partners.id
  );

-- ---- shops ----

create policy "june_admin_all_shops" on shops
  for all
  using (public.current_user_role() = 'june_admin');

create policy "partner_admin_own_shops" on shops
  for all
  using (
    public.current_user_role() = 'partner_admin'
    and public.current_user_partner_id() = shops.partner_id
  );

-- ---- sales_reps (scoped via shop.partner_id) ----

create policy "june_admin_all_reps" on sales_reps
  for all
  using (public.current_user_role() = 'june_admin');

create policy "partner_admin_own_reps" on sales_reps
  for all
  using (
    public.current_user_role() = 'partner_admin'
    and exists (
      select 1 from shops s
      where s.id = sales_reps.shop_id
        and s.partner_id = public.current_user_partner_id()
    )
  );

-- ---- discount_codes ----

create policy "june_admin_all_discounts" on discount_codes
  for all
  using (public.current_user_role() = 'june_admin');

create policy "partner_admin_own_discounts" on discount_codes
  for all
  using (
    public.current_user_role() = 'partner_admin'
    and public.current_user_partner_id() = discount_codes.partner_id
  );

-- ---- leads ----

create policy "june_admin_all_leads" on leads
  for all
  using (public.current_user_role() = 'june_admin');

create policy "partner_admin_own_leads" on leads
  for all
  using (
    public.current_user_role() = 'partner_admin'
    and public.current_user_partner_id() = leads.partner_id
  );

-- ---- events ----

create policy "june_admin_all_events" on events
  for all
  using (public.current_user_role() = 'june_admin');

create policy "partner_admin_own_events" on events
  for all
  using (
    public.current_user_role() = 'partner_admin'
    and public.current_user_partner_id() = events.partner_id
  );
