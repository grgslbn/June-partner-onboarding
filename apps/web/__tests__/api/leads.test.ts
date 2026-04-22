import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@june/db';
import { POST as leadsPost } from '@/app/api/leads/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL = 'leads-api-test@test.example';
const FOREIGN_SLUG = 'leads-api-foreign';
const FOREIGN_SHOP_TOKEN = 'leads-api-foreign-shop';
let foreignPartnerId: string | null = null;

function makeRequest(body: unknown, ip = '10.0.0.1'): Request {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      'User-Agent': 'vitest',
    },
    body: JSON.stringify(body),
  });
}

async function cleanup() {
  await supabase.from('leads').delete().eq('email', TEST_EMAIL);
  await supabase.from('partners').delete().eq('slug', FOREIGN_SLUG);
  await supabase.from('rate_limits').delete().like('key', 'leads:ip:10.0.%');
  await supabase.from('rate_limits').delete().like('key', 'leads:shop:%');
}

beforeAll(async () => {
  await cleanup();
  // Second partner with its own shop token — used for attribution-forgery test.
  const { data: partner, error } = await supabase
    .from('partners')
    .insert({ slug: FOREIGN_SLUG, name: 'Foreign Partner' })
    .select('id')
    .single();
  if (error || !partner) throw new Error(`setup partners: ${error?.message}`);
  foreignPartnerId = partner.id;
  await supabase.from('shops').insert({
    partner_id: foreignPartnerId,
    name: 'Foreign Shop',
    qr_token: FOREIGN_SHOP_TOKEN,
  });
});

afterEach(async () => {
  // Keep leads accumulating breaks downstream tests; purge after each.
  await supabase.from('leads').delete().eq('email', TEST_EMAIL);
});

describe('POST /api/leads', () => {
  test('happy path: 200 + lead row + form_submitted event', async () => {
    const res = await leadsPost(
      makeRequest({
        firstName: 'Happy',
        lastName: 'Path',
        email: TEST_EMAIL,
        tcAccepted: true,
        partnerSlug: 'ihpo',
        shopToken: 'demo-shop-brussels',
        locale: 'fr',
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { confirmationId: string; deferredToken: string | null };
    expect(body.confirmationId).toMatch(/^JUN-[A-Z0-9]{6}$/);
    expect(body.deferredToken).toMatch(/^[0-9a-f]{32}$/);

    const { data: lead } = await supabase
      .from('leads')
      .select('id, first_name, status, confirmation_id')
      .eq('email', TEST_EMAIL)
      .single();
    expect(lead).not.toBeNull();
    expect(lead!.status).toBe('submitted');
    expect(lead!.confirmation_id).toBe(body.confirmationId);

    const { data: events } = await supabase
      .from('events')
      .select('event_type')
      .eq('lead_id', lead!.id);
    expect(events?.some((e) => e.event_type === 'form_submitted')).toBe(true);
  });

  test('honeypot filled → 400', async () => {
    const res = await leadsPost(
      makeRequest({
        firstName: 'Bot',
        lastName: 'Test',
        email: TEST_EMAIL,
        tcAccepted: true,
        partnerSlug: 'ihpo',
        locale: 'fr',
        honeypot: 'gotcha',
      }),
    );
    expect(res.status).toBe(400);
  });

  test('bad partner slug → 404', async () => {
    const res = await leadsPost(
      makeRequest({
        firstName: 'X',
        lastName: 'Y',
        email: TEST_EMAIL,
        tcAccepted: true,
        partnerSlug: 'definitely-not-a-real-partner',
        locale: 'fr',
      }),
    );
    expect(res.status).toBe(404);
  });

  test('shop token from different partner → 404', async () => {
    const res = await leadsPost(
      makeRequest({
        firstName: 'Forge',
        lastName: 'Attempt',
        email: TEST_EMAIL,
        tcAccepted: true,
        partnerSlug: 'ihpo',
        shopToken: FOREIGN_SHOP_TOKEN,
        locale: 'fr',
      }),
    );
    expect(res.status).toBe(404);
  });

  test('invalid email → 400', async () => {
    const res = await leadsPost(
      makeRequest({
        firstName: 'X',
        lastName: 'Y',
        email: 'not-an-email',
        tcAccepted: true,
        partnerSlug: 'ihpo',
        locale: 'fr',
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_payload');
  });

  test('rate limit exceeded → 429', async () => {
    const ip = '10.0.0.99';
    const body = {
      firstName: 'Rate',
      lastName: 'Limit',
      email: TEST_EMAIL,
      tcAccepted: true,
      partnerSlug: 'ihpo',
      shopToken: 'demo-shop-brussels',
      locale: 'fr' as const,
    };
    // First 5 allowed, 6th rate-limited.
    for (let i = 0; i < 5; i++) {
      const res = await leadsPost(makeRequest(body, ip));
      expect(res.status, `request ${i + 1}`).toBe(200);
      await supabase.from('leads').delete().eq('email', TEST_EMAIL);
    }
    const sixth = await leadsPost(makeRequest(body, ip));
    expect(sixth.status).toBe(429);
  });
});
