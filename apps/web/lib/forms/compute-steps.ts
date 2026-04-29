// Pure function: given a form schema, return the ordered list of steps.
// Step 1 always contains the core fields (firstName, lastName, email).
// Visible extra fields are grouped into steps ≥2 based on their step config.
// tcAccepted always appears on the LAST step, just before the submit button.

import type { FieldKey, PartnerFormSchema } from './form-schema';
import { isVisible, getStep } from './form-schema';
import { FIELD_DEFINITIONS } from './field-definitions';

export type Step = {
  index: number;   // 1-based
  fields: FieldKey[];
};

export function computeSteps(schema: PartnerFormSchema): Step[] {
  const visibleKeys = FIELD_DEFINITIONS
    .map((d) => d.key)
    .filter((key) => isVisible(schema, key));

  if (visibleKeys.length === 0) {
    // Empty schema: single step with just core fields (tcAccepted lives here too).
    return [{ index: 1, fields: [] }];
  }

  // Group visible keys by their configured step (≥2).
  const byStep = new Map<number, FieldKey[]>();
  for (const key of visibleKeys) {
    const s = Math.max(2, getStep(schema, key));
    if (!byStep.has(s)) byStep.set(s, []);
    byStep.get(s)!.push(key);
  }

  const extraSteps = [...byStep.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, fields], i) => ({ index: i + 2, fields }));

  return [{ index: 1, fields: [] }, ...extraSteps];
}

export function totalSteps(schema: PartnerFormSchema): number {
  return computeSteps(schema).length;
}
