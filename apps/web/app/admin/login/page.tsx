import { LoginForm } from '@/components/cms/LoginForm';

export const metadata = { title: 'Sign in — June CMS' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm border border-gray-200">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">June CMS</h1>
          <p className="text-sm text-gray-500">Sign in with your work email to continue.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
