import { describe, expect, it } from 'vitest';
import {
  addDependencySchema,
  createMilestoneSchema,
  createMissionSchema,
  createTaskSchema,
  updateMilestoneStatusSchema,
  updateMissionHealthSchema,
  updateTaskStatusSchema
} from './schemas';

const uuidA = '11111111-1111-1111-1111-111111111111';
const uuidB = '22222222-2222-2222-2222-222222222222';

describe('createMissionSchema', () => {
  it('accepts a minimal valid mission', () => {
    expect(createMissionSchema.safeParse({ name: 'Website relaunch', projectType: 'engagement' }).success).toBe(true);
  });

  it('rejects a name that is too short', () => {
    expect(createMissionSchema.safeParse({ name: 'A', projectType: 'engagement' }).success).toBe(false);
  });
});

describe('updateMissionHealthSchema', () => {
  it('accepts each valid health value', () => {
    for (const health of ['unknown', 'on_track', 'at_risk', 'off_track']) {
      expect(updateMissionHealthSchema.safeParse({ id: uuidA, health }).success).toBe(true);
    }
  });

  it('rejects an invalid health value', () => {
    expect(updateMissionHealthSchema.safeParse({ id: uuidA, health: 'great' }).success).toBe(false);
  });
});

describe('createMilestoneSchema', () => {
  it('accepts a milestone with no due date', () => {
    expect(createMilestoneSchema.safeParse({ projectId: uuidA, title: 'Ship the sitemap' }).success).toBe(true);
  });
});

describe('updateMilestoneStatusSchema', () => {
  it('rejects an unknown status', () => {
    expect(updateMilestoneStatusSchema.safeParse({ id: uuidA, status: 'blocked' }).success).toBe(false);
  });
});

describe('addDependencySchema', () => {
  it('accepts two distinct missions', () => {
    expect(addDependencySchema.safeParse({ projectId: uuidA, dependsOnProjectId: uuidB }).success).toBe(true);
  });

  it('rejects a mission depending on itself', () => {
    const result = addDependencySchema.safeParse({ projectId: uuidA, dependsOnProjectId: uuidA });
    expect(result.success).toBe(false);
  });
});

describe('createTaskSchema', () => {
  it('accepts a minimal task', () => {
    expect(createTaskSchema.safeParse({ title: 'Draft the sitemap' }).success).toBe(true);
  });
});

describe('updateTaskStatusSchema', () => {
  it('accepts a blocked toggle with no status change', () => {
    expect(updateTaskStatusSchema.safeParse({ id: uuidA, blocked: 'true' }).success).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(updateTaskStatusSchema.safeParse({ id: uuidA, status: 'done' }).success).toBe(false);
  });
});
