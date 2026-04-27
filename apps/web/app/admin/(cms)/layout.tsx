import type { ReactNode } from 'react';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export default async function CmsLayout({ children }: { children: ReactNode }) {
  // Double-check auth at the layout level — proxy is the primary guard, but
  // defence-in-depth catches any matcher misconfiguration.
  await getCurrentProfile();

  return <>{children}</>;
}
