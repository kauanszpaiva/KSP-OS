export type FinanceViewKey = 'cash' | 'accounts' | 'renewals' | 'chart' | 'journal' | 'periods' | 'subscriptions' | 'invoices';

export const FINANCE_VIEWS: ReadonlyArray<{ value: FinanceViewKey; label: string }> = [
  { value: 'invoices', label: 'Receivables' },
  { value: 'cash', label: 'Cash' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'renewals', label: 'Renewals' },
  { value: 'accounts', label: 'Accounting' },
  { value: 'journal', label: 'Journal' },
  { value: 'periods', label: 'Close' },
  { value: 'chart', label: 'Analysis' }
];

export function defaultFinanceView({ cashReady, invoiceReady }: { cashReady: boolean; invoiceReady: boolean }): FinanceViewKey {
  if (cashReady) return 'cash';
  if (invoiceReady) return 'invoices';
  return 'subscriptions';
}
