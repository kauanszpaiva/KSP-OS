import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.0.2";

type RelayBody = {
  invoice_id?: string;
  idempotency_key?: string;
  invoice_url?: string | null;
};

type InvoiceRow = {
  id: string;
  organization_id: string;
  client_organization_id: string;
  invoice_number: string;
  amount_minor: number;
  currency: string;
  status: string;
  billing_email: string | null;
  due_date: string | null;
};

type LineRow = {
  description: string;
  amount_minor: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(Number(minor || 0) / 100);
  } catch {
    return `$${(Number(minor || 0) / 100).toFixed(2)}`;
  }
}

function emailContent(input: {
  clientName: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  dueDate: string | null;
  lines: LineRow[];
  invoiceUrl?: string | null;
}) {
  const amount = money(input.amountMinor, input.currency);
  const due = input.dueDate || "Due on receipt";
  const lineText = input.lines
    .map((line) => `- ${line.description}: ${money(Number(line.amount_minor), input.currency)}`)
    .join("\n");
  const text = [
    `Hello ${input.clientName},`,
    "",
    `Your KSP Dominion Group invoice ${input.invoiceNumber} is ready.`,
    lineText,
    "",
    `Total: ${amount}`,
    `Due: ${due}`,
    input.invoiceUrl ? `View invoice: ${input.invoiceUrl}` : "",
    "",
    "If you have any questions, reply to this email.",
    "",
    "Kauan Paiva",
    "Founder & Operator · KSP Dominion Group",
    "kauan@kspdominion.group",
  ].filter(Boolean).join("\n");

  const rows = input.lines.map((line) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E8E8EE;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#1A1B21;">${escapeHtml(line.description)}</td>
      <td align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid #E8E8EE;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#1A1B21;white-space:nowrap;">${escapeHtml(money(Number(line.amount_minor), input.currency))}</td>
    </tr>`).join("");

  const cta = input.invoiceUrl
    ? `<tr><td style="padding-top:24px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#8B2FC9" style="background-color:#8B2FC9;border-radius:8px;"><a href="${escapeHtml(input.invoiceUrl)}" style="display:inline-block;padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;">View invoice</a></td></tr></table></td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>${escapeHtml(input.invoiceNumber)}</title></head>
<body style="margin:0;padding:0;background-color:#F5F5F9;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F5F9"><tr><td align="center" style="padding:28px 16px 36px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td bgcolor="#8B2FC9" style="height:4px;background-color:#8B2FC9;font-size:1px;line-height:1px;">&nbsp;</td></tr>
<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E8EE;padding:28px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:#6B1FA6;">KSP FINANCE · INVOICE</td></tr>
<tr><td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:35px;font-weight:800;color:#1A1B21;">Your invoice is ready.</td></tr>
<tr><td style="padding-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#474952;">Hello <strong style="color:#1A1B21;">${escapeHtml(input.clientName)}</strong>. Invoice <strong style="color:#1A1B21;">${escapeHtml(input.invoiceNumber)}</strong> is summarized below.</td></tr>
<tr><td style="padding-top:20px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4EBFC"><tr><td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B1FA6;">Due: <strong>${escapeHtml(due)}</strong></td></tr></table></td></tr>
<tr><td style="padding-top:18px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>
<tr><td style="padding-top:18px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#777984;">Total</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;font-weight:800;color:#1A1B21;">${escapeHtml(amount)}</td></tr></table></td></tr>
${cta}
<tr><td style="padding-top:24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#777984;">Questions or something looks off? Reply directly to this message.</td></tr>
<tr><td style="padding-top:24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#1A1B21;"><strong>Kauan Paiva</strong><br>Founder &amp; Operator · KSP Dominion Group</td></tr>
</table></td></tr>
<tr><td bgcolor="#17181D" style="background-color:#17181D;padding:17px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#C9CAD1;">KSP Dominion Group · Finance &amp; client records</td></tr>
</table></td></tr></table></body></html>`;

  return {
    subject: `Invoice ${input.invoiceNumber} · KSP Dominion Group`,
    text,
    html,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "authentication_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !anonKey || !resendKey) {
    return json({ ok: false, error: "invoice_email_relay_not_configured" }, 503);
  }

  let body: RelayBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const invoiceId = String(body.invoice_id || "").trim();
  if (!UUID_RE.test(invoiceId)) return json({ ok: false, error: "invalid_invoice_id" }, 400);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ ok: false, error: "authentication_required" }, 401);

  const { data: invoiceData, error: invoiceError } = await supabase
    .from("customer_invoices")
    .select("id, organization_id, client_organization_id, invoice_number, amount_minor, currency, status, billing_email, due_date")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError || !invoiceData) return json({ ok: false, error: invoiceError?.message || "invoice_not_found" }, 404);
  const invoice = invoiceData as InvoiceRow;

  const { data: executive, error: executiveError } = await supabase.rpc("is_executive", { org: invoice.organization_id });
  if (executiveError || executive !== true) return json({ ok: false, error: "executive_finance_access_required" }, 403);
  if (invoice.status !== "issued") return json({ ok: false, error: "invoice_must_be_issued_before_email" }, 409);
  if (!invoice.billing_email || !invoice.billing_email.includes("@")) return json({ ok: false, error: "billing_email_required" }, 400);

  const [{ data: clientData, error: clientError }, { data: lineData, error: lineError }] = await Promise.all([
    supabase.from("client_organizations").select("display_name").eq("id", invoice.client_organization_id).maybeSingle(),
    supabase.from("invoice_lines").select("description, amount_minor").eq("invoice_id", invoiceId).order("id"),
  ]);

  if (clientError) return json({ ok: false, error: clientError.message }, 200);
  if (lineError || !lineData?.length) return json({ ok: false, error: lineError?.message || "invoice_lines_required" }, 200);

  const lines = lineData as LineRow[];
  const content = emailContent({
    clientName: clientData?.display_name || "Client",
    invoiceNumber: invoice.invoice_number,
    amountMinor: Number(invoice.amount_minor),
    currency: invoice.currency || "USD",
    dueDate: invoice.due_date,
    lines,
    invoiceUrl: body.invoice_url || null,
  });

  const idempotencyKey = String(body.idempotency_key || `invoice-issued/${invoiceId}`).slice(0, 240);
  const from = Deno.env.get("KSP_BILLING_FROM") || "KSP Dominion Group <billing@mail.kspdominion.group>";
  const replyTo = Deno.env.get("KSP_BILLING_REPLY_TO") || "kauan@kspdominion.group";
  const resend = new Resend(resendKey);

  try {
    const { data, error } = await resend.emails.send(
      {
        from,
        to: [invoice.billing_email],
        replyTo: [replyTo],
        subject: content.subject,
        text: content.text,
        html: content.html,
      },
      { idempotencyKey },
    );

    if (error) return json({ ok: false, error: error.message || "resend_rejected_invoice_email" }, 200);
    if (!data?.id) return json({ ok: false, error: "resend_message_id_missing" }, 200);

    return json({ ok: true, providerMessageId: data.id }, 200);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "invoice_email_delivery_failed" }, 200);
  }
});
