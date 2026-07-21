import { describe, expect, it } from 'vitest';
import { canActivateOutcome, canCompleteCommitment, commitmentNeedsDate, MAX_ACTIVE_OUTCOMES } from './commitments';

describe('Focus Governor', () => {
  it('allows activation below the cap', () => {
    expect(canActivateOutcome(0)).toBe(true);
    expect(canActivateOutcome(MAX_ACTIVE_OUTCOMES - 1)).toBe(true);
  });
  it('blocks a fourth active outcome', () => {
    expect(canActivateOutcome(MAX_ACTIVE_OUTCOMES)).toBe(false);
    expect(canActivateOutcome(MAX_ACTIVE_OUTCOMES + 1)).toBe(false);
  });
});

describe('commitment date requirement', () => {
  it('requires a date on active states', () => {
    expect(commitmentNeedsDate({ state: 'open', dueDate: null, nextActionDate: null })).toBe(true);
    expect(commitmentNeedsDate({ state: 'in_progress', dueDate: null, nextActionDate: null })).toBe(true);
  });
  it('is satisfied by either a due date or a next-action date', () => {
    expect(commitmentNeedsDate({ state: 'open', dueDate: '2026-08-01', nextActionDate: null })).toBe(false);
    expect(commitmentNeedsDate({ state: 'blocked', dueDate: null, nextActionDate: '2026-08-01' })).toBe(false);
  });
  it('does not require a date once completed or archived', () => {
    expect(commitmentNeedsDate({ state: 'completed', dueDate: null, nextActionDate: null })).toBe(false);
    expect(commitmentNeedsDate({ state: 'archived', dueDate: null, nextActionDate: null })).toBe(false);
  });
});

describe('Proof Chain completion gate', () => {
  it('denies non-executives', () => {
    expect(canCompleteCommitment({ requiresProof: true, hasAcceptedProof: true, actorIsExecutive: false }).reason).toBe(
      'completion_requires_executive_acceptance'
    );
  });
  it('denies completion without an accepted proof when proof is required', () => {
    expect(canCompleteCommitment({ requiresProof: true, hasAcceptedProof: false, actorIsExecutive: true }).reason).toBe(
      'completion_requires_accepted_proof'
    );
  });
  it('allows an executive to complete with accepted proof', () => {
    expect(canCompleteCommitment({ requiresProof: true, hasAcceptedProof: true, actorIsExecutive: true }).allowed).toBe(true);
  });
  it('allows completion without proof when none is required', () => {
    expect(canCompleteCommitment({ requiresProof: false, hasAcceptedProof: false, actorIsExecutive: true }).allowed).toBe(true);
  });
});
