import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.SYSTEM_EMAIL_FROM ?? 'KSP Notifications <notifications@ksp.example.com>';

export async function sendApprovalRequestedEmail(to: string, deliverableName: string, projectUrl: string) {
  if (!resend) return console.info(`[MOCK EMAIL] To: ${to}, Approval requested for: ${deliverableName}`);
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Approval requested: ${deliverableName}`,
    html: `<p>A new deliverable version <strong>${deliverableName}</strong> is ready for your review.</p><p><a href="${projectUrl}">Review in KSP Portal</a></p>`
  });
}

export async function sendFeedbackReceivedEmail(to: string, itemName: string, projectUrl: string) {
  if (!resend) return console.info(`[MOCK EMAIL] To: ${to}, Feedback received on: ${itemName}`);
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New feedback on ${itemName}`,
    html: `<p>New feedback was posted on <strong>${itemName}</strong>.</p><p><a href="${projectUrl}">View comments</a></p>`
  });
}

export async function sendNewClientRequestEmail(to: string, requestTitle: string, portalUrl: string) {
  if (!resend) return console.info(`[MOCK EMAIL] To: ${to}, New client request: ${requestTitle}`);
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New request submitted: ${requestTitle}`,
    html: `<p>Your request <strong>${requestTitle}</strong> has been received by KSP.</p><p><a href="${portalUrl}">Track progress</a></p>`
  });
}

export async function sendApprovalCompletedEmail(to: string, itemName: string, projectUrl: string) {
  if (!resend) return console.info(`[MOCK EMAIL] To: ${to}, Approval completed: ${itemName}`);
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Decision recorded for: ${itemName}`,
    html: `<p>Your decision on <strong>${itemName}</strong> was recorded.</p><p><a href="${projectUrl}">View details</a></p>`
  });
}
