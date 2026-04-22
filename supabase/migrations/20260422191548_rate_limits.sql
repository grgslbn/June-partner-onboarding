-- Rate-limit counters backing the public endpoints' limits (per Briefing 06).
-- A Postgres-backed counter — simpler than Upstash for v1 since we already
-- have the DB in the request path. Check-and-increment runs as a SECURITY
-- DEFINER function so only server-side code (service_role) can touch it.

create table rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create index on rate_limits (window_start);

alter table rate_limits enable row level security;
-- No policies — only callers via SECURITY DEFINER functions (and service_role,
-- which bypasses RLS) can access this table.

create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  v_count int;
  v_cutoff timestamptz := now() - make_interval(secs => p_window_seconds);
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set
      count = case
        when rate_limits.window_start < v_cutoff then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < v_cutoff then now()
        else rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- service_role only. Anon and authenticated can never call this.
revoke execute on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
