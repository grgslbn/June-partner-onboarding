'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Partner } from '../PartnerEditShell';
import { SaveIndicator } from '../SaveIndicator';
import { useAutosave, type SaveState } from '@/hooks/useAutosave';
import {
  parseFormSchema,
  type FieldKey,
  type PartnerFormSchema,
} from '@/lib/forms/form-schema';
import { FIELD_DEFINITIONS } from '@/lib/forms/field-definitions';
import { FormFieldsPreview } from './FormFieldsPreview';

type FieldRowValues = {
  visible: boolean;
  required: boolean;
  step: number;
};

type ProductChoice = {
  id: string;
  labelFr: string;
  labelNl: string;
  labelEn: string;
};

type FormValues = {
  fields: Record<FieldKey, FieldRowValues>;
  productChoicesRaw: string; // JSON textarea for product_choices
};

function schemaToFormValues(schema: PartnerFormSchema): Record<FieldKey, FieldRowValues> {
  const result = {} as Record<FieldKey, FieldRowValues>;
  for (const { key } of FIELD_DEFINITIONS) {
    const cfg = schema.fields[key];
    result[key] = {
      visible: cfg?.visible ?? false,
      required: cfg?.required ?? false,
      step: cfg?.step ?? 2,
    };
  }
  return result;
}

function formValuesToSchema(fields: Record<FieldKey, FieldRowValues>): PartnerFormSchema {
  const out: PartnerFormSchema = { fields: {} };
  for (const { key } of FIELD_DEFINITIONS) {
    const row = fields[key];
    if (row?.visible) {
      out.fields[key] = {
        visible: true,
        required: row.required,
        step: row.step,
      };
    }
  }
  return out;
}

export function FormFieldsTab({
  partner,
  onSaved,
}: {
  partner: Partner;
  onSaved: (p: Partner) => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const schema = parseFormSchema(partner.form_schema);
  const defaultProductChoicesRaw = partner.product_choices
    ? JSON.stringify(partner.product_choices, null, 2)
    : '[]';

  const { register, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      fields: schemaToFormValues(schema),
      productChoicesRaw: defaultProductChoicesRaw,
    },
  });

  const { save } = useAutosave<Partner>({
    resourcePath: `partners/${partner.id}`,
    onSaved,
    onStateChange: setSaveState,
  });

  const v = watch();
  const liveSchema = formValuesToSchema(v.fields);

  useEffect(() => {
    let productChoices: unknown = null;
    try {
      productChoices = JSON.parse(v.productChoicesRaw);
    } catch {
      // invalid JSON — don't save product_choices this tick
      productChoices = partner.product_choices ?? null;
    }
    save({
      form_schema: liveSchema as unknown as Partner['form_schema'],
      product_choices: productChoices as Partner['product_choices'],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(liveSchema), v.productChoicesRaw]);

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Left: field config */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Form fields</h2>
          <SaveIndicator state={saveState} />
        </div>

        <p className="text-sm text-gray-500">
          Toggle fields on/off and choose which step they appear on. Step 1 always contains first name, last name, and email. T&amp;C always appears on the last step.
        </p>

        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            <span>Field</span>
            <span className="w-16 text-center">Visible</span>
            <span className="w-20 text-center">Required</span>
            <span className="w-16 text-center">Step</span>
          </div>

          {FIELD_DEFINITIONS.map(({ key, label, description, alwaysRequired }) => {
            const isVisible = v.fields[key]?.visible ?? false;
            return (
              <div
                key={key}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-start gap-3 rounded-lg border p-3 transition-colors ${isVisible ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>

                <div className="flex w-16 justify-center pt-0.5">
                  <input
                    type="checkbox"
                    {...register(`fields.${key}.visible`)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </div>

                <div className="flex w-20 justify-center pt-0.5">
                  <input
                    type="checkbox"
                    disabled={!isVisible || alwaysRequired}
                    checked={alwaysRequired ? true : (v.fields[key]?.required ?? false)}
                    {...register(`fields.${key}.required`)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:opacity-40"
                  />
                </div>

                <div className="flex w-16 justify-center">
                  <select
                    disabled={!isVisible}
                    {...register(`fields.${key}.step`, { valueAsNumber: true })}
                    className="w-14 rounded border border-gray-300 px-1 py-1 text-center text-sm focus:border-blue-500 focus:outline-none disabled:opacity-40"
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Product choices */}
        <div className="space-y-2 border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700">
            Product choices (JSON)
          </label>
          <p className="text-xs text-gray-500">
            Array of <code>{'{ id, label_i18n: { fr, nl, en } }'}</code> objects. Used by the "Product choice" field.
          </p>
          <textarea
            rows={8}
            placeholder={'[\n  { "id": "basic", "label_i18n": { "fr": "Basique", "nl": "Basis", "en": "Basic" } }\n]'}
            {...register('productChoicesRaw')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Right: live schema preview */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Form preview</h3>
        <FormFieldsPreview schema={liveSchema} />
      </div>
    </div>
  );
}
