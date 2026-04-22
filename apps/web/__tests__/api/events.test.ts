import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@june/db';
import { POST as eventsPost } from '@/app/api/events/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_SESSION = 'events-api-test-session';

function makeRequest(body: unknown, ip = '10.0.1.1'): Request {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
    },
    body: JSON.stringify(body),
  });
}

async function cleanup() {
  await supabase.from('events').delete().eq('session_id', TEST_SESSION);
  await supabase.from('rate_limits').delete().like('key', 'events:ip:10.0.1.%');
}

beforeAll(cleanup);
afterAll(cleanup);

describe('POST /api/events', () => {
  test('valid event → 204 + row inserted', async () => {
    const res = await eventsPost(
      makeRequest({
        eventType: 'landing_view',
        partnerSlug: 'ihpo',
        shopToken: 'demo-shop-brussels',
        sessionId: TEST_SESSION,
        meta: { locale: 'fr' },
      }),
    );
    expect(res.status).toBe(204);

    const { data } = await supabase
      .from('events')
      .select('event_type, partner_id')
      .eq('session_id', TEST_SESSION);
    expect(data?.length ?? 0).toBeGreaterThan(0);
    expect(data?.[0]!.event_type).toBe('landing_view');
  });

  test('malformed body → 204 (fire-and-forget)', async () => {
    const res = await eventsPost(
      makeRequest({ eventType: 'not-a-real-type', partnerSlug: 'ihpo' }),
    );
    expect(res.status).toBe(204);
  });

  test('unknown partner → 204 (still drops silently)', async () => {
    const res = await eventsPost(
      makeRequest({
        eventType: 'landing_view',
        partnerSlug: 'definitely-not-real',
      }),
    );
    expect(res.status).toBe(204);
  });
});
