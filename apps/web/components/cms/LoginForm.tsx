'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type Props = { bypassEnabled?: boolean };

export function LoginForm({ bypassEnabled = false }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Dev bypass: single button, no email needed ──────────────────────────
  if (bypassEnabled) {
    return (
      <DevLoginButton />
    );
  }

  // ── Normal magic-link flow ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/auth/callback`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }

    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">Check your inbox</p>
        <p className="text-sm text-gray-500">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@june-energy.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  );
}

function DevLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDevLogin() {
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/auth/dev-login', { method: 'POST' });

    if (!res.ok) {
      setLoading(false);
      setError(`Dev login failed (${res.status})`);
      return;
    }

    // Endpoint redirects — browser follows automatically when res.redirected.
    // If fetch followed the redirect, navigate to the final URL.
    if (res.redirected) {
      window.location.href = res.url;
    } else {
      window.location.href = '/admin';
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleDevLogin}
        disabled={loading}
        className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in as dev admin'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
