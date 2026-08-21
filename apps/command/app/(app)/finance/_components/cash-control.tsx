'use client';

import type { CashControlData, FinancialAccountRow } from '../data';
import { createCashTransaction, createFinancialAccount, createReconciliationStatement, reconcileCashStatement } from '../actions';
import { Panel, SectionLabel } from '../../_components/ui';

function money(minor: number, currency: string): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency });
}

function bookBalance(account: FinancialAccountRow, data: CashControlData): number | null {
  if (account.opening_balance_minor == null) return null;
  return data.transactions
    .filter((row) => row.financial_account_id === account.id)
    .reduce((sum, row) => sum + (row.direction === 'inflow' ? row.amount_minor : -row.amount_minor), account.opening_balance_minor);
}

const input = 'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] text-ink focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4';
const button = 'rounded-lg bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-canvas transition hover:bg-brand';

export function CashControl({ data }: { data: CashControlData }) {
  const activeAccounts = data.accounts.filter((account) => account.status === 'active');
  const truthState = activeAccounts.length === 0
    ? 'Not configured'
    : data.unknownBalanceAccountCount > 0
      ? 'Needs reconciliation'
      : data.unreconciledCount > 0
        ? 'Transactions waiting for reconciliation'
        : 'Reconciled inputs only';

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Cash truth</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{truthState}</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-3">
                KSP OS never treats an unknown opening balance as $0. Add a verified opening balance, record activity, then reconcile against a real statement.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-right">
              <p className="text-[10.5px] uppercase tracking-wide text-ink-4">Unreconciled</p>
              <p className="mt-0.5 text-lg font-semibold text-ink">{data.unreconciledCount}</p>
            </div>
          </div>
        </Panel>
        <Panel className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">Control rule</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">A statement can only close when its ending balance exactly matches the account book balance. Reconciled transactions become immutable.</p>
        </Panel>
      </section>

      <section>
        <SectionLabel>Accounts</SectionLabel>
        {activeAccounts.length === 0 ? (
          <Panel className="p-6 text-[13px] text-ink-3">No financial account configured yet. Start with the account you can verify most easily.</Panel>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.map((account) => {
              const balance = bookBalance(account, data);
              const tx = data.transactions.filter((row) => row.financial_account_id === account.id);
              const pending = tx.filter((row) => row.reconciliation_status === 'unreconciled').length;
              const latestStatement = data.statements.find((row) => row.financial_account_id === account.id && row.status === 'reconciled');
              return (
                <Panel key={account.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink">{account.name}</p>
                      <p className="mt-0.5 text-[11.5px] capitalize text-ink-4">{account.account_kind}{account.institution_name ? ` · ${account.institution_name}` : ''}</p>
                    </div>
                    <span className="rounded-full bg-surface-2 px-2 py-1 text-[10.5px] font-semibold text-ink-3">{account.currency}</span>
                  </div>
                  <div className="mt-5">
                    <p className="text-[10.5px] uppercase tracking-wide text-ink-4">Book balance</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{balance == null ? 'Needs reconciliation' : money(balance, account.currency)}</p>
                    <p className="mt-1 text-[11.5px] text-ink-4">
                      {balance == null ? 'Opening balance is unknown.' : `${pending} unreconciled transaction${pending === 1 ? '' : 's'}.`}
                    </p>
                  </div>
                  <div className="mt-4 border-t border-line pt-3 text-[11px] text-ink-4">
                    {latestStatement ? `Last reconciled statement: ${latestStatement.statement_end_date}` : 'No reconciled statement yet.'}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <details className="rounded-xl border border-line bg-surface p-5" open={activeAccounts.length === 0}>
          <summary className="cursor-pointer text-[14px] font-semibold text-ink">Add financial account</summary>
          <form action={createFinancialAccount} className="mt-5 space-y-3">
            <div><label className={label}>Account name</label><input className={input} name="name" placeholder="Operating checking" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Type</label><select className={input} name="account_kind" defaultValue="bank"><option value="bank">Bank</option><option value="cash">Cash</option><option value="card">Card</option><option value="processor">Processor</option><option value="wallet">Wallet</option><option value="clearing">Clearing</option><option value="loan">Loan</option></select></div>
              <div><label className={label}>Currency</label><input className={input} name="currency" defaultValue="USD" maxLength={3} required /></div>
            </div>
            <div><label className={label}>Institution</label><input className={input} name="institution_name" placeholder="Optional" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Verified opening balance</label><input className={input} name="opening_balance" inputMode="decimal" placeholder="Leave blank if unknown" /></div>
              <div><label className={label}>As of date</label><input className={input} name="opening_balance_date" type="date" /></div>
            </div>
            <button className={button} type="submit">Add account</button>
          </form>
        </details>

        <details className="rounded-xl border border-line bg-surface p-5" disabled={activeAccounts.length === 0}>
          <summary className="cursor-pointer text-[14px] font-semibold text-ink">Record cash activity</summary>
          <form action={createCashTransaction} className="mt-5 space-y-3">
            <div><label className={label}>Account</label><select className={input} name="financial_account_id" required>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div><label className={label}>Date</label><input className={input} type="date" name="occurred_on" required /></div><div><label className={label}>Direction</label><select className={input} name="direction"><option value="outflow">Outflow</option><option value="inflow">Inflow</option></select></div></div>
            <div><label className={label}>Description</label><input className={input} name="description" required /></div>
            <div><label className={label}>Amount</label><input className={input} name="amount" inputMode="decimal" placeholder="0.00" required /></div>
            <div><label className={label}>Vendor / counterparty</label><input className={input} name="vendor_name" /></div>
            <div><label className={label}>Evidence reference</label><input className={input} name="evidence_reference" placeholder="Receipt, statement, Drive reference…" /></div>
            <button className={button} type="submit">Record transaction</button>
          </form>
        </details>

        <details className="rounded-xl border border-line bg-surface p-5" disabled={activeAccounts.length === 0}>
          <summary className="cursor-pointer text-[14px] font-semibold text-ink">Add statement</summary>
          <form action={createReconciliationStatement} className="mt-5 space-y-3">
            <div><label className={label}>Account</label><select className={input} name="financial_account_id" required>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label className={label}>Statement end date</label><input className={input} type="date" name="statement_end_date" required /></div>
            <div><label className={label}>Ending balance</label><input className={input} name="ending_balance" inputMode="decimal" placeholder="0.00" required /></div>
            <div><label className={label}>Evidence reference</label><input className={input} name="evidence_reference" placeholder="Statement file/reference" /></div>
            <button className={button} type="submit">Save statement</button>
          </form>
        </details>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <SectionLabel>Recent cash activity</SectionLabel>
          <Panel className="divide-y divide-line">
            {data.transactions.length === 0 ? <p className="p-5 text-[13px] text-ink-3">No cash transactions recorded.</p> : data.transactions.slice(0, 20).map((row) => {
              const account = data.accounts.find((item) => item.id === row.financial_account_id);
              const signed = row.direction === 'inflow' ? row.amount_minor : -row.amount_minor;
              return <div key={row.id} className="flex items-center gap-4 px-4 py-3"><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-ink">{row.description}</p><p className="mt-0.5 text-[11px] text-ink-4">{row.occurred_on} · {account?.name ?? 'Unknown account'} · {row.reconciliation_status}</p></div><p className="text-[13px] font-semibold tabular-nums text-ink">{signed > 0 ? '+' : ''}{money(signed, row.currency)}</p></div>;
            })}
          </Panel>
        </div>

        <div>
          <SectionLabel>Reconciliation queue</SectionLabel>
          <Panel className="divide-y divide-line">
            {data.statements.length === 0 ? <p className="p-5 text-[13px] text-ink-3">No statements added.</p> : data.statements.map((statement) => {
              const account = data.accounts.find((item) => item.id === statement.financial_account_id);
              return <div key={statement.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-medium text-ink">{account?.name ?? 'Unknown account'}</p><p className="mt-0.5 text-[11px] text-ink-4">Ending {statement.statement_end_date} · {money(statement.ending_balance_minor, statement.currency)}</p></div><span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-4">{statement.status}</span></div>{statement.status === 'draft' && <form action={reconcileCashStatement} className="mt-3"><input type="hidden" name="statement_id" value={statement.id} /><button type="submit" className="text-[12px] font-semibold text-brand hover:underline">Reconcile against book balance</button></form>}</div>;
            })}
          </Panel>
        </div>
      </section>
    </div>
  );
}
