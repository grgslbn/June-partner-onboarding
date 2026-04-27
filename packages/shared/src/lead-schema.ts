import { z } from 'zod';

// Client-side form fields (RHF + zodResolver).
export const simpleLeadSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(200),
  tcAccepted: z.literal(true),
});

export type SimpleLeadInput = z.infer<typeof simpleLeadSchema>;

// API submit: client fields + attribution + locale + honeypot.
export const simpleLeadSubmitSchema = simpleLeadSchema.extend({
  partnerSlug: z.string().min(1).max(80),
  shopToken: z.string().min(1).max(200).nullable().optional(),
  salesRepId: z.string().uuid().nullable().optional(),
  locale: z.enum(['nl', 'fr', 'en']),
  honeypot: z.string().nullable().optional(),
  discountCode: z.string().min(1).max(32).nullable().optional(),
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
