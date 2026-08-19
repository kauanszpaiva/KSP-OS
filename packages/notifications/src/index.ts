type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

function externalEmailDisabled(_event: string, _to: string) {
  return Promise.resolve({ disabled: true as const });
}

export async function sendApprovalRequestedEmail(to: string, _subjectName: string, _context: string) {
  return externalEmailDisabled('approval-requested', to);
}

export async function sendFeedbackReceivedEmail(to: string, _itemName: string, _projectUrl: string) {
  return externalEmailDisabled('feedback-received', to);
}

export async function sendNewClientRequestEmail(to: string, _requestTitle: string, _portalUrl: string) {
  return externalEmailDisabled('new-client-request', to);
}

export async function sendApprovalCompletedEmail(to: string, _itemName: string, _projectUrl: string) {
  return externalEmailDisabled('approval-completed', to);
}

export async function sendInvoiceIssuedEmail(to: string, _clientName: string, _invoiceId: string, _amountMinor: number) {
  return externalEmailDisabled('invoice-issued', to);
}

export async function sendInvoiceIssued(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  invoiceId: string;
}) {
  return externalEmailDisabled('invoice-issued', params.to);
}

export async function sendInvoiceDueReminder(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  invoiceId: string;
  dueDate: string;
}) {
  return externalEmailDisabled('invoice-due-reminder', params.to);
}

export async function sendInvoiceOverdue(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  invoiceId: string;
  dueDate: string;
}) {
  return externalEmailDisabled('invoice-overdue', params.to);
}

export async function sendPaymentRecorded(params: {
  to: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  paymentId: string;
}) {
  return externalEmailDisabled('payment-recorded', params.to);
}

export async function sendReceiptAvailable(params: {
  to: string;
  invoiceNumber: string;
  invoiceId: string;
}) {
  return externalEmailDisabled('receipt-available', params.to);
}

export async function sendEmail({ to }: EmailPayload) {
  return externalEmailDisabled('generic-email', to);
}
