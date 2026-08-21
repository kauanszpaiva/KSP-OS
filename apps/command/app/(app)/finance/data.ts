import type { SupabaseClient } from '@ksp/database';

export type FinancialAccountKind = 'bank' | 'cash' | 'card' | 'processor' | 'wallet' | 'clearing' | 'loan';
export type CashDirection = 'inflow' | 'outflow';
export type ReconciliationStatus = 'unreconciled' | 'reconciled';

export interface FinancialAccountRow {
  id: string;
  organization_id: string;
  name: string;
  account_kind: FinancialAccountKind;
  institution_name: string | null;
  currency: string;
  opening_balance_minor: number | null;
  opening_balance_date: string | null;
  balance_source: 'manual' | 'statement' | 'csv' | 'processor';
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CashTransactionRow {
  id: string;
  organization_id: string;
  financial_account_id: string;
  occurred_on: string;
  description: string;
  direction: CashDirection;
  amount_minor: number;
  currency: string;
  source: 'manual' | 'csv' | 'statement' | 'processor';
  external_reference: string | null;
  evidence_reference: string | null;
  project_id: string | null;
  client_id: string | null;
  vendor_name: string | null;
  transfer_group_id: string | null;
  reconciliation_status: ReconciliationStatus;
  reconciled_at: string | null;
  created_at: string;
}

export interface ReconciliationStatementRow {
  id: string;
  organization_id: string;
  financial_account_id: string;
  statement_end_date: string;
  ending_balance_minor: number;
  currency: string;
  source: 'statement' | 'csv' | 'processor';
  evidence_reference: string | null;
  status: 'draft' | 'reconciled';
  reconciled_at: string | null;
  created_at: string;
}

export interface CashControlData {
  accounts: FinancialAccountRow[];
  transactions: CashTransactionRow[];
  statements: ReconciliationStatementRow[];
  unreconciledCount: number;
  unknownBalanceAccountCount: number;
}

export async function getCashControlData(supabase: SupabaseClient): Promise<CashControlData> {
  const [{ data: accounts }, { data: transactions }, { data: statements }] = await Promise.all([
    supabase.from('financial_accounts').select('*').order('name', { ascending: true }),
    // Cash truth must be calculated from the full ledger. Do not page or truncate
    // this query until balances are moved to a server-side aggregate/view.
    supabase.from('cash_transactions').select('*').order('occurred_on', { ascending: false }),
    supabase.from('reconciliation_statements').select('*').order('statement_end_date', { ascending: false }).limit(50)
  ]);

  const accountRows = (accounts ?? []) as FinancialAccountRow[];
  const transactionRows = (transactions ?? []) as CashTransactionRow[];
  const statementRows = (statements ?? []) as ReconciliationStatementRow[];

  return {
    accounts: accountRows,
    transactions: transactionRows,
    statements: statementRows,
    unreconciledCount: transactionRows.filter((row) => row.reconciliation_status === 'unreconciled').length,
    unknownBalanceAccountCount: accountRows.filter((row) => row.status === 'active' && row.opening_balance_minor == null).length
  };
}
