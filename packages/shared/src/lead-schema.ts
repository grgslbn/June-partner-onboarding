import { z } from 'zod';

// Client-side form fields (RHF + zodResolver).
export const simpleLeadSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(200),
  tcAccepted: z.literal(true),
});

export type SimpleLeadInput = z.infer<typeof simpleLeadSchema>;

const addressSchema = z.object({
  street:      z.string().min(1).max(200),
  postal_code: z.string().min(4).max(4).regex(/^\d{4}$/),
  city:        z.string().min(1).max(100),
});

// API submit: client fields + attribution + locale + honeypot + configurable fields.
export const simpleLeadSubmitSchema = simpleLeadSchema.extend({
  partnerSlug: z.string().min(1).max(80),
  shopToken: z.string().min(1).max(200).nullable().optional(),
  salesRepId: z.string().uuid().nullable().optional(),
  locale: z.enum(['nl', 'fr', 'en']),
  honeypot: z.string().nullable().optional(),
  discountCode: z.string().min(1).max(32).nullable().optional(),
  promoCode: z.string().min(1).max(200).nullable().optional(),
  // Configurable form fields (all optional at schema level; server validates required-ness
  // against partner.form_schema after parsing).
  mobile:           z.string().min(1).max(20).nullable().optional(),
  address:          addressSchema.nullable().optional(),
  is_business:      z.boolean().nullable().optional(),
  business_name:    z.string().min(1).max(200).nullable().optional(),
  business_vat:     z.string().min(1).max(50).nullable().optional(),
  iban:             z.string().min(1).max(34).nullable().optional(),
  sepa_accepted:    z.boolean().nullable().optional(),
  housing_type:     z.string().min(1).max(50).nullable().optional(),
  birth_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  billing_frequency: z.string().min(1).max(50).nullable().optional(),
  product_choice:   z.string().min(1).max(200).nullable().optional(),
});

export type SimpleLeadSubmit = z.infer<typeof simpleLeadSubmitSchema>;

// Matches the events.event_type check constraint in migration 20260422150000.
export const eventTypeSchema = z.enum([
  'landing_view',
  'rep_selected',
  'form_started',
  'step_completed',
  'form_submitted',
  'email_opened',
  'deferred_completed',
]);

export type EventType = z.infer<typeof eventTypeSchema>;

export const eventPingSchema = z.object({
  eventType: eventTypeSchema,
  partnerSlug: z.string().min(1).max(80),
  shopToken: z.string().min(1).max(200).nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
  sessionId: z.string().max(200).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type EventPing = z.infer<typeof eventPingSchema>;
