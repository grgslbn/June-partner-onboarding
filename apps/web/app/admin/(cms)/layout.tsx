import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export default async function CmsLayout({ children }: { children: ReactNode }) {
  // Double-check auth at the layout level — proxy is the primary guard, but
  // defence-in-depth catches any matcher misconfiguration.
  await getCurrentProfile();

  const bypassActive = process.env.DEV_AUTH_BYPASS === 'true';

  return (
    <>
      {bypassActive && (
        <div
          role="alert"
          className="sticky top-0 z-50 w-full bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950"
        >
          DEV MODE — auth bypassed. Do not enable in production.
        </div>
      )}
      <div className="flex items-center justify-end border-b border-gray-100 bg-white px-6 py-3">
        <Link href="/admin" aria-label="June CMS — Home" className="opacity-100 hover:opacity-80 transition-opacity">
          <Image
            src="/June_logo_black.svg"
            alt="June Energy"
            width={72}
            height={24}
            style={{ height: 24, width: 'auto' }}
            priority
          />
        </Link>
      </div>
      {children}
    </>
  );
}
