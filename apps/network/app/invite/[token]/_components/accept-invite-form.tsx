'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { acceptPartnerInvitation, type NetworkInviteActionResult } from '../../../actions';

const initial: NetworkInviteActionResult = { ok: false };

export interface NetworkInvitationPreview {
  partnerOrganizationName: string | null;
  role: string;
  expiresAt: string;
  status: string;
}

const ROLE_LABELS: Record<string, string> = {
  partner_owner: 'Partner owner',
  partner_coordinator: 'Partner coordinator',
  billing: 'Billing contact',
  editor: 'Editor',
  uploader: 'Uploader',
  viewer: 'Viewer'
};

const BLOCKED_STATUS_MESSAGES: Record<string, string> = {
  revoked: 'This invitation has been revoked. Ask KSP to send a new one.',
  accepted: 'This invitation has already been accepted. Sign in from Network home instead.',
  expired: 'This invitation has expired. Ask KSP to send a new one.'
};

function formatExpiry(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function AcceptNetworkInviteForm({
  token,
  email,
  preview
}: {
  token: string;
  email: string;
  preview?: NetworkInvitationPreview | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(acceptPartnerInvitation, initial);

  useEffect(() => {
    if (state.ok) {
      router.push('/');
      router.refresh();
    }
  }, [state.ok, router]);

  const blockedMessage = preview ? BLOCKED_STATUS_MESSAGES[preview.status] : undefined;

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
      <p className="text-sm text-muted">
        Signed in as <span className="font-semibold text-ink">{email}</span>.
      </p>

      {preview && (
        <dl className="mt-4 space-y-2 rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Partner organization</dt>
            <dd className="font-semibold text-ink">{preview.partnerOrganizationName ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Network role</dt>
            <dd className="font-semibold text-ink">{ROLE_LABELS[preview.role] ?? preview.role}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Valid until</dt>
            <dd className="font-semibold text-ink">{formatExpiry(preview.expiresAt)}</dd>
          </div>
        </dl>
      )}

      {blockedMessage ? (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn-tint px-3 py-2 text-sm text-warn">{blockedMessage}</p>
      ) : (
        <>
          <p className="mt-4 text-sm leading-6 text-muted">
            Accepting activates only the Network membership encoded by this invitation. Client work, KSP finance and unrelated partner organizations stay outside the session.
          </p>
          <form action={action} className="mt-5">
            <input type="hidden" name="token" value={token} />
            {!state.ok && state.error && <p className="mb-3 text-sm text-risk">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand disabled:pointer-events-none disabled:opacity-50"
            >
              {pending ? 'Accepting…' : 'Accept invitation'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
