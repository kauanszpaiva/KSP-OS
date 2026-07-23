'use client';

import { useEffect, useRef } from 'react';
import { formatDate, isOverdue } from '../../../../lib/format';
import { Ring, StatePill } from '../../_components/ui';
import { DecisionForm, ProgressForm, ProofForm } from '../../_components/forms';
import type { CommentView, CommitmentView, MemberRef } from '../../data';
import type { OutcomeRef } from '../_lib/types';
import { CloseIcon } from './icons';
import { AssigneePicker } from './AssigneePicker';
import { Discussion } from './Discussion';
import { Attachments } from './Attachments';
import { effectiveDate, canWrite } from '../_lib/viewModel';

export function TaskDrawer({
  commitment: c,
  comments,
  members,
  outcomes,
  userId,
  exec,
  onClose
}: {
  commitment: CommitmentView;
  comments: CommentView[];
  members: MemberRef[];
  outcomes: OutcomeRef[];
  userId: string;
  exec: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap + Esc to close (WCAG dialog behavior).
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
  const canOperate = canWrite(c, userId, exec);
  const canDecide = exec && c.state === 'proof_submitted';
  const pendingProof = c.proofs.find((p) => !p.accepted_at);
  const acceptedProof = c.proofs.find((p) => p.accepted_at);
  const outcomeTitle = c.outcome_id ? outcomes.find((o) => o.id === c.outcome_id)?.title : null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-surface shadow-pop outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <StatePill state={c.state} />
              {outcomeTitle && <span className="truncate text-[11px] text-ink-3">· {outcomeTitle}</span>}
            </div>
            <h2 className="text-[17px] font-semibold leading-tight text-ink">{c.title}</h2>
            <p className="mt-1 text-[13px] text-ink-2">{c.outcome_statement}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 rounded-md p-1.5 text-ink-3 hover:bg-canvas"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-5">
            <Ring value={c.progress} />
            <div className="space-y-1 text-[12.5px]">
              <p className="text-ink-3">
                Due <span className={`tnum font-medium ${overdue ? 'text-risk' : 'text-ink'}`}>{formatDate(effectiveDate(c))}</span>
                {overdue && <span className="text-risk"> · overdue</span>}
              </p>
              <p className="text-ink-3">Owner <span className="font-medium text-ink">{c.ownerName}</span></p>
              {c.requires_proof && <p className="text-ink-3">Proof required to complete</p>}
            </div>
          </div>

          {c.context && (
            <section>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Context</h3>
              <p className="text-[13px] leading-relaxed text-ink-2">{c.context}</p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Assignees</h3>
            <AssigneePicker commitmentId={c.id} assignees={c.assignees} members={members} exec={exec} />
          </section>

          {canOperate && c.state !== 'completed' && (
            <section className="space-y-2 rounded-md border border-line bg-canvas/50 p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Update</h3>
              <ProgressForm commitmentId={c.id} progress={c.progress} />
              <ProofForm commitmentId={c.id} />
            </section>
          )}

          {canDecide && (
            <section className="rounded-md border border-warn/30 bg-warn-tint/60 p-3">
              <h3 className="mb-2 text-[12px] font-medium text-ink-2">Review completion</h3>
              <DecisionForm commitmentId={c.id} proofId={(pendingProof ?? acceptedProof)?.id} />
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Attachments</h3>
            <Attachments commitmentId={c.id} proofs={c.proofs} canAdd={canOperate && c.state !== 'completed'} />
          </section>

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Discussion</h3>
            <Discussion commitmentId={c.id} comments={comments} userId={userId} exec={exec} />
          </section>
        </div>
      </div>
    </div>
  );
}
