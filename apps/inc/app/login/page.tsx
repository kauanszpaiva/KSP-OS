'use client';

import { FormEvent, useState } from 'react';
import { getBrowserSupabase } from '../../lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError('KSP INC authentication is not configured in this environment.');
      return;
    }

    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setBusy(false);
      setError('Email or password is invalid.');
      return;
    }
    window.location.assign('/');
  }

  return (
    <main className="authShell">
      <form className="authCard" onSubmit={submit}>
        <div className="eyebrow">KSP INC · Owners only</div>
        <h1>Owner sign in</h1>
        <p>Use the same canonical KSP identity. Access is granted by owner role on the server after authentication.</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>

        <button className="primaryButton" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Continue'}</button>
        {error ? <div className="error" role="alert">{error}</div> : null}
        <div className="notice">Signing in does not itself grant KSP INC access. Non-owner identities fail closed after session validation.</div>
      </form>
    </main>
  );
}
