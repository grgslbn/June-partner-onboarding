'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Partner } from '../PartnerEditShell';
import { PartnerPreviewCard } from '../PartnerPreviewCard';
import { SaveIndicator } from '../SaveIndicator';
import { useAutosave, type SaveState } from '@/hooks/useAutosave';

type LocaleFields = {
  slogan_fr: string;
  slogan_nl: string;
  trust_badge_fr: string;
  trust_badge_nl: string;
  privacy_url_fr: string;
  privacy_url_nl: string;
  tc_url_fr: string;
  tc_url_nl: string;
};

export function ContentTab({ partner, onSaved }: { partner: Partner; onSaved: (p: Partner) => void }) {
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const sloganI18n     = (partner.slogan_i18n     as Record<string, string>) ?? {};
  const trustBadgeI18n = (partner.trust_badge_i18n as Record<string, string>) ?? {};
  const privacyUrlI18n = (partner.privacy_url_i18n as Record<string, string>) ?? {};
  const tcUrlI18n      = (partner.tc_url_i18n      as Record<string, string>) ?? {};

  const { register, watch } = useForm<LocaleFields>({
    defaultValues: {
      slogan_fr:       sloganI18n.fr     ?? '',
      slogan_nl:       sloganI18n.nl     ?? '',
      trust_badge_fr:  trustBadgeI18n.fr ?? '',
      trust_badge_nl:  trustBadgeI18n.nl ?? '',
      privacy_url_fr:  privacyUrlI18n.fr ?? '',
      privacy_url_nl:  privacyUrlI18n.nl ?? '',
      tc_url_fr:       tcUrlI18n.fr      ?? '',
      tc_url_nl:       tcUrlI18n.nl      ?? '',
    },
  });

  const { save } = useAutosave<Partner>({
    resourcePath: `partners/${partner.id}`,
    onSaved,
    onStateChange: setSaveState,
  });

  const v = watch();

  useEffect(() => {
    save({
      slogan_i18n:      { fr: v.slogan_fr,      nl: v.slogan_nl },
      trust_badge_i18n: { fr: v.trust_badge_fr, nl: v.trust_badge_nl },
      privacy_url_i18n: { fr: v.privacy_url_fr, nl: v.privacy_url_nl },
      tc_url_i18n:      { fr: v.tc_url_fr,      nl: v.tc_url_nl },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.slogan_fr, v.slogan_nl, v.trust_badge_fr, v.trust_badge_nl, v.privacy_url_fr, v.privacy_url_nl, v.tc_url_fr, v.tc_url_nl]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Copy &amp; links</h2>
          <SaveIndicator state={saveState} />
        </div>

        <LocaleSection title="Slogan">
          <TextField label="FR" name="slogan_fr" register={register} />
          <TextField label="NL" name="slogan_nl" register={register} />
        </LocaleSection>

        <LocaleSection title="Trust badge">
          <TextField label="FR" name="trust_badge_fr" register={register} />
          <TextField label="NL" name="trust_badge_nl" register={register} />
        </LocaleSection>

        <LocaleSection title="Privacy URL">
          <TextField label="FR" name="privacy_url_fr" register={register} type="url" />
          <TextField label="NL" name="privacy_url_nl" register={register} type="url" />
        </LocaleSection>

        <LocaleSection title="T&C URL">
          <TextField label="FR" name="tc_url_fr" register={register} type="url" />
          <TextField label="NL" name="tc_url_nl" register={register} type="url" />
        </LocaleSection>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Preview (FR)</h2>
        <PartnerPreviewCard
          name={partner.name}
          logoUrl={partner.logo_url}
          primaryColor={partner.primary_color}
          accentColor={partner.accent_color}
          slogan={v.slogan_fr}
          trustBadge={v.trust_badge_fr}
        />
        <p className="text-xs text-gray-400">Changes appear on the public page within 60 seconds.</p>
      </div>
    </div>
  );
}

function LocaleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <div className="space-y-2 rounded-lg border border-gray-200 p-3">{children}</div>
    </div>
  );
}

function TextField({
  label,
  name,
  register,
  type = 'text',
}: {
  label: string;
  name: keyof LocaleFields;
  register: ReturnType<typeof useForm<LocaleFields>>['register'];
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-xs font-semibold uppercase text-gray-400">{label}</span>
      <input
        type={type}
        {...register(name)}
        className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
