export interface TaskCompletedEmailInput {
  to: string;
  taskTitle: string;
  completedBy: string;
  projectName?: string | null;
  workspaceUrl?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildTaskCompletedEmail(input: TaskCompletedEmailInput) {
  const title = escapeHtml(input.taskTitle);
  const completedBy = escapeHtml(input.completedBy);
  const project = input.projectName ? escapeHtml(input.projectName) : null;
  const subject = `Completed: ${input.taskTitle}`;
  const projectLine = project ? `<p style="margin:4px 0 0;color:#5f6470;font-size:14px">${project}</p>` : '';
  const button = input.workspaceUrl
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(input.workspaceUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:8px;font-weight:600">Review in KSP OS</a></p>`
    : '';

  return {
    subject,
    text: [
      'KSP Dominion OS',
      '',
      `${input.completedBy} completed: ${input.taskTitle}`,
      input.projectName ? `Project: ${input.projectName}` : null,
      input.workspaceUrl ? `Review: ${input.workspaceUrl}` : null
    ].filter(Boolean).join('\n'),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827"><div style="max-width:600px;margin:0 auto;padding:32px 16px"><div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:28px"><p style="margin:0 0 18px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;font-weight:700">KSP Dominion OS</p><h1 style="margin:0;font-size:22px;line-height:1.3">Task completed</h1><p style="margin:14px 0 0;font-size:16px;line-height:1.55"><strong>${completedBy}</strong> marked <strong>${title}</strong> as complete.</p>${projectLine}${button}<p style="margin:28px 0 0;color:#9ca3af;font-size:12px">Internal operational notification from KSP Dominion OS.</p></div></div></body></html>`
  };
}
