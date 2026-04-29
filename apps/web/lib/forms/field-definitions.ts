// Registry of all configurable fields. Each entry drives the CMS FormFieldsTab
// (label + description shown to admins) and DynamicForm (render order).

import type { FieldKey } from './form-schema';

export type FieldDefinition = {
  key: FieldKey;
  label: string;          // English label shown in CMS
  description: string;    // Short explanation for admins
  alwaysRequired?: boolean; // sepa_accepted is required whenever visible
};

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: 'mobile',
    label: 'Mobile phone',
    description: 'Belgian mobile number (04XX …)',
  },
  {
    key: 'address',
    label: 'Home address',
    description: 'Street + house number, postal code, city. Postal code triggers city autocomplete.',
  },
  {
    key: 'business',
    label: 'Business customer',
    description: 'Toggle "I am a business" — shows company name and VAT number when checked.',
  },
  {
    key: 'housing_type',
    label: 'Housing type',
    description: 'Owner or tenant (affects some energy contracts).',
  },
  {
    key: 'birth_date',
    label: 'Date of birth',
    description: 'Required by some energy suppliers for identity verification.',
  },
  {
    key: 'billing_frequency',
    label: 'Billing frequency',
    description: 'Monthly, bimonthly, or annual billing preference.',
  },
  {
    key: 'product_choice',
    label: 'Product choice',
    description: 'Let the customer pick a product from the list configured below.',
  },
  {
    key: 'iban',
    label: 'IBAN (inline)',
    description: 'Belgian IBAN input collected inline in the form (not the deferred flow).',
  },
  {
    key: 'sepa_accepted',
    label: 'SEPA mandate',
    description: 'SEPA direct-debit consent checkbox — shown alongside IBAN.',
    alwaysRequired: true,
  },
];

export const FIELD_DEFINITION_MAP = Object.fromEntries(
  FIELD_DEFINITIONS.map((d) => [d.key, d]),
) as Record<FieldKey, FieldDefinition>;
