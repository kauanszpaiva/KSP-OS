'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@ksp/database';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function resolveEntry() {
      const supabase = createBrowserClient();
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const recoveryType = hash.get('type');
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const code = url.searchParams.get('code');

      try {
        if (supabase && recoveryType === 'recovery' && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          window.history.replaceState({}, '', '/');
          if (!error && !cancelled) {
            router.replace('/account/update-password');
            router.refresh();
            return;
          }
        }

        if (supabase && code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          window.history.replaceState({}, '', '/');
          if (!error && !cancelled) {
            router.replace('/account/update-password');
            router.refresh();
            return;
          }
        }
      } catch {
        // Fall through to the normal authenticated entry point. Middleware and
        // the destination route will enforce the actual session state.
      }

      if (!cancelled) {
        router.replace('/home');
        router.refresh();
      }
    }

    void resolveEntry();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <p className="text-sm text-ink-3">Opening KSP Command…</p>
    </main>
  );
}
