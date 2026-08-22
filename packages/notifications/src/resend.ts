import { Resend } from 'resend';
import { buildInvoiceEmail, type InvoiceEmailInput } from './invoice-email';

export interface EmailDeliveryResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

function invoiceRelayConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(supabaseUrl && publicKey);
}

export function invoiceEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim()) || invoiceRelayConfigured();
}

export async function sendInvoiceEmail(input: InvoiceEmailInput, idempotencyKey: string): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured for this environment.' };
  }

  const from = process.env.KSP_BILLING_FROM?.trim() || 'KSP Dominion Group <billing@mail.kspdominion.group>';
  const replyTo = process.env.KSP_BILLING_REPLY_TO?.trim();
  const content = buildInvoiceEmail(input);
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send(
      {
        from,
        to: [input.to],
        subject: content.subject,
        text: content.text,
        html: content.html,
        ...(replyTo ? { replyTo: [replyTo] } : {})
      },
      { idempotencyKey }
    );

    if (error) return { ok: false, error: error.message || 'Resend rejected the invoice email.' };
    if (!data?.id) return { ok: false, error: 'Resend did not return a message id.' };
    return { ok: true, providerMessageId: data.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invoice email delivery failed.' };
  }
}
