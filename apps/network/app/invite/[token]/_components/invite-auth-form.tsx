'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient, isSupabaseConfigured } from '@ksp/database';

export function NetworkInviteAuthForm({ token }: { token: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const supabase = createBrowserClient();
    if (!supabase) {
      setError('KSP Network is not configured in this environment.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setPending(true);

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      setPending(false);
      if (signInError) {
        setError('Invalid email or password.');
        return;
      }
      router.refresh();
      return;
    }

    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', window.location.pathname + window.location.search);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { emailRedirectTo: callbackUrl.toString() }
    });
    setPending(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.refresh();
      return;
    }

    setPassword('');
    setMessage('Check your email to confirm your account. The confirmation link will return you to this invitation.');
  }

  const field =
    'mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError(null);
            setMessage(null);
          }}
          className={mode === 'signin' ? 'rounded-md bg-ink py-2 text-xs font-semibold text-on-brand' : 'rounded-md py-2 text-xs font-semibold text-muted'}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setError(null);
            setMessage(null);
          }}
          className={mode === 'signup' ? 'rounded-md bg-ink py-2 text-xs font-semibold text-on-brand' : 'rounded-md py-2 text-xs font-semibold text-muted'}
        >
          Create account
        </button>
      </div>

      {!configured && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn-tint px-3 py-2 text-sm text-warn">
          Supabase environment is not set. Configure it to continue.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-xs font-medium text-ink-2">
          Email
          <input
            className={field}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-ink-2">
          Password
          <input
            className={field}
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="text-sm text-risk">{error}</p>}
        {message && (
          <p role="status" className="rounded-lg border border-brand/25 bg-brand-tint px-3 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !configured}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {mode === 'signup' && !message && (
        <p className="mt-3 text-xs leading-5 text-muted">Use the exact email address that received this invitation.</p>
      )}
    </div>
  );
}
