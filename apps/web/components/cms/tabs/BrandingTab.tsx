'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Partner } from '../PartnerEditShell';
import { PartnerPreviewCard } from '../PartnerPreviewCard';
import { SaveIndicator } from '../SaveIndicator';
import { useAutosave, type SaveState } from '@/hooks/useAutosave';

type FormValues = {
  primary_color: string;
  accent_color: string;
  tertiary_color: string;
  success_color: string;
  danger_color: string;
  muted_text_color: string;
};

export function BrandingTab({ partner, onSaved }: { partner: Partner; onSaved: (p: Partner) => void }) {
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const { register, watch } = useForm<FormValues>({
    defaultValues: {
      primary_color:    partner.primary_color ?? '#E53935',
      accent_color:     partner.accent_color ?? '#FFFFFF',
      tertiary_color:   partner.tertiary_color ?? '#000000',
      success_color:    partner.success_color ?? '#16A34A',
      danger_color:     partner.danger_color ?? '#DC2626',
      muted_text_color: partner.muted_text_color ?? '#6B7280',
    },
  });

  const { save } = useAutosave<Partner>({
    resourcePath: `partners/${partner.id}`,
    onSaved,
    onStateChange: setSaveState,
  });

  const values = watch();

  // Autosave on any field change
  useEffect(() => {
    const patch: Record<string, unknown> = {
      primary_color:    values.primary_color    || '#E53935',
      accent_color:     values.accent_color     || '#FFFFFF',
      tertiary_color:   values.tertiary_color   || null,
      success_color:    values.success_color    || null,
      danger_color:     values.danger_color     || null,
      muted_text_color: values.muted_text_color || null,
    };
    save(patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.primary_color, values.accent_color, values.tertiary_color, values.success_color, values.danger_color, values.muted_text_color]);

  const sloganI18n = partner.slogan_i18n as Record<string, string> | null;
  const previewSlogan = (partner.default_locale && sloganI18n?.[partner.default_locale]) ?? '';

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Brand colours</h2>
          <SaveIndicator state={saveState} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorField label="Primary" name="primary_color" register={register} />
          <ColorField label="Accent" name="accent_color" register={register} />
          <ColorField label="Tertiary" name="tertiary_color" register={register} optional />
          <ColorField label="Success" name="success_color" register={register} optional />
          <ColorField label="Danger" name="danger_color" register={register} optional />
          <ColorField label="Muted text" name="muted_text_color" register={register} optional />
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Preview</h2>
        <PartnerPreviewCard
          name={partner.name}
          logoUrl={partner.logo_url}
          primaryColor={values.primary_color || '#E53935'}
          accentColor={values.accent_color || '#FFFFFF'}
          slogan={previewSlogan}
          trustBadge=""
        />
        <p className="text-xs text-gray-400">Changes appear on the public page within 60 seconds.</p>
      </div>
    </div>
  );
}

function ColorField({
  label,
  name,
  register,
  optional,
}: {
  label: string;
  name: keyof FormValues;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  optional?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{optional && <span className="ml-1 text-xs text-gray-400">(optional)</span>}
      </label>
      <div className="flex items-center gap-2">
        <input type="color" {...register(name)} className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0.5" />
        <input
          type="text"
          {...register(name)}
          placeholder="#000000"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
