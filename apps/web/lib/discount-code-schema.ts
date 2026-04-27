import { z } from 'zod';

export const discountCodeSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Code is required')
      .max(32, 'Max 32 characters')
      .regex(/^[A-Z0-9-]+$/, 'Only letters, digits, and dashes — no spaces'),
    type: z.enum(['fixed_eur', 'percent']),
    amount: z.number().min(0, 'Amount must be ≥ 0'),
    valid_from: z.string().nullable().optional(),
    valid_to:   z.string().nullable().optional(),
    max_uses:   z.number().int().min(1).nullable().optional(),
    active:     z.boolean().default(true),
  })
  .refine(
    (d) => d.type !== 'percent' || d.amount <= 100,
    { message: 'Percentage discount cannot exceed 100%', path: ['amount'] },
  )
  .refine(
    (d) => d.type !== 'fixed_eur' || d.amount <= 10000,
    { message: 'Fixed discount cannot exceed €10,000', path: ['amount'] },
  );

export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;
