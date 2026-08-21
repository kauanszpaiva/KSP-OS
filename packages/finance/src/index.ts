export interface JournalLineInput {
  accountId: string;
  debitMinor: number;
  creditMinor: number;
  currency: string;
}

export function validateJournalLine(line: JournalLineInput): void {
  const debitPositive = Number.isInteger(line.debitMinor) && line.debitMinor > 0 && line.creditMinor === 0;
  const creditPositive = Number.isInteger(line.creditMinor) && line.creditMinor > 0 && line.debitMinor === 0;
  if (!debitPositive && !creditPositive) throw new Error('journal_line_requires_exactly_one_positive_side');
  if (!/^[A-Z]{3}$/.test(line.currency)) throw new Error('currency_must_be_iso_4217');
}

export function validateBalancedJournal(lines: JournalLineInput[]): void {
  if (lines.length < 2) throw new Error('journal_requires_at_least_two_lines');
  lines.forEach(validateJournalLine);
  const currency = lines[0].currency;
  if (lines.some((line) => line.currency !== currency)) throw new Error('mixed_currency_journal_requires_documented_fx_flow');
  const debit = lines.reduce((sum, line) => sum + line.debitMinor, 0);
  const credit = lines.reduce((sum, line) => sum + line.creditMinor, 0);
  if (debit !== credit) throw new Error('journal_entry_must_balance');
}

export interface InvoiceLineInput {
  amountMinor: number;
}

export interface InvoiceInput {
  amountMinor: number;
  balanceMinor: number;
  lines: InvoiceLineInput[];
}

export function validateInvoice(invoice: InvoiceInput): void {
  const linesTotal = invoice.lines.reduce((sum, line) => sum + line.amountMinor, 0);
  if (invoice.amountMinor !== linesTotal) {
    throw new Error('invoice_amount_must_equal_lines_total');
  }
  if (invoice.balanceMinor > invoice.amountMinor) {
    throw new Error('invoice_balance_cannot_exceed_amount');
  }
}

export type InvoiceStatus = 'draft' | 'approved' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'voided' | 'written_off';

export interface CustomerInvoice {
  id: string;
  organizationId: string;
  clientOrganizationId: string;
  projectId?: string;
  invoiceNumber: string;
  issueDate?: string;
  dueDate?: string;
  amountMinor: number;
  currency: string;
  status: InvoiceStatus;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id: string;
  organizationId: string;
  invoiceId: string;
  description: string;
  amountMinor: number;
  quantity: number;
  currency: string;
}

export interface CustomerPayment {
  id: string;
  organizationId: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  status: string;
  receiptUrl?: string;
  createdAt: string;
}

export type CashDirection = 'inflow' | 'outflow';

export interface CashTransactionInput {
  amountMinor: number;
  currency: string;
  direction: CashDirection;
}

export function validateCashTransaction(input: CashTransactionInput): void {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('cash_amount_must_be_positive_minor_units');
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('currency_must_be_iso_4217');
  if (input.direction !== 'inflow' && input.direction !== 'outflow') throw new Error('cash_direction_invalid');
}

export function signedCashAmount(input: CashTransactionInput): number {
  validateCashTransaction(input);
  return input.direction === 'inflow' ? input.amountMinor : -input.amountMinor;
}

export function calculateBookBalance(openingBalanceMinor: number | null, transactions: CashTransactionInput[]): number | null {
  if (openingBalanceMinor == null) return null;
  if (!Number.isSafeInteger(openingBalanceMinor)) throw new Error('opening_balance_must_use_minor_units');
  return transactions.reduce((balance, transaction) => balance + signedCashAmount(transaction), openingBalanceMinor);
}

export function assertStatementReconciles(openingBalanceMinor: number | null, transactions: CashTransactionInput[], endingBalanceMinor: number): void {
  if (!Number.isSafeInteger(endingBalanceMinor)) throw new Error('statement_balance_must_use_minor_units');
  const book = calculateBookBalance(openingBalanceMinor, transactions);
  if (book == null) throw new Error('opening_balance_required_before_reconciliation');
  if (book !== endingBalanceMinor) throw new Error('statement_does_not_reconcile');
}
