-- Analytics views per docs/02_ARCHITECTURE.md §3.3
-- lead_daily_counts is a materialized view (refreshed nightly by the worker).
-- funnel_30d is a regular view with security_invoker so RLS on events is enforced
-- per querying user (june_admin sees all partners; partner_admin sees only theirs).

create materialized view lead_daily_counts as
select
  partner_id,
  date_trunc('day', created_at) as day,
  count(*) as leads
from leads
group by partner_id, date_trunc('day', created_at);

-- Materialized views do not support RLS. Consumers must filter by partner_id in
-- the query when rendering per-partner dashboards. A worker cron (Briefing 18)
-- runs REFRESH MATERIALIZED VIEW nightly.

create view funnel_30d
  with (security_invoker = true) as
select
  partner_id,
  event_type,
  count(*) as count
from events
where created_at > now() - interval '30 days'
group by partner_id, event_type;
