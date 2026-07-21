'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient, isSupabaseConfigured } from '@ksp/database';

export default function LoginPage() {
  const router = useRouter();
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError('Invalid email or password.');
      return;
    }
    router.push('/pulse');
    router.refresh();
  }

  const field = 'mt-1 w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-ink focus:border-brand';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-ink">KSP</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3">Dominion OS</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-[22px] font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-[13px] text-ink-3">Governed internal operating system.</p>

          {!configured && (
            <p className="mt-4 rounded-md border border-warn/30 bg-warn-tint px-3 py-2 text-[13px] text-warn">
              Supabase environment is not set. Configure it to sign in — see the local setup runbook.
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-[12px] font-medium text-ink-2">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="password" className="block text-[12px] font-medium text-ink-2">Password</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </div>
            {error && <p className="text-[13px] text-risk">{error}</p>}
            <button
              type="submit"
              disabled={pending || !configured}
              className="w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
