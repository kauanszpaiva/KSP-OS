import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test');

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function sendInvoiceIssued(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  invoiceId: string;
}) {
  const amount = (params.amountMinor / 100).toFixed(2);
  const portalUrl = `${getBaseUrl()}/invoices/${params.invoiceId}`;

  return resend.emails.send({
    from: 'finance@ksp-dominion.com',
    to: params.to,
    subject: `New Invoice: ${params.invoiceNumber}`,
    html: `<p>A new invoice for ${params.currency} ${amount} has been issued.</p><p><a href="${portalUrl}">View Invoice</a></p>`,
    headers: {
      'X-Entity-Ref-ID': `invoice-issued-${params.invoiceId}` // Simple idempotency key
    }
  });
}

export async function sendInvoiceDueReminder(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  invoiceId: string;
  dueDate: string;
}) {
  const amount = (params.amountMinor / 100).toFixed(2);
  const portalUrl = `${getBaseUrl()}/invoices/${params.invoiceId}`;

  return resend.emails.send({
    from: 'finance@ksp-dominion.com',
    to: params.to,
    subject: `Reminder: Invoice ${params.invoiceNumber} is due soon`,
    html: `<p>This is a reminder that invoice ${params.invoiceNumber} for ${params.currency} ${amount} is due on ${params.dueDate}.</p><p><a href="${portalUrl}">View Invoice</a></p>`,
    headers: {
      'X-Entity-Ref-ID': `invoice-reminder-${params.invoiceId}`
    }
  });
}

export async function sendInvoiceOverdue(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  invoiceId: string;
  dueDate: string;
}) {
  const amount = (params.amountMinor / 100).toFixed(2);
  const portalUrl = `${getBaseUrl()}/invoices/${params.invoiceId}`;

  return resend.emails.send({
    from: 'finance@ksp-dominion.com',
    to: params.to,
    subject: `Overdue: Invoice ${params.invoiceNumber}`,
    html: `<p>Invoice ${params.invoiceNumber} for ${params.currency} ${amount} was due on ${params.dueDate} and is now overdue.</p><p><a href="${portalUrl}">View Invoice</a></p>`,
    headers: {
      'X-Entity-Ref-ID': `invoice-overdue-${params.invoiceId}`
    }
  });
}

export async function sendPaymentRecorded(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  paymentId: string;
}) {
  const amount = (params.amountMinor / 100).toFixed(2);

  return resend.emails.send({
    from: 'finance@ksp-dominion.com',
    to: params.to,
    subject: `Payment Received for Invoice ${params.invoiceNumber}`,
    html: `<p>We have successfully recorded your payment of ${params.currency} ${amount} for invoice ${params.invoiceNumber}. Thank you!</p>`,
    headers: {
      'X-Entity-Ref-ID': `payment-recorded-${params.paymentId}`
    }
  });
}

export async function sendReceiptAvailable(params: {
  to: string;
  invoiceNumber: string;
  invoiceId: string;
}) {
  const portalUrl = `${getBaseUrl()}/invoices/${params.invoiceId}`;

  return resend.emails.send({
    from: 'finance@ksp-dominion.com',
    to: params.to,
    subject: `Receipt Available for Invoice ${params.invoiceNumber}`,
    html: `<p>A receipt is now available for your recent payment on invoice ${params.invoiceNumber}.</p><p><a href="${portalUrl}">View Receipt</a></p>`,
    headers: {
      'X-Entity-Ref-ID': `receipt-available-${params.invoiceId}`
    }
  });
}
