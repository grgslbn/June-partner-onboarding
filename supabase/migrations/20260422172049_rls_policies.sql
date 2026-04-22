-- RLS policies per docs/02_ARCHITECTURE.md §3.2
-- Pattern: june_admin sees everything; partner_admin sees only their own partner's rows.
-- profiles has a baseline policy letting every user read their own row so that
-- the `exists (select 1 from profiles where profiles.id = auth.uid() ...)` checks
-- on other tables can resolve the current user's role + partner_id.

alter table profiles enable row level security;
alter table partners enable row level security;
alter table shops enable row level security;
alter table sales_reps enable row level security;
alter table discount_codes enable row level security;
alter table leads enable row level security;
alter table events enable row level security;

-- ---- profiles ----

create policy "users_own_profile" on profiles
  for all
  using (auth.uid() = id);

create policy "june_admin_all_profiles" on profiles
  for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'june_admin'
    )
  );

-- ---- partners ----

create policy "june_admin_all_partners" on partners
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'june_admin'
    )
  );

create policy "partner_admin_own_partner" on partners
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'partner_admin'
        and profiles.partner_id = partners.id
    )
  );

-- ---- shops ----

create policy "june_admin_all_shops" on shops
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'june_admin'
    )
  );

create policy "partner_admin_own_shops" on shops
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'partner_admin'
        and profiles.partner_id = shops.partner_id
    )
  );

-- ---- sales_reps (scoped via shop.partner_id) ----

create policy "june_admin_all_reps" on sales_reps
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'june_admin'
    )
  );

create policy "partner_admin_own_reps" on sales_reps
  for all
  using (
    exists (
      select 1
      from profiles p
      join shops s on s.partner_id = p.partner_id
      where p.id = auth.uid()
        and p.role = 'partner_admin'
        and s.id = sales_reps.shop_id
    )
  );

-- ---- discount_codes ----

create policy "june_admin_all_discounts" on discount_codes
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'june_admin'
    )
  );

create policy "partner_admin_own_discounts" on discount_codes
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'partner_admin'
        and profiles.partner_id = discount_codes.partner_id
    )
  );

-- ---- leads ----

create policy "june_admin_all_leads" on leads
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'june_admin'
    )
  );

create policy "partner_admin_own_leads" on leads
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'partner_admin'
        and profiles.partner_id = leads.partner_id
    )
  );

-- ---- events ----

create policy "june_admin_all_events" on events
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'june_admin'
    )
  );

create policy "partner_admin_own_events" on events
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'partner_admin'
        and profiles.partner_id = events.partner_id
    )
  );

-- ---- anon: public lead endpoint ----
-- The customer-facing endpoint posts to leads and logs events. Nothing else is
-- readable or writable by anon. Every other anon access to these tables is
-- rejected by default (no matching policy).

create policy "anon_insert_leads" on leads
  for insert
  to anon
  with check (true);

create policy "anon_insert_events" on events
  for insert
  to anon
  with check (true);

grant insert on leads to anon;
grant insert on events to anon;
