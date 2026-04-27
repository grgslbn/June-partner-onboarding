'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Database } from '@june/db';
import { BrandingTab } from './tabs/BrandingTab';
import { ContentTab } from './tabs/ContentTab';
import { SettingsTab } from './tabs/SettingsTab';
import { LogoTab } from './tabs/LogoTab';

export type Partner = Database['public']['Tables']['partners']['Row'];

type Tab = 'branding' | 'content' | 'settings' | 'logo';

const TABS: { id: Tab; label: string }[] = [
  { id: 'branding', label: 'Branding' },
  { id: 'content', label: 'Content' },
  { id: 'settings', label: 'Settings' },
  { id: 'logo', label: 'Logo' },
];

const STATUS_STYLES: Record<string, string> = {
  draft:  'bg-yellow-100 text-yellow-800 border border-yellow-200',
  review: 'bg-blue-100 text-blue-800 border border-blue-200',
  live:   'bg-green-100 text-green-800 border border-green-200',
};

const STATUS_BANNER: Record<string, string> = {
  draft:  'bg-yellow-50 border-b border-yellow-200 text-yellow-900',
  review: 'bg-blue-50 border-b border-blue-200 text-blue-900',
  live:   'bg-green-50 border-b border-green-200 text-green-900',
};

const STATUS_MESSAGES: Record<string, string> = {
  draft:  'Draft — this partner is not visible to customers.',
  review: 'In review — awaiting approval before going live.',
  live:   'Live — this partner is visible to customers.',
};

export function PartnerEditShell({ partner }: { partner: Partner }) {
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [currentPartner, setCurrentPartner] = useState<Partner>(partner);

  const status = currentPartner.content_status ?? 'draft';

  function handleSaved(updated: Partner) {
    setCurrentPartner(updated);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Status banner */}
      <div className={`px-6 py-2.5 text-sm font-medium ${STATUS_BANNER[status] ?? STATUS_BANNER.draft}`}>
        {STATUS_MESSAGES[status] ?? STATUS_MESSAGES.draft}
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/partners" className="text-sm text-gray-500 hover:text-gray-700">
              ← Partners
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">{currentPartner.name}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
                {status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/partners/${currentPartner.id}/analytics`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Analytics →
            </Link>
            <Link
              href={`/admin/partners/${currentPartner.id}/shops`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Manage shops →
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab panels */}
        {activeTab === 'branding' && (
          <BrandingTab partner={currentPartner} onSaved={handleSaved} />
        )}
        {activeTab === 'content' && (
          <ContentTab partner={currentPartner} onSaved={handleSaved} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab partner={currentPartner} onSaved={handleSaved} />
        )}
        {activeTab === 'logo' && (
          <LogoTab partner={currentPartner} onSaved={handleSaved} />
        )}
      </div>
    </div>
  );
}
