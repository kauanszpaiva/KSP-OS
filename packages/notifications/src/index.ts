import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export async function sendApprovalRequestedEmail(to: string, approverName: string, requestTitle: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[Resend Mock] Approval request email sent to ${to} for ${requestTitle}`);
    return;
  }
  await resend.emails.send({
    from: 'hello@founder.example.com',
    to,
    subject: `Approval Required: ${requestTitle}`,
    text: `Hi ${approverName},\n\nA new approval request "${requestTitle}" requires your attention.`
  });
}

export async function sendInvoiceIssuedEmail(to: string, clientName: string, invoiceId: string, amountMinor: number) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[Resend Mock] Invoice issued email sent to ${to} for ${clientName}`);
    return;
  }
  const amount = (amountMinor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  await resend.emails.send({
    from: 'billing@founder.example.com',
    to,
    subject: `New Invoice from Founder OS: ${invoiceId}`,
    text: `Hi ${clientName},\n\nA new invoice for ${amount} has been issued and is ready for your review.`
  });
}
