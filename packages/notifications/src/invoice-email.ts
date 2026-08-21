import { KSP_EMAIL_BRAND, escapeEmailHtml, renderKspEmailShell } from './brand-email';

export interface InvoiceEmailLine {
  description: string;
  amountMinor: number;
}

export interface InvoiceEmailInput {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  dueDate: string | null;
  lines: InvoiceEmailLine[];
  invoiceUrl?: string | null;
}

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
}

export function buildInvoiceEmail(input: InvoiceEmailInput) {
  const amount = money(input.amountMinor, input.currency);
  const due = input.dueDate || 'Due on receipt';
  const subject = `Invoice ${input.invoiceNumber} · KSP Dominion Group`;
  const lineText = input.lines.map((line) => `- ${line.description}: ${money(line.amountMinor, input.currency)}`).join('\n');
  const text = [
    `Hello ${input.clientName},`,
    '',
    `Your KSP Dominion Group invoice ${input.invoiceNumber} is ready.`,
    lineText,
    '',
    `Total: ${amount}`,
    `Due: ${due}`,
    input.invoiceUrl ? `View invoice: ${input.invoiceUrl}` : '',
    '',
    'If you have any questions, reply to this email.',
    '',
    'Kauan Paiva',
    'Founder & Operator · KSP Dominion Group',
    KSP_EMAIL_BRAND.contactEmail
  ].filter(Boolean).join('\n');

  const rows = input.lines.map((line) => `
    <tr>
      <td style="padding-top:11px;padding-right:8px;padding-bottom:11px;padding-left:0;border-bottom:1px solid ${KSP_EMAIL_BRAND.colors.line};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${KSP_EMAIL_BRAND.colors.ink};">${escapeEmailHtml(line.description)}</td>
      <td align="right" style="padding-top:11px;padding-right:0;padding-bottom:11px;padding-left:8px;border-bottom:1px solid ${KSP_EMAIL_BRAND.colors.line};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:${KSP_EMAIL_BRAND.colors.ink};white-space:nowrap;">${escapeEmailHtml(money(line.amountMinor, input.currency))}</td>
    </tr>`).join('');

  const bodyHtml = `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td bgcolor="${KSP_EMAIL_BRAND.colors.brandTint}" style="background-color:${KSP_EMAIL_BRAND.colors.brandTint};border-radius:10px;padding-top:14px;padding-right:16px;padding-bottom:14px;padding-left:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${KSP_EMAIL_BRAND.colors.muted};">Invoice</td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${KSP_EMAIL_BRAND.colors.muted};">Due</td>
          </tr>
          <tr>
            <td style="padding-top:3px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;font-weight:800;color:${KSP_EMAIL_BRAND.colors.brandStrong};">${escapeEmailHtml(input.invoiceNumber)}</td>
            <td align="right" style="padding-top:3px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;font-weight:700;color:${KSP_EMAIL_BRAND.colors.ink};">${escapeEmailHtml(due)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top:20px;padding-right:0;padding-bottom:0;padding-left:0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${rows}</table>
      </td>
    </tr>
    <tr>
      <td style="padding-top:18px;padding-right:0;padding-bottom:0;padding-left:0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:${KSP_EMAIL_BRAND.colors.muted};">Total</td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:23px;line-height:29px;font-weight:800;color:${KSP_EMAIL_BRAND.colors.ink};">${escapeEmailHtml(amount)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const html = renderKspEmailShell({
    preview: `Invoice ${input.invoiceNumber} is ready`,
    surface: 'Finance · Client Portal',
    title: 'Your invoice is ready.',
    introHtml: `Hello <strong style="color:${KSP_EMAIL_BRAND.colors.ink};">${escapeEmailHtml(input.clientName)}</strong>. Everything you need is summarized below, with the same record available in your KSP Client Portal.`,
    bodyHtml,
    ...(input.invoiceUrl ? { cta: { label: 'View invoice in Portal', url: input.invoiceUrl } } : {}),
    noteHtml: 'Questions or something looks off? Reply directly to this message and we’ll help you sort it out.',
    signature: {
      name: 'Kauan Paiva',
      role: 'Founder & Operator · KSP Dominion Group',
      email: KSP_EMAIL_BRAND.contactEmail
    }
  });

  return { subject, text, html };
}
