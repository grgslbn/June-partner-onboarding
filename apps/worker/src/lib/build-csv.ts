import { stringify } from 'csv-stringify/sync';

export type LeadRow = {
  confirmation_id: string | null;
  created_at_utc: string | null;
  created_at_brussels: string | null;
  partner_slug: string | null;
  partner_name: string | null;
  shop_name: string | null;
  shop_qr_token: string | null;
  sales_rep_name: string | null;
  sales_rep_email: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  locale: string | null;
  status: string | null;
  iban: string | null;
  deferred_completed_at: string | null;
  discount_code: string | null;
  flow_preset: string | null;
};

const HEADERS: (keyof LeadRow)[] = [
  'confirmation_id',
  'created_at_utc',
  'created_at_brussels',
  'partner_slug',
  'partner_name',
  'shop_name',
  'shop_qr_token',
  'sales_rep_name',
  'sales_rep_email',
  'first_name',
  'last_name',
  'email',
  'locale',
  'status',
  'iban',
  'deferred_completed_at',
  'discount_code',
  'flow_preset',
];

export function buildCsv(rows: LeadRow[]): Buffer {
  const csv = stringify(rows, {
    header: true,
    columns: HEADERS,
    cast: {
      // Represent nulls as empty string rather than the string "null"
      object: (value) => (value === null ? '' : String(value)),
    },
  });
  // UTF-8 BOM so Excel opens it cleanly without garbling é/è/ï
  return Buffer.concat([Buffer.from('﻿', 'utf8'), Buffer.from(csv, 'utf8')]);
}
