-- Analytics views for Briefing 17 dashboard.
-- Adds richer views alongside the existing lead_daily_counts + funnel_30d.
-- Existing views are NOT replaced to avoid breaking any consumers.

-- Daily lead counts with completion breakdown, last 90 days.
-- Queried via service role; API layer filters by partner_id.
CREATE OR REPLACE VIEW partner_leads_daily AS
SELECT
  partner_id,
  date_trunc('day', created_at)::date AS day,
  count(*)::int                                               AS leads_count,
  count(*) FILTER (WHERE status = 'complete')::int            AS completed_count
FROM leads
WHERE created_at > now() - interval '90 days'
GROUP BY partner_id, date_trunc('day', created_at);

-- Funnel events per partner, last 30 days.
CREATE OR REPLACE VIEW partner_funnel_30d AS
SELECT
  partner_id,
  event_type,
  count(*)::int AS event_count
FROM events
WHERE created_at > now() - interval '30 days'
GROUP BY partner_id, event_type;

-- Per-rep performance, last 30 days (active reps only).
CREATE OR REPLACE VIEW partner_rep_performance_30d AS
SELECT
  sr.id                                                               AS sales_rep_id,
  sr.display_name,
  s.partner_id,
  s.id                                                                AS shop_id,
  s.name                                                              AS shop_name,
  count(l.id)::int                                                    AS leads_count,
  count(l.id) FILTER (WHERE l.status = 'complete')::int               AS completed_count
FROM sales_reps sr
LEFT JOIN shops s ON s.id = sr.shop_id
LEFT JOIN leads l ON l.sales_rep_id = sr.id
  AND l.created_at > now() - interval '30 days'
WHERE sr.active = true
GROUP BY sr.id, sr.display_name, s.partner_id, s.id, s.name;
