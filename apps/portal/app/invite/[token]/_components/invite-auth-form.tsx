'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient, isSupabaseConfigured } from '@ksp/database';

/**
 * Sign-in-or-sign-up form shown on the invite page when there is no active
 * session yet. On success, refreshes the route so the server component
 * re-renders authenticated and shows the accept-confirmation UI.
 */
export function InviteAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Supabase is not configured in this environment.');
      return;
    }
    setPending(true);
    const { error: authError } =
      mode === 'signin' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setPending(false);
    if (authError) {
      setError(mode === 'signin' ? 'Invalid email or password.' : authError.message);
      return;
    }
    router.refresh();
  }

  const field =
    'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink transition-colors duration-fast focus:border-brand focus:outline-none focus:shadow-focus';

  return (
    <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
      <div className="mb-5 flex gap-1 rounded-lg bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors duration-fast ${mode === 'signin' ? 'bg-surface text-ink shadow-card' : 'text-ink-3'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors duration-fast ${mode === 'signup' ? 'bg-surface text-ink shadow-card' : 'text-ink-3'}`}
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
          <label htmlFor="email" className="block text-[12px] font-medium text-ink-2">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="password" className="block text-[12px] font-medium text-ink-2">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </div>
        {error && <p className="text-[13px] text-risk">{error}</p>}
        <button
          type="submit"
          disabled={pending || !configured}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100"
        >
          {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {mode === 'signup' && (
        <p className="mt-3 text-[12px] text-ink-3">Use the same email address the invitation was sent to.</p>
      )}
    </div>
  );
}
