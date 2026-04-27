import { notFound } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { AnalyticsDashboard } from '@/components/cms/analytics/AnalyticsDashboard';

export const metadata = { title: 'Analytics — June CMS' };

export default async function CrossPartnerAnalyticsPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== 'june_admin') notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <AnalyticsDashboard
          partnerName="All partners"
          mode="multi"
        />
      </div>
    </div>
  );
}
