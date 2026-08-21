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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
}

export function buildInvoiceEmail(input: InvoiceEmailInput) {
  const amount = money(input.amountMinor, input.currency);
  const due = input.dueDate || 'Due on receipt';
  const subject = `Invoice ${input.invoiceNumber} from KSP Dominion Group`;
  const lineText = input.lines.map((line) => `- ${line.description}: ${money(line.amountMinor, input.currency)}`).join('\n');
  const text = [
    `Hello ${input.clientName},`,
    '',
    `Invoice ${input.invoiceNumber} has been issued by KSP Dominion Group.`,
    lineText,
    '',
    `Total: ${amount}`,
    `Due: ${due}`,
    input.invoiceUrl ? `View invoice: ${input.invoiceUrl}` : '',
    '',
    'If you have any questions, reply to this email.',
    'KSP Dominion Group'
  ].filter(Boolean).join('\n');

  const rows = input.lines.map((line) => `
    <tr>
      <td style="padding-top:10px;padding-right:8px;padding-bottom:10px;padding-left:0;border-bottom:1px solid #e8e8e8;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#202124;">${escapeHtml(line.description)}</td>
      <td align="right" style="padding-top:10px;padding-right:0;padding-bottom:10px;padding-left:8px;border-bottom:1px solid #e8e8e8;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#202124;white-space:nowrap;">${escapeHtml(money(line.amountMinor, input.currency))}</td>
    </tr>`).join('');

  const cta = input.invoiceUrl
    ? `<tr><td style="padding-top:24px;padding-right:0;padding-bottom:0;padding-left:0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#171717" style="background-color:#171717;border-radius:8px;"><a href="${escapeHtml(input.invoiceUrl)}" style="display:inline-block;padding-top:11px;padding-right:18px;padding-bottom:11px;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;">View invoice</a></td></tr></table></td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background-color:#f6f7f8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f7f8" style="background-color:#f6f7f8;">
  <tr>
    <td align="center" style="padding-top:32px;padding-right:16px;padding-bottom:32px;padding-left:16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e4e6e8;border-radius:12px;">
        <tr>
          <td style="padding-top:28px;padding-right:28px;padding-bottom:28px;padding-left:28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.08em;color:#6b7280;">KSP DOMINION GROUP</td>
              </tr>
              <tr>
                <td style="padding-top:8px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:700;color:#171717;">Invoice ${escapeHtml(input.invoiceNumber)}</td>
              </tr>
              <tr>
                <td style="padding-top:10px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#4b5563;">Hello ${escapeHtml(input.clientName)}, your invoice is ready.</td>
              </tr>
              <tr>
                <td style="padding-top:24px;padding-right:0;padding-bottom:0;padding-left:0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
                </td>
              </tr>
              <tr>
                <td style="padding-top:20px;padding-right:0;padding-bottom:0;padding-left:0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#6b7280;">Due</td>
                      <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#6b7280;">Total</td>
                    </tr>
                    <tr>
                      <td style="padding-top:4px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;font-weight:600;color:#171717;">${escapeHtml(due)}</td>
                      <td align="right" style="padding-top:4px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:26px;font-weight:700;color:#171717;">${escapeHtml(amount)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${cta}
              <tr>
                <td style="padding-top:28px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">Questions? Reply to this email and the KSP team will help.</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
