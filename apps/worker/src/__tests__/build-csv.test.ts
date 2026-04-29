import { test, expect } from '@jest/globals';
import { buildCsv, type LeadRow } from '../lib/build-csv.js';

const sample: LeadRow = {
  confirmation_id:      'CONF-001',
  created_at_utc:       '2026-04-27T10:00:00Z',
  created_at_brussels:  '2026-04-27T12:00:00+02:00',
  partner_slug:         'ihpo',
  partner_name:         'IHPO',
  shop_name:            'Brussels Central',
  shop_qr_token:        'abc123',
  sales_rep_name:       'Marie Dupont',
  sales_rep_email:      'marie@ihpo.be',
  first_name:           'René',
  last_name:            'Müller',
  email:                'rene@example.com',
  locale:               'fr',
  status:               'submitted',
  iban:                 null,
  deferred_completed_at: null,
  discount_code:        null,
  flow_preset:          'simple',
  mobile:               null,
  address_street:       null,
  address_postal_code:  null,
  address_city:         null,
  is_business:          null,
  business_name:        null,
  business_vat:         null,
  sepa_accepted:        null,
  housing_type:         null,
  birth_date:           null,
  billing_frequency:    null,
  product_choice:       null,
};

test('buildCsv returns a Buffer starting with UTF-8 BOM', () => {
  const buf = buildCsv([sample]);
  // UTF-8 BOM is EF BB BF
  expect(buf[0]).toBe(0xef);
  expect(buf[1]).toBe(0xbb);
  expect(buf[2]).toBe(0xbf);
});

test('buildCsv includes header row with all 30 columns in order', () => {
  const buf = buildCsv([sample]);
  // Strip BOM (U+FEFF) before comparing
  const text = buf.toString('utf8').replace(/^﻿/, '');
  const firstLine = text.split('\n')[0]!;
  expect(firstLine).toBe(
    'confirmation_id,created_at_utc,created_at_brussels,partner_slug,partner_name,' +
    'shop_name,shop_qr_token,sales_rep_name,sales_rep_email,first_name,last_name,' +
    'email,locale,status,iban,deferred_completed_at,discount_code,flow_preset,' +
    'mobile,address_street,address_postal_code,address_city,is_business,business_name,' +
    'business_vat,sepa_accepted,housing_type,birth_date,billing_frequency,product_choice',
  );
});

test('buildCsv encodes special characters correctly', () => {
  const buf = buildCsv([sample]);
  const text = buf.toString('utf8');
  expect(text).toContain('René');
  expect(text).toContain('Müller');
});

test('buildCsv emits empty string for null fields', () => {
  const buf = buildCsv([sample]);
  const text = buf.toString('utf8');
  const lines = text.trimEnd().split('\n');
  const dataLine = lines[1]!;
  // iban, deferred_completed_at, discount_code are null — should appear as empty fields
  expect(dataLine).toContain(',fr,submitted,,,,simple,');
  // All 12 new configurable fields are null — row ends with 12 commas
  expect(dataLine.endsWith(','.repeat(11))).toBe(true);
});

test('buildCsv handles empty rows array', () => {
  const buf = buildCsv([]);
  const text = buf.toString('utf8');
  // Should just be BOM + header
  const lines = text.split('\n').filter(Boolean);
  expect(lines).toHaveLength(1);
});
