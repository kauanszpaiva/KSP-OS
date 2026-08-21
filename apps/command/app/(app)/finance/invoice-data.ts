import type { SupabaseClient } from '@ksp/database';
import { invoiceEmailConfigured } from '@ksp/notifications';

export interface InvoiceContactRef {
  id: string;
  clientId: string;
  name: string;
  email: string;
}

export interface InvoiceClientRef {
  id: string;
  displayName: string;
  contacts: InvoiceContactRef[];
}

export interface InvoiceLineView {
  id: string;
  invoice_id: string;
  description: string;
  amount_minor: number;
  quantity: number;
  currency: string;
}

export interface InvoiceDeliveryView {
  id: string;
  invoice_id: string;
  recipient_email: string;
  provider_message_id: string | null;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'bounced';
  attempt_count: number;
  last_error: string | null;
  sent_at: string | null;
  updated_at: string;
}

export interface InvoiceView {
  id: string;
  client_organization_id: string;
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  amount_minor: number;
  currency: string;
  status: 'draft' | 'approved' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'voided' | 'written_off';
  billing_contact_id: string | null;
  billing_email: string | null;
  issued_at: string | null;
  created_at: string;
  clientName: string;
  lines: InvoiceLineView[];
  delivery: InvoiceDeliveryView | null;
}

export interface InvoiceConsoleData {
  schemaReady: boolean;
  emailConfigured: boolean;
  clients: InvoiceClientRef[];
  invoices: InvoiceView[];
  loadError?: string;
}

export async function getInvoiceConsoleData(supabase: SupabaseClient): Promise<InvoiceConsoleData> {
  const db = supabase as any;
  const base: InvoiceConsoleData = {
    schemaReady: false,
    emailConfigured: invoiceEmailConfigured(),
    clients: [],
    invoices: []
  };

  try {
    const [{ data: clients, error: clientsError }, { data: contacts, error: contactsError }] = await Promise.all([
      db.from('client_organizations').select('id, display_name').order('display_name'),
      db.from('contacts').select('id, client_id, name, email').not('email', 'is', null).order('name')
    ]);

    if (clientsError || contactsError) {
      return { ...base, loadError: clientsError?.message || contactsError?.message || 'Unable to load invoice recipients.' };
    }

    const contactsByClient = new Map<string, InvoiceContactRef[]>();
    for (const contact of (contacts ?? []) as Array<{ id: string; client_id: string | null; name: string; email: string | null }>) {
      if (!contact.client_id || !contact.email?.trim()) continue;
      const rows = contactsByClient.get(contact.client_id) ?? [];
      rows.push({ id: contact.id, clientId: contact.client_id, name: contact.name, email: contact.email.trim() });
      contactsByClient.set(contact.client_id, rows);
    }

    base.clients = ((clients ?? []) as Array<{ id: string; display_name: string }>).map((client) => ({
      id: client.id,
      displayName: client.display_name,
      contacts: contactsByClient.get(client.id) ?? []
    }));

    const { data: ready, error: readyError } = await db.rpc('invoice_schema_ready');
    if (readyError || ready !== true) return base;
    base.schemaReady = true;

    const [{ data: invoices, error: invoicesError }, { data: lines, error: linesError }, { data: deliveries, error: deliveriesError }] = await Promise.all([
      db.from('customer_invoices').select('*').order('created_at', { ascending: false }),
      db.from('invoice_lines').select('*').order('id'),
      db.from('invoice_email_deliveries').select('*').eq('event_type', 'issued').order('updated_at', { ascending: false })
    ]);

    if (invoicesError || linesError || deliveriesError) {
      return {
        ...base,
        invoices: [],
        loadError: invoicesError?.message || linesError?.message || deliveriesError?.message || 'Unable to load invoices.'
      };
    }

    const clientMap = new Map(base.clients.map((client) => [client.id, client.displayName]));
    const linesByInvoice = new Map<string, InvoiceLineView[]>();
    for (const line of (lines ?? []) as InvoiceLineView[]) {
      const rows = linesByInvoice.get(line.invoice_id) ?? [];
      rows.push({ ...line, quantity: Number(line.quantity) || 1 });
      linesByInvoice.set(line.invoice_id, rows);
    }

    const deliveryByInvoice = new Map<string, InvoiceDeliveryView>();
    for (const delivery of (deliveries ?? []) as InvoiceDeliveryView[]) {
      if (!deliveryByInvoice.has(delivery.invoice_id)) deliveryByInvoice.set(delivery.invoice_id, delivery);
    }

    base.invoices = ((invoices ?? []) as Array<Omit<InvoiceView, 'clientName' | 'lines' | 'delivery'>>).map((invoice) => ({
      ...invoice,
      amount_minor: Number(invoice.amount_minor) || 0,
      clientName: clientMap.get(invoice.client_organization_id) ?? 'Unknown client',
      lines: linesByInvoice.get(invoice.id) ?? [],
      delivery: deliveryByInvoice.get(invoice.id) ?? null
    }));

    return base;
  } catch (error) {
    return { ...base, loadError: error instanceof Error ? error.message : 'Invoice data could not be loaded.' };
  }
}
