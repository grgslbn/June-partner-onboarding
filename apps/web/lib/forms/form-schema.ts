// PartnerFormSchema: the shape stored in partners.form_schema JSONB.
// An empty fields object means "use the default Simple form" — no extra fields,
// single step, identical to the pre-schema SimpleForm render.

export type FieldKey =
  | 'mobile'
  | 'address'
  | 'business'      // compound: is_business toggle + business_name + business_vat
  | 'iban'          // inline IBAN input (distinct from the deferred IbanForm flow)
  | 'sepa_accepted' // SEPA mandate checkbox — typically paired with iban
  | 'housing_type'
  | 'birth_date'
  | 'billing_frequency'
  | 'product_choice';

export type FieldConfig = {
  visible: boolean;
  required?: boolean;
  step?: number; // 1-based; defaults to step 2 when extra fields are present
};

export type PartnerFormSchema = {
  fields: Partial<Record<FieldKey, FieldConfig>>;
};

export const EMPTY_SCHEMA: PartnerFormSchema = { fields: {} };

export function parseFormSchema(raw: unknown): PartnerFormSchema {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_SCHEMA;
  const obj = raw as Record<string, unknown>;
  const fields = obj['fields'];
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return EMPTY_SCHEMA;
  return { fields: fields as Partial<Record<FieldKey, FieldConfig>> };
}

export function isVisible(schema: PartnerFormSchema, key: FieldKey): boolean {
  return schema.fields[key]?.visible === true;
}

export function isRequired(schema: PartnerFormSchema, key: FieldKey): boolean {
  const cfg = schema.fields[key];
  if (!cfg?.visible) return false;
  return cfg.required === true;
}

export function getStep(schema: PartnerFormSchema, key: FieldKey): number {
  return schema.fields[key]?.step ?? 2;
}

export function hasExtraFields(schema: PartnerFormSchema): boolean {
  return Object.values(schema.fields).some((cfg) => cfg?.visible === true);
}
