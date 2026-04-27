import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export const metadata = { title: 'Dashboard — June CMS' };

export default async function AdminDashboardPage() {
  const { user, profile } = await getCurrentProfile();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg space-y-6 rounded-xl bg-white p-8 shadow-sm border border-gray-200">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">June CMS</h1>
          <p className="text-sm text-gray-500">Welcome back</p>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-gray-900">{user.email}</p>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {profile.role}
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-500">
          {profile.role === 'june_admin' ? (
            <p>
              You have full access. Partners CRUD, shops, reps, analytics, and
              cross-partner views are coming in Briefings 13–17.
            </p>
          ) : (
            <p>
              You have access to your partner configuration. More features are
              coming soon.
            </p>
          )}
        </div>

        <form action="/admin/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
