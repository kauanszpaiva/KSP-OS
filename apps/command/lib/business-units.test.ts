import { describe, expect, it } from 'vitest';
import { inProjectScope } from './business-units';

describe('KSP business-unit operating scope', () => {
  it('does not filter the global owner view', () => {
    expect(inProjectScope('project-a', null)).toBe(true);
    expect(inProjectScope('project-b', null)).toBe(true);
  });

  it('keeps legacy/unattached records visible during migration', () => {
    expect(inProjectScope(null, new Set(['project-a']))).toBe(true);
    expect(inProjectScope(undefined, new Set(['project-a']))).toBe(true);
  });

  it('keeps only project-owned records in the selected division', () => {
    const scope = new Set(['project-a', 'project-c']);
    expect(inProjectScope('project-a', scope)).toBe(true);
    expect(inProjectScope('project-b', scope)).toBe(false);
    expect(inProjectScope('project-c', scope)).toBe(true);
  });
});
