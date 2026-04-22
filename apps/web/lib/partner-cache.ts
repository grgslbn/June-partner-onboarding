import { createServiceClient } from '@june/db';

// 60-second in-memory cache, per serverless instance. See 02_ARCHITECTURE.md §4.
// For our peak load (<100 req/s per partner) this keeps the hot path fast
// without needing a shared cache layer.

type PartnerRow = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  flow_preset: string;
  iban_behavior: string;
  locales_enabled: string[];
  default_locale: string;
  tc_url_i18n: Record<string, unknown>;
};

type CacheEntry = { partner: PartnerRow | null; fetchedAt: number };

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function getCachedPartnerBySlug(slug: string): Promise<PartnerRow | null> {
  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && now - hit.fetchedAt < TTL_MS) return hit.partner;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('partners')
    .select('id, slug, name, active, flow_preset, iban_behavior, locales_enabled, default_locale, tc_url_i18n')
    .eq('slug', slug)
    .maybeSingle();

  const partner = (data as PartnerRow | null) ?? null;
  cache.set(slug, { partner, fetchedAt: now });
  return partner;
}
