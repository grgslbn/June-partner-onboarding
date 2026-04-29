'use client';

// Schematic preview of what the multi-step form looks like with the current schema.
// Shows field names grouped by step — intentionally not pixel-perfect, just a
// quick at-a-glance sanity check for admins.

import type { PartnerFormSchema } from '@/lib/forms/form-schema';
import { computeSteps } from '@/lib/forms/compute-steps';
import { hasExtraFields } from '@/lib/forms/form-schema';
import { FIELD_DEFINITION_MAP } from '@/lib/forms/field-definitions';

type Props = { schema: PartnerFormSchema };

export function FormFieldsPreview({ schema }: Props) {
  if (!hasExtraFields(schema)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        No extra fields — form renders as single-step (firstName, lastName, email, T&amp;C).
      </div>
    );
  }

  const steps = computeSteps(schema);

  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.index} className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Step {s.index}
          </p>
          {s.index === 1 ? (
            <ul className="space-y-1">
              {['First name', 'Last name', 'Email'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="inline-block h-5 w-full max-w-[180px] rounded bg-gray-100 px-2 text-xs leading-5 text-gray-500">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-1">
              {s.fields.map((key) => {
                const def = FIELD_DEFINITION_MAP[key];
                const cfg = schema.fields[key];
                return (
                  <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block h-5 flex-1 rounded bg-gray-100 px-2 text-xs leading-5 text-gray-500">
                      {def?.label ?? key}
                    </span>
                    {cfg?.required && (
                      <span className="text-xs text-red-500">required</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {s.index === steps.length && (
            <div className="mt-2 rounded bg-gray-800 px-2 py-1 text-center text-xs text-white">
              T&amp;C + Submit
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
