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
};

test('buildCsv returns a Buffer starting with UTF-8 BOM', () => {
  const buf = buildCsv([sample]);
  // UTF-8 BOM is EF BB BF
  expect(buf[0]).toBe(0xef);
  expect(buf[1]).toBe(0xbb);
  expect(buf[2]).toBe(0xbf);
});

test('buildCsv includes header row with all 18 columns in order', () => {
  const buf = buildCsv([sample]);
  // Strip BOM (U+FEFF) before comparing
  const text = buf.toString('utf8').replace(/^﻿/, '');
  const firstLine = text.split('\n')[0]!;
  expect(firstLine).toBe(
    'confirmation_id,created_at_utc,created_at_brussels,partner_slug,partner_name,' +
    'shop_name,shop_qr_token,sales_rep_name,sales_rep_email,first_name,last_name,' +
    'email,locale,status,iban,deferred_completed_at,discount_code,flow_preset',
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
  // Row ends with: ...,fr,submitted,,,, (iban, deferred, discount empty, flow_preset last)
  expect(dataLine).toContain(',fr,submitted,,,,simple');
});

test('buildCsv handles empty rows array', () => {
  const buf = buildCsv([]);
  const text = buf.toString('utf8');
  // Should just be BOM + header
  const lines = text.split('\n').filter(Boolean);
  expect(lines).toHaveLength(1);
});
