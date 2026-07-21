/**
 * Pure operating invariants for the outcome -> commitment -> proof cycle.
 * These mirror the database triggers/constraints in
 * supabase/migrations/202607210001_operational_slice.sql so the same rules are
 * expressed once in code (for UI messaging and unit tests) and enforced again
 * at the database layer (the real backstop).
 */

export const MAX_ACTIVE_OUTCOMES = 3;

export type CommitmentLifecycleState =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'proof_submitted'
  | 'completed'
  | 'rejected'
  | 'archived';

/** Focus Governor: a fourth active company outcome is not allowed. */
export function canActivateOutcome(currentActiveCount: number): boolean {
  return currentActiveCount < MAX_ACTIVE_OUTCOMES;
}

/** An open/in-progress/blocked commitment must carry a date to act on. */
export function commitmentNeedsDate(input: {
  state: CommitmentLifecycleState;
  dueDate: string | null;
  nextActionDate: string | null;
}): boolean {
  const requiresDate = input.state === 'open' || input.state === 'in_progress' || input.state === 'blocked';
  if (!requiresDate) return false;
  return !input.dueDate && !input.nextActionDate;
}

export interface CompletionCheck {
  requiresProof: boolean;
  hasAcceptedProof: boolean;
  actorIsExecutive: boolean;
}

export interface CompletionDecision {
  allowed: boolean;
  reason:
    | 'ok'
    | 'completion_requires_executive_acceptance'
    | 'completion_requires_accepted_proof';
}

/** Proof Chain: completion is executive-accepted and proof-backed. */
export function canCompleteCommitment(check: CompletionCheck): CompletionDecision {
  if (!check.actorIsExecutive) {
    return { allowed: false, reason: 'completion_requires_executive_acceptance' };
  }
  if (check.requiresProof && !check.hasAcceptedProof) {
    return { allowed: false, reason: 'completion_requires_accepted_proof' };
  }
  return { allowed: true, reason: 'ok' };
}
