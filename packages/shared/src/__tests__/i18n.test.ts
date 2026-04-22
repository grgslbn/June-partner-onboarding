import { describe, expect, test } from 'vitest';
import { getPartnerCopy } from '../i18n';

const partner = {
  default_locale: 'fr',
  slogan_i18n: { nl: 'Groene energie', fr: 'Énergie verte', en: 'Green energy' },
  tc_url_i18n: { fr: 'https://example.com/cgv' },
  confirmation_email_subject_i18n: {},
};

describe('getPartnerCopy', () => {
  test('returns the value for the requested locale when present', () => {
    expect(getPartnerCopy(partner, 'nl', 'slogan_i18n')).toBe('Groene energie');
    expect(getPartnerCopy(partner, 'fr', 'slogan_i18n')).toBe('Énergie verte');
    expect(getPartnerCopy(partner, 'en', 'slogan_i18n')).toBe('Green energy');
  });

  test('falls back to partner.default_locale when the requested locale is missing', () => {
    expect(getPartnerCopy(partner, 'nl', 'tc_url_i18n')).toBe('https://example.com/cgv');
    expect(getPartnerCopy(partner, 'en', 'tc_url_i18n')).toBe('https://example.com/cgv');
  });

  test('returns empty string when the field has no values', () => {
    expect(getPartnerCopy(partner, 'fr', 'confirmation_email_subject_i18n')).toBe('');
  });

  test('returns empty string when the field is null or undefined', () => {
    const p = { default_locale: 'fr', missing: null as unknown } as const;
    expect(getPartnerCopy(p, 'fr', 'missing')).toBe('');
  });
});
