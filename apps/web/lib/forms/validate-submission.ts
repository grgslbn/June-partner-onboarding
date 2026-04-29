// Server-side validation against partner form_schema.
// Called AFTER Zod parsing; checks required-ness of configurable fields.
// Returns an array of missing field keys, empty array if valid.

import type { FieldKey, PartnerFormSchema } from './form-schema';
import { isVisible, isRequired } from './form-schema';
import { FIELD_DEFINITIONS } from './field-definitions';

type SubmittedFields = {
  mobile?: string | null;
  address?: { street: string; postal_code: string; city: string } | null;
  is_business?: boolean | null;
  business_name?: string | null;
  business_vat?: string | null;
  iban?: string | null;
  sepa_accepted?: boolean | null;
  housing_type?: string | null;
  birth_date?: string | null;
  billing_frequency?: string | null;
  product_choice?: string | null;
};

function hasValue(key: FieldKey, fields: SubmittedFields): boolean {
  switch (key) {
    case 'mobile':
      return typeof fields.mobile === 'string' && fields.mobile.length > 0;
    case 'address':
      return (
        fields.address !== null &&
        fields.address !== undefined &&
        typeof fields.address.street === 'string' && fields.address.street.length > 0 &&
        typeof fields.address.postal_code === 'string' && fields.address.postal_code.length === 4 &&
        typeof fields.address.city === 'string' && fields.address.city.length > 0
      );
    case 'business':
      // business field is "satisfied" as long as something was submitted — it's a
      // compound toggle; the required check just ensures the field was rendered.
      return fields.is_business !== null && fields.is_business !== undefined;
    case 'iban':
      return typeof fields.iban === 'string' && fields.iban.length > 0;
    case 'sepa_accepted':
      return fields.sepa_accepted === true;
    case 'housing_type':
      return typeof fields.housing_type === 'string' && fields.housing_type.length > 0;
    case 'birth_date':
      return typeof fields.birth_date === 'string' && fields.birth_date.length > 0;
    case 'billing_frequency':
      return typeof fields.billing_frequency === 'string' && fields.billing_frequency.length > 0;
    case 'product_choice':
      return typeof fields.product_choice === 'string' && fields.product_choice.length > 0;
    default:
      return false;
  }
}

export function validateFormFields(
  schema: PartnerFormSchema,
  fields: SubmittedFields,
): FieldKey[] {
  const missing: FieldKey[] = [];
  for (const { key } of FIELD_DEFINITIONS) {
    if (!isVisible(schema, key)) continue;
    if (!isRequired(schema, key)) continue;
    if (!hasValue(key, fields)) missing.push(key);
  }
  // business sub-fields: if is_business=true and business field is required,
  // also require business_name and business_vat.
  if (
    isVisible(schema, 'business') &&
    isRequired(schema, 'business') &&
    fields.is_business === true
  ) {
    if (!fields.business_name || fields.business_name.length === 0) missing.push('business');
    if (!fields.business_vat   || fields.business_vat.length   === 0) missing.push('business');
  }
  return [...new Set(missing)];
}
