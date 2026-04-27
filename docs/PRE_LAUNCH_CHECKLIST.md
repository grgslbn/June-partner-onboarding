# Pre-launch checklist

## Per-partner checklist (before any partner goes live)

- [ ] Partner row created in CMS (`/admin/partners`)
- [ ] `content_status` set to `live`
- [ ] Primary and accent colours verified against partner brand guide
- [ ] Logo uploaded and renders correctly on the public landing page
- [ ] FR and NL slogans populated (or at least default locale)
- [ ] T&C URL set for each enabled locale
- [ ] Privacy URL set for each enabled locale
- [ ] Trust badge copy verified with partner
- [ ] `active` toggled on
- [ ] Public page smoke-tested: `/[locale]/p/[slug]` loads correctly on desktop + mobile
- [ ] Supabase Auth: partner admin user provisioned via Admin Auth API (if partner_admin role needed)
- [ ] `emailRedirectTo` for magic-link confirmed in Supabase Auth allowed-URLs list

## Per-discount-code checklist

- [ ] Code communicated to all relevant sales reps
- [ ] Validity window confirmed with partner marketing
- [ ] Max uses set to a finite number if budget-constrained
- [ ] Test the code in the public form before sharing externally

## Per-shop checklist (before any shop's QR is printed and distributed)

- [ ] Shop name, address, zip, city verified by partner
- [ ] At least one active sales rep assigned to this shop (Briefing 15)
- [ ] QR code printed at minimum 50 mm × 50 mm size (anything smaller is unreliable on phone cameras)
- [ ] QR code tested by scanning with iPhone Safari + Android Chrome — confirms partner landing loads correctly
- [ ] Printed leaflet reviewed against partner's brand standards
