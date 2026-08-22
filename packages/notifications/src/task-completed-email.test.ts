import { describe, expect, it } from 'vitest';
import { buildTaskCompletedEmail } from './task-completed-email';

describe('buildTaskCompletedEmail', () => {
  it('escapes user-controlled task and actor text', () => {
    const email = buildTaskCompletedEmail({
      to: 'owner@example.com',
      taskTitle: '<script>alert(1)</script>',
      completedBy: 'Bruno & Team',
      projectName: 'BEZ <Group>',
      workspaceUrl: 'https://command.example.com/workspace'
    });

    expect(email.subject).toContain('<script>');
    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('Bruno &amp; Team');
    expect(email.html).toContain('BEZ &lt;Group&gt;');
    expect(email.text).toContain('Review: https://command.example.com/workspace');
  });
});
