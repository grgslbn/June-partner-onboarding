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
  // Configurable form fields (null when not collected for this partner)
  mobile: string | null;
  address_street: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  is_business: string | null;
  business_name: string | null;
  business_vat: string | null;
  sepa_accepted: string | null;
  housing_type: string | null;
  birth_date: string | null;
  billing_frequency: string | null;
  product_choice: string | null;
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
  'mobile',
  'address_street',
  'address_postal_code',
  'address_city',
  'is_business',
  'business_name',
  'business_vat',
  'sepa_accepted',
  'housing_type',
  'birth_date',
  'billing_frequency',
  'product_choice',
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
