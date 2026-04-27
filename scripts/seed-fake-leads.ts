/**
 * Fake-data seed for analytics testing.
 * Run:   pnpm tsx scripts/seed-fake-leads.ts
 * Clean: pnpm tsx scripts/seed-fake-leads.ts --clean
 *
 * NEVER run against production. Only targets the project in .env.local
 * (june-onboarding-dev). Leads are identifiable by +seed- in the email.
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Config ────────────────────────────────────────────────────────────────────

const PARTNER_SLUG = 'ihpo';
const SHOP_TOKEN = 'demo-shop-brussels';
const LEAD_COUNT = 80;
const DAYS_BACK = 30;

const FIRST_NAMES = [
  'Marie', 'Jean', 'Pierre', 'Sophie', 'Lotte', 'Pieter', 'Anna', 'Lucas',
  'Emma', 'Thomas', 'Julie', 'Nicolas', 'Claire', 'Mathieu', 'Isabelle', 'Kevin',
];
const LAST_NAMES = [
  'Dupont', 'Dubois', 'Laurent', 'Simon', 'Michel', 'Leroy', 'Moreau', 'Janssen',
  'Peeters', 'Maes', 'Willems', 'Claes', 'Jacobs', 'Stevens', 'Leclercq', 'Adam',
];

const LOCALES = ['fr', 'fr', 'fr', 'nl', 'nl'] as const; // more FR, some NL

// Status weights: ~70% submitted, ~25% complete, ~5% failed
const STATUSES: Array<{ value: string; weight: number }> = [
  { value: 'submitted', weight: 70 },
  { value: 'complete',  weight: 25 },
  { value: 'failed',    weight: 5  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** Brussels local time → UTC ISO string */
function brusselsTs(date: Date): string {
  // Europe/Brussels is UTC+1 in winter, UTC+2 in summer.
  // Approximation: always use offset +1 (good enough for fake data).
  return date.toISOString();
}

/**
 * Generate a timestamp in the past DAYS_BACK days with realistic
 * time-of-day and day-of-week distributions.
 */
function randomTimestamp(index: number): Date {
  const now = Date.now();

  // Day-of-week weights: Mon–Fri moderate, Sat high, Sun low
  const DOW_WEIGHTS = [5, 10, 10, 10, 10, 18, 4]; // Sun=0 … Sat=6

  // Pick a random day offset (0 = today, DAYS_BACK-1 = oldest)
  // Weight toward recent days slightly for a natural-looking chart
  const dayOffset = Math.floor(Math.random() * DAYS_BACK);
  const candidateDate = new Date(now - dayOffset * 86_400_000);
  const dow = candidateDate.getDay();

  // Reject and retry if day-of-week doesn't match weight (rejection sampling)
  if (Math.random() > DOW_WEIGHTS[dow] / 18) {
    // Simple fallback: shift by ±1 day
    const shift = Math.random() > 0.5 ? 1 : -1;
    candidateDate.setDate(candidateDate.getDate() + shift);
  }

  // Time-of-day: peak 10am–7pm Brussels (approximate UTC offset +1)
  // Modelled as: 10% chance outside peak hours, 90% inside
  let hour: number;
  if (Math.random() < 0.85) {
    // 10:00–19:00 Brussels ≈ 09:00–18:00 UTC
    hour = 9 + Math.floor(Math.random() * 9);
  } else {
    hour = Math.floor(Math.random() * 24);
  }
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  candidateDate.setHours(hour, minute, second, Math.floor(Math.random() * 1000));

  // Ensure we don't drift into the future
  return candidateDate > new Date() ? new Date(now - 3_600_000) : candidateDate;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function clean() {
  console.log('Deleting fake leads (email contains +seed-)…');
  const { error, count } = await supabase
    .from('leads')
    .delete({ count: 'exact' })
    .like('email', '%+seed-%');
  if (error) { console.error(error); process.exit(1); }
  console.log(`Deleted ${count} lead(s).`);
}

async function seed() {
  // Resolve partner + shop + reps
  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('slug', PARTNER_SLUG)
    .single();
  if (!partner) { console.error('Partner not found:', PARTNER_SLUG); process.exit(1); }

  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('qr_token', SHOP_TOKEN)
    .single();
  if (!shop) { console.error('Shop not found:', SHOP_TOKEN); process.exit(1); }

  const { data: reps } = await supabase
    .from('sales_reps')
    .select('id')
    .eq('shop_id', shop.id)
    .eq('active', true);
  const repIds = (reps ?? []).map((r) => r.id);

  console.log(`Seeding ${LEAD_COUNT} fake leads for IHPO / Brussels…`);
  console.log(`  Partner: ${partner.id}`);
  console.log(`  Shop:    ${shop.id}`);
  console.log(`  Reps:    ${repIds.length} active`);

  let inserted = 0;

  for (let i = 0; i < LEAD_COUNT; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const locale = pick(LOCALES);
    const status = weightedPick(STATUSES);
    const salesRepId = Math.random() < 0.7 && repIds.length > 0 ? pick(repIds) : null;
    const createdAt = randomTimestamp(i);
    const tcAt = createdAt.toISOString();

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        partner_id: partner.id,
        shop_id: shop.id,
        sales_rep_id: salesRepId,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}+seed-${i}@example.com`,
        locale,
        status,
        tc_accepted_at: tcAt,
        created_at: createdAt.toISOString(),
        confirmation_email_sent_at: status !== 'failed' ? createdAt.toISOString() : null,
      })
      .select('id')
      .single();

    if (leadErr || !lead) {
      console.error(`  Lead ${i} insert failed:`, leadErr?.message);
      continue;
    }

    // Events: landing_view always; form_started + form_submitted for converted
    const eventTs = createdAt.toISOString();
    const events: object[] = [
      { event_type: 'landing_view', partner_id: partner.id, shop_id: shop.id, created_at: eventTs },
    ];

    if (status !== 'failed') {
      events.push(
        { event_type: 'form_started',   partner_id: partner.id, shop_id: shop.id, lead_id: lead.id, created_at: eventTs },
        { event_type: 'form_submitted', partner_id: partner.id, shop_id: shop.id, lead_id: lead.id, created_at: eventTs },
      );
    }

    const { error: evtErr } = await supabase.from('events').insert(events);
    if (evtErr) console.warn(`  Events for lead ${i} failed:`, evtErr.message);

    inserted++;
    if ((i + 1) % 10 === 0) process.stdout.write(`  ${i + 1}/${LEAD_COUNT}\n`);
  }

  console.log(`Done. Inserted ${inserted}/${LEAD_COUNT} leads.`);
  console.log('Clean up later with: pnpm tsx scripts/seed-fake-leads.ts --clean');
}

// ── Entry ─────────────────────────────────────────────────────────────────────

async function main() {
  const isClean = process.argv.includes('--clean');
  if (isClean) {
    await clean();
  } else {
    await seed();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
