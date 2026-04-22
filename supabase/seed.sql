insert into partners (id, slug, name, primary_color, accent_color, flow_preset, iban_behavior, locales_enabled, default_locale)
values (
  '00000000-0000-0000-0000-000000000001',
  'ihpo',
  'IHPO',
  '#E53935',
  '#FFFFFF',
  'simple',
  'deferred',
  array['nl','fr'],
  'fr'
);

insert into shops (id, partner_id, name, address, city, zip, qr_token)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'IHPO Brussels Central',
  'Rue Royale 1',
  'Brussels',
  '1000',
  'demo-shop-qr'
);

insert into sales_reps (shop_id, display_name, email)
values (
  '00000000-0000-0000-0000-000000000010',
  'Marie Dupont',
  'marie@ihpo.example'
);
