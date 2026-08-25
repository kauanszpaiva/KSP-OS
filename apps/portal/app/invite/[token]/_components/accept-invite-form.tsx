'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { acceptPortalInvitation, type ActionResult } from '../../../actions';

const initial: ActionResult = { ok: false };

export interface InvitationPreview {
  clientOrganizationName: string | null;
  initialRole: string;
  expiresAt: string;
  status: string;
}

const ROLE_LABELS: Record<string, string> = {
  client_owner: 'Workspace owner',
  client_project_approver: 'Project approver',
  client_billing_contact: 'Billing contact',
  client_collaborator: 'Collaborator',
  client_viewer: 'Viewer'
};

const BLOCKED_STATUS_MESSAGES: Record<string, string> = {
  revoked: 'This invitation has been revoked. Ask KSP to send a new one.',
  accepted: 'This invitation has already been accepted. Sign in from the portal home instead.',
  expired: 'This invitation has expired. Ask KSP to send a new one.'
};

function formatExpiry(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function AcceptInviteForm({ token, email, preview }: { token: string; email: string; preview?: InvitationPreview | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(acceptPortalInvitation, initial);

  useEffect(() => {
    if (state.ok) {
      router.push('/home');
      router.refresh();
    }
  }, [state.ok, router]);

  const blockedMessage = preview ? BLOCKED_STATUS_MESSAGES[preview.status] : undefined;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-7 shadow-card">
      <p className="text-[13px] text-ksp-steel">
        Signed in as <span className="font-semibold text-ksp-carbon">{email}</span>.
      </p>

      {preview && (
        <dl className="mt-4 space-y-2 rounded-lg border border-black/10 bg-ksp-paper px-4 py-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ksp-steel">Workspace</dt>
            <dd className="font-semibold text-ksp-carbon">{preview.clientOrganizationName ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ksp-steel">Your role</dt>
            <dd className="font-semibold text-ksp-carbon">{ROLE_LABELS[preview.initialRole] ?? preview.initialRole}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ksp-steel">Valid until</dt>
            <dd className="tnum font-semibold text-ksp-carbon">{formatExpiry(preview.expiresAt)}</dd>
          </div>
        </dl>
      )}

      {blockedMessage ? (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn-tint px-3 py-2 text-[13px] text-warn">{blockedMessage}</p>
      ) : (
        <>
          <p className="mt-3 text-[13px] leading-5 text-ksp-steel">Accept this invitation to activate your client workspace access.</p>
          <form action={action} className="mt-5">
            <input type="hidden" name="token" value={token} />
            {!state.ok && state.error && <p className="mb-3 text-[13px] text-risk">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-ksp-signal px-4 py-2.5 text-sm font-bold text-ksp-carbon transition-[filter,transform] duration-fast hover:brightness-95 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ksp-carbon focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {pending ? 'Accepting…' : 'Accept invitation'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
