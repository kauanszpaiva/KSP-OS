import type { Distribution } from '@ksp/ui';
import { orderedMix } from './visual-mix';
import { daysUntil } from './format';

/**
 * Shared runway and evidence derivations for the commitment surfaces.
 *
 * The personal runway (`/focus`) and the company register (`/commitments`) read
 * the same rows, so a due window and an evidence state must mean exactly the same
 * thing on both pages. Nothing here invents a figure: every helper consumes rows
 * a caller already fetched, and a window with no rows is dropped rather than
 * drawn as a zero.
 */

/** Runway order — these panels are read top-to-bottom, so they are not count-sorted. */
export const DUE_WINDOWS = ['Overdue', 'Due today', 'Next 7 days', 'Later', 'No due date'] as const;

export type DueWindow = (typeof DUE_WINDOWS)[number];

type DatedRow = { due_date: string | null };

/** The runway window a commitment's `due_date` falls in, using the page-local day rule. */
export function dueWindow(commitment: DatedRow): DueWindow {
  const days = daysUntil(commitment.due_date);
  if (days === null) return 'No due date';
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days <= 7) return 'Next 7 days';
  return 'Later';
}

/** Runway mix in declared order, over every row passed in. */
export function runwayMix(commitments: DatedRow[]): Distribution[] {
  return orderedMix(commitments.map(dueWindow), DUE_WINDOWS, { total: commitments.length });
}

type ProofRow = { proofs: Array<{ accepted_at: string | null }> };

/**
 * Evidence state of a commitment flagged as requiring proof.
 *
 * Labels are chosen for the status palette: `Proof accepted` is the only good
 * state, and the waiting state must read `awaiting acceptance` rather than
 * `accepted`, which would otherwise match the good-token substring and paint a
 * missing approval as success.
 */
export function evidenceState(commitment: ProofRow): string {
  if (hasAcceptedProof(commitment)) return 'Proof accepted';
  if (commitment.proofs.length > 0) return 'Awaiting acceptance';
  return 'No proof yet';
}

/** True when the commitment carries at least one accepted proof. */
export function hasAcceptedProof(commitment: ProofRow): boolean {
  return commitment.proofs.some((proof) => proof.accepted_at !== null);
}
