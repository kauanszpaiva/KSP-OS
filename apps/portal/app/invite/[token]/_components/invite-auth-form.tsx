'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient, isSupabaseConfigured } from '@ksp/database';

/**
 * Sign-in-or-sign-up form shown on the invite page when there is no active
 * session yet. Signup preserves the current invitation path through Supabase's
 * email-confirmation callback so the user returns to the same invite after
 * verifying their email instead of losing the invitation context.
 */
export function InviteAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Supabase is not configured in this environment.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setPending(true);

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      setPending(false);
      if (signInError) {
        setError('Invalid email or password.');
        return;
      }
      router.refresh();
      return;
    }

    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', `${window.location.pathname}${window.location.search}`);
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
    setMessage('Check your email to confirm your account. The confirmation link will bring you back to this invitation.');
  }

  const field =
    'mt-1 w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm text-ksp-carbon outline-none transition-[border-color,box-shadow] duration-fast placeholder:text-ksp-steel/45 focus:border-ksp-signal focus:ring-2 focus:ring-ksp-signal/25';

  return (
    <div className="rounded-xl border border-black/10 bg-white p-7 shadow-card">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-ksp-paper p-1">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError(null);
            setMessage(null);
          }}
          className={`rounded-md py-2 text-[13px] font-semibold transition-colors duration-fast ${mode === 'signin' ? 'bg-ksp-carbon text-white' : 'text-ksp-steel hover:text-ksp-carbon'}`}
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
          className={`rounded-md py-2 text-[13px] font-semibold transition-colors duration-fast ${mode === 'signup' ? 'bg-ksp-carbon text-white' : 'text-ksp-steel hover:text-ksp-carbon'}`}
        >
          Create account
        </button>
      </div>

      {!configured && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn-tint px-3 py-2 text-[13px] text-warn">
          Supabase environment is not set. Configure it to continue.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[12px] font-semibold text-ksp-graphite">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[12px] font-semibold text-ksp-graphite">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </div>
        {error && <p className="text-[13px] text-risk">{error}</p>}
        {message && (
          <p role="status" className="rounded-lg border border-ksp-signal/35 bg-ksp-signal/10 px-3 py-2 text-[13px] leading-5 text-ksp-carbon">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !configured}
          className="w-full rounded-lg bg-ksp-signal px-4 py-2.5 text-sm font-bold text-ksp-carbon transition-[filter,transform] duration-fast hover:brightness-95 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ksp-carbon focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {mode === 'signup' && !message && (
        <p className="mt-3 text-[12px] leading-5 text-ksp-steel">Use the exact email address that received this invitation.</p>
      )}
    </div>
  );
}
