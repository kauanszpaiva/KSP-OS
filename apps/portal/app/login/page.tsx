'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient, isSupabaseConfigured } from '@ksp/database';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
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
    setPending(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError('Invalid email or password.');
      return;
    }
    router.push('/home');
    router.refresh();
  }

  async function sendPasswordRecovery() {
    setError(null);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }

    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Supabase is not configured in this environment.');
      return;
    }

    setRecoveryPending(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/account/update-password`;
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    setRecoveryPending(false);

    if (recoveryError) {
      setError('We could not send the password setup email. Please try again or contact KSP.');
      return;
    }

    setMessage('Check your email for a secure link to choose your password.');
  }

  const field =
    'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-fast focus:border-brand focus:outline-none focus:shadow-focus';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm animate-fade-slide-up">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
              <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-ink">KSP</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Client Portal</span>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-[22px] font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-[13px] text-ink-3">Access your projects, approvals, files, and invoices.</p>

          {!configured && (
            <p className="mt-4 rounded-lg border border-warn/30 bg-warn-tint px-3 py-2 text-[13px] text-warn">
              Supabase environment is not set. Configure it to sign in — see the local setup runbook.
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-[12px] font-medium text-ink-2">Email</label>
              <input id="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="block text-[12px] font-medium text-ink-2">Password</label>
                <button
                  type="button"
                  onClick={() => void sendPasswordRecovery()}
                  disabled={recoveryPending || !configured}
                  className="text-[12px] font-medium text-brand hover:text-brand-strong disabled:opacity-50"
                >
                  {recoveryPending ? 'Sending…' : 'Set / forgot password'}
                </button>
              </div>
              <input id="password" type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </div>
            {error && <p className="text-[13px] text-risk">{error}</p>}
            {message && <p className="rounded-lg border border-brand/25 bg-brand-tint px-3 py-2 text-[13px] text-brand">{message}</p>}
            <button
              type="submit"
              disabled={pending || !configured}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
