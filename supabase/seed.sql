-- Idempotent seed. Cascading FKs clean up shops + reps when the partner row goes.

delete from partners where id = '00000000-0000-0000-0000-000000000001';

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

insert into shops (id, partner_id, name, address, city, zip, qr_token) values
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'IHPO Brussels Central',
   'Rue Royale 1', 'Brussels', '1000',
   'demo-shop-brussels'),
  ('00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'IHPO Antwerp Central',
   'Meir 42', 'Antwerp', '2000',
   'demo-shop-antwerp'),
  ('00000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'IHPO Liège Downtown',
   'Rue de la Régence 10', 'Liège', '4000',
   'demo-shop-liege');

insert into sales_reps (id, shop_id, display_name, email) values
  ('00000000-0000-0000-0000-000000000100',
   '00000000-0000-0000-0000-000000000010',
   'Marie Dupont',
   'marie@ihpo.example'),
  ('00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000010',
   'Jean Martin',
   'jean@ihpo.example'),
  ('00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000011',
   'Lotte Jansen',
   'lotte@ihpo.example');
