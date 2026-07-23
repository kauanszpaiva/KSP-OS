import { describe, expect, it } from 'vitest';
import {
  addCommentSchema,
  setAssigneeSchema,
  updateCommitmentFieldSchema,
  updateCommitmentStateSchema
} from './slice';

const UUID = '00000000-0000-0000-0000-000000000001';

describe('workspace action schemas', () => {
  it('accepts free board transitions and rejects gated states', () => {
    expect(updateCommitmentStateSchema.safeParse({ commitmentId: UUID, state: 'in_progress' }).success).toBe(true);
    expect(updateCommitmentStateSchema.safeParse({ commitmentId: UUID, state: 'completed' }).success).toBe(false);
    expect(updateCommitmentStateSchema.safeParse({ commitmentId: UUID, state: 'proof_submitted' }).success).toBe(false);
  });

  it('coerces and bounds the progress field', () => {
    const ok = updateCommitmentFieldSchema.safeParse({ field: 'progress', commitmentId: UUID, value: '80' });
    expect(ok.success).toBe(true);
    if (ok.success && ok.data.field === 'progress') expect(ok.data.value).toBe(80);
    expect(updateCommitmentFieldSchema.safeParse({ field: 'progress', commitmentId: UUID, value: '140' }).success).toBe(false);
  });

  it('allows clearing a date field with an empty string', () => {
    expect(updateCommitmentFieldSchema.safeParse({ field: 'dueDate', commitmentId: UUID, value: '' }).success).toBe(true);
    expect(updateCommitmentFieldSchema.safeParse({ field: 'dueDate', commitmentId: UUID, value: '2026-08-01' }).success).toBe(true);
    expect(updateCommitmentFieldSchema.safeParse({ field: 'dueDate', commitmentId: UUID, value: 'nope' }).success).toBe(false);
  });

  it('rejects a title shorter than the minimum', () => {
    expect(updateCommitmentFieldSchema.safeParse({ field: 'title', commitmentId: UUID, value: 'ab' }).success).toBe(false);
  });

  it('defaults assignee role to contributor', () => {
    const parsed = setAssigneeSchema.safeParse({ commitmentId: UUID, profileId: UUID });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.role).toBe('contributor');
  });

  it('bounds comment length', () => {
    expect(addCommentSchema.safeParse({ commitmentId: UUID, body: '' }).success).toBe(false);
    expect(addCommentSchema.safeParse({ commitmentId: UUID, body: 'looks good' }).success).toBe(true);
  });
});
