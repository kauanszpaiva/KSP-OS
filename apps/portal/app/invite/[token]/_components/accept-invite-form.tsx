'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { acceptPortalInvitation, type ActionResult } from '../../../actions';

const initial: ActionResult = { ok: false };

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(acceptPortalInvitation, initial);

  useEffect(() => {
    if (state.ok) {
      router.push('/home');
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
      <p className="text-[13px] text-ink-2">
        Signed in as <span className="font-medium text-ink">{email}</span>.
      </p>
      <p className="mt-1 text-[13px] text-ink-3">Accept this invitation to activate your access to the client portal.</p>
      <form action={action} className="mt-5">
        <input type="hidden" name="token" value={token} />
        {!state.ok && state.error && <p className="mb-3 text-[13px] text-risk">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? 'Accepting…' : 'Accept invitation'}
        </button>
      </form>
    </div>
  );
}
