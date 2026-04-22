import { z } from 'zod';

// Shared by client (React Hook Form) and server (route handler re-validation).
export const simpleLeadSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(200),
  tcAccepted: z.literal(true),
});

export type SimpleLeadInput = z.infer<typeof simpleLeadSchema>;
