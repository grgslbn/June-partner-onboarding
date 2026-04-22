import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import type { Database } from '../types.js';

loadEnv({ path: '.env.test' });

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    'SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, and SUPABASE_TEST_SERVICE_KEY must be set in packages/db/.env.test',
  );
}

const service = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const P1_SLUG = 'rlstest-p1';
const P2_SLUG = 'rlstest-p2';
const P1_ADMIN_EMAIL = 'rlstest-p1@test.example';
const P2_ADMIN_EMAIL = 'rlstest-p2@test.example';
const JUNE_ADMIN_EMAIL = 'rlstest-june@test.example';
const TEST_PASSWORD = 'rlstest-password-ok-1234';

let p1Id: string;
let p2Id: string;

async function signedIn(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url!, anonKey!);
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function cleanup() {
  const { data: partners } = await service.from('partners').select('id').in('slug', [P1_SLUG, P2_SLUG]);
  const ids = (partners ?? []).map((p) => p.id);
  if (ids.length > 0) {
    await service.from('leads').delete().in('partner_id', ids);
    await service.from('partners').delete().in('id', ids);
  }
  const { data: list } = await service.auth.admin.listUsers();
  for (const user of list.users) {
    if (
      user.email === P1_ADMIN_EMAIL ||
      user.email === P2_ADMIN_EMAIL ||
      user.email === JUNE_ADMIN_EMAIL
    ) {
      await service.auth.admin.deleteUser(user.id);
    }
  }
}

beforeAll(async () => {
  await cleanup();

  const p1 = await service.from('partners').insert({ slug: P1_SLUG, name: 'RLSTest P1' }).select('id').single();
  const p2 = await service.from('partners').insert({ slug: P2_SLUG, name: 'RLSTest P2' }).select('id').single();
  if (p1.error || p2.error || !p1.data || !p2.data) {
    throw new Error(`Failed to create test partners: ${p1.error?.message ?? p2.error?.message}`);
  }
  p1Id = p1.data.id;
  p2Id = p2.data.id;

  const p1User = await service.auth.admin.createUser({
    email: P1_ADMIN_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  const p2User = await service.auth.admin.createUser({
    email: P2_ADMIN_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  const juneUser = await service.auth.admin.createUser({
    email: JUNE_ADMIN_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (
    p1User.error || p2User.error || juneUser.error ||
    !p1User.data.user || !p2User.data.user || !juneUser.data.user
  ) {
    throw new Error(
      `Failed to create test auth users: ${p1User.error?.message ?? p2User.error?.message ?? juneUser.error?.message}`,
    );
  }

  const profilesInsert = await service.from('profiles').insert([
    { id: p1User.data.user.id, email: P1_ADMIN_EMAIL, role: 'partner_admin', partner_id: p1Id },
    { id: p2User.data.user.id, email: P2_ADMIN_EMAIL, role: 'partner_admin', partner_id: p2Id },
    { id: juneUser.data.user.id, email: JUNE_ADMIN_EMAIL, role: 'june_admin', partner_id: null },
  ]);
  if (profilesInsert.error) {
    throw new Error(`Failed to create test profiles: ${profilesInsert.error.message}`);
  }

  const leadsInsert = await service.from('leads').insert([
    {
      partner_id: p1Id,
      status: 'submitted',
      locale: 'nl',
      first_name: 'RLS',
      last_name: 'P1Lead',
      email: 'rls-p1@test.example',
      tc_accepted_at: new Date().toISOString(),
    },
    {
      partner_id: p2Id,
      status: 'submitted',
      locale: 'nl',
      first_name: 'RLS',
      last_name: 'P2Lead',
      email: 'rls-p2@test.example',
      tc_accepted_at: new Date().toISOString(),
    },
  ]);
  if (leadsInsert.error) {
    throw new Error(`Failed to create test leads: ${leadsInsert.error.message}`);
  }
}, 30_000);

afterAll(async () => {
  await cleanup();
}, 30_000);

describe('RLS helpers', () => {
  test('is_june_admin() returns true for june_admin, false for partner_admin', async () => {
    const june = await signedIn(JUNE_ADMIN_EMAIL);
    const { data: juneRes } = await june.rpc('is_june_admin');
    expect(juneRes).toBe(true);

    const p1 = await signedIn(P1_ADMIN_EMAIL);
    const { data: p1Res } = await p1.rpc('is_june_admin');
    expect(p1Res).toBe(false);
  });

  test('is_partner_admin() returns true for partner_admin, false for june_admin', async () => {
    const p1 = await signedIn(P1_ADMIN_EMAIL);
    const { data: p1Res } = await p1.rpc('is_partner_admin');
    expect(p1Res).toBe(true);

    const june = await signedIn(JUNE_ADMIN_EMAIL);
    const { data: juneRes } = await june.rpc('is_partner_admin');
    expect(juneRes).toBe(false);
  });

  test("current_partner_id() returns the signed-in admin's partner_id, null for june_admin", async () => {
    const p1 = await signedIn(P1_ADMIN_EMAIL);
    const { data: p1Res } = await p1.rpc('current_partner_id');
    expect(p1Res).toBe(p1Id);

    const june = await signedIn(JUNE_ADMIN_EMAIL);
    const { data: juneRes } = await june.rpc('current_partner_id');
    expect(juneRes).toBeNull();
  });
});

describe('RLS policies', () => {
  test("partner_admin cannot select another partner's leads", async () => {
    const p1 = await signedIn(P1_ADMIN_EMAIL);
    const { data: p2Leads } = await p1.from('leads').select().eq('partner_id', p2Id);
    expect(p2Leads).toEqual([]);

    const { data: ownLeads } = await p1.from('leads').select().eq('partner_id', p1Id);
    expect(ownLeads?.length).toBeGreaterThan(0);
  });

  test('anon cannot select from leads', async () => {
    const anonClient = createClient<Database>(url!, anonKey!);
    const { data } = await anonClient.from('leads').select();
    expect(data).toEqual([]);
  });

  test('anon can insert into leads when payload is well-formed', async () => {
    const anonClient = createClient<Database>(url!, anonKey!);
    const { error } = await anonClient.from('leads').insert({
      partner_id: p1Id,
      status: 'submitted',
      locale: 'nl',
      first_name: 'Anon',
      last_name: 'Insert',
      email: 'anon-insert@test.example',
      tc_accepted_at: new Date().toISOString(),
    });
    expect(error).toBeNull();
  });
});
