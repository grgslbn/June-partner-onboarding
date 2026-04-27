'use client';

import { contrastForeground } from '@june/shared';

export type PartnerPreviewProps = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  slogan: string;
  trustBadge: string;
};

export function PartnerPreviewCard({
  name,
  logoUrl,
  primaryColor,
  accentColor,
  slogan,
  trustBadge,
}: PartnerPreviewProps) {
  const fg = contrastForeground(primaryColor);

  return (
    <div className="overflow-hidden rounded-xl shadow-md" style={{ backgroundColor: primaryColor, color: fg }}>
      <div className="flex flex-col items-center gap-4 px-6 py-8">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="h-14 w-auto object-contain" />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
            style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
          >
            {name.charAt(0)}
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">{name}</p>
          {slogan && <p className="text-sm opacity-80">{slogan}</p>}
        </div>

        {trustBadge && (
          <div
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
          >
            {trustBadge}
          </div>
        )}

        <div className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-center text-sm">
          Onboarding form will appear here
        </div>
      </div>
    </div>
  );
}
