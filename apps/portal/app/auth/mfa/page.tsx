'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@ksp/database';

export default function MfaPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    checkMfaStatus();
  }, [supabase]);

  async function checkMfaStatus() {
    setLoading(true);

    // Check assurance level
    const { data: aal, error: aalError } = await supabase!.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      setError('Could not verify authentication level.');
      setLoading(false);
      return;
    }

    if (aal.currentLevel === 'aal2') {
      // Already verified, redirect
      router.push('/home');
      return;
    }

    // Check if they have enrolled factors
    const { data: factors, error: factorsError } = await supabase!.auth.mfa.listFactors();
    if (factorsError) {
      setError('Could not fetch MFA factors.');
      setLoading(false);
      return;
    }

    const totpFactors = factors.totp || [];
    if (totpFactors.length === 0) {
      // Needs enrollment
      setNeedsEnrollment(true);
      await startEnrollment();
    } else {
      // Has factor, needs challenge
      setNeedsChallenge(true);
      await startChallenge(totpFactors[0].id);
    }
  }

  async function startEnrollment() {
    const { data, error } = await supabase!.auth.mfa.enroll({ factorType: 'totp' });
    if (error) {
      setError('Failed to start MFA enrollment.');
      setLoading(false);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setLoading(false);
  }

  async function startChallenge(factorId: string) {
    const { data, error } = await supabase!.auth.mfa.challenge({ factorId });
    if (error) {
      setError('Failed to start MFA challenge.');
      setLoading(false);
      return;
    }
    setFactorId(factorId);
    setChallengeId(data.id);
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (needsEnrollment) {
      // Verify enrollment
      const { data, error } = await supabase!.auth.mfa.challengeAndVerify({
        factorId: factorId!,
        code: verifyCode
      });
      if (error) {
        setError('Invalid code. Please try again.');
        setLoading(false);
        return;
      }
    } else if (needsChallenge) {
      // Verify challenge
      const { data, error } = await supabase!.auth.mfa.verify({
        factorId: factorId!,
        challengeId: challengeId!,
        code: verifyCode
      });
      if (error) {
        setError('Invalid code. Please try again.');
        setLoading(false);
        return;
      }
    }

    router.push('/home');
    router.refresh();
  }

  if (loading && !needsEnrollment && !needsChallenge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-[13px] text-ink-3">Checking security requirements...</p>
      </main>
    );
  }

  const field =
    'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-fast focus:border-brand focus:outline-none focus:shadow-focus';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm animate-fade-slide-up">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-ink">KSP</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Security</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-[22px] font-semibold text-ink">
            {needsEnrollment ? 'Set up Two-Factor Auth' : 'Two-Factor Authentication'}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {needsEnrollment
              ? 'Scan the QR code with your authenticator app and enter the code below.'
              : 'Enter the code from your authenticator app to continue.'}
          </p>

          {needsEnrollment && qrCode && (
            <div className="mt-6 flex justify-center rounded-lg border border-line-2 bg-white p-4">
              <img src={qrCode} alt="QR Code" className="h-48 w-48" />
            </div>
          )}

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div>
              <label htmlFor="code" className="block text-[12px] font-medium text-ink-2">Verification Code</label>
              <input
                id="code"
                type="text"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className={field}
              />
            </div>

            {error && <p className="text-[13px] text-risk">{error}</p>}

            <button
              type="submit"
              disabled={loading || verifyCode.length < 6}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
