'use client';

import { Button } from '@ksp/ui';
import { Panel } from '../../_components/ui';
import type { JournalEntry } from '../../data';
import type { ChartAccount } from '@ksp/database';
import { draftJournalEntry, postJournalEntryAction } from '../../actions';

export function JournalWorkbench({ entries, accounts }: { entries: JournalEntry[]; accounts: ChartAccount[] }) {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <Panel className="p-4 sm:p-6">
        <h3 className="mb-4 text-[17px] font-medium sm:text-lg">Draft new entry</h3>
        <form action={draftJournalEntry} className="space-y-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-2 sm:text-sm">Memo</label>
            <input type="text" name="memo" required className="min-h-11 w-full rounded-xl border border-line bg-surface p-2.5 text-[13px] text-ink sm:min-h-0 sm:rounded-md sm:text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_0.8fr]">
            <div className="min-w-0">
              <label className="mb-1 block text-[12px] font-medium text-ink-2 sm:text-sm">Account</label>
              <select name="account_id" className="min-h-11 w-full rounded-xl border border-line bg-surface p-2.5 text-[13px] text-ink sm:min-h-0 sm:rounded-md sm:text-sm" required>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.code})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-ink-2 sm:text-sm">Debit (minor)</label>
              <input type="number" name="debit_minor" defaultValue="0" className="min-h-11 w-full rounded-xl border border-line bg-surface p-2.5 text-[13px] text-ink sm:min-h-0 sm:rounded-md sm:text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-ink-2 sm:text-sm">Credit (minor)</label>
              <input type="number" name="credit_minor" defaultValue="0" className="min-h-11 w-full rounded-xl border border-line bg-surface p-2.5 text-[13px] text-ink sm:min-h-0 sm:rounded-md sm:text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-ink-2 sm:text-sm">Currency</label>
              <input type="text" name="currency" defaultValue="USD" className="min-h-11 w-full rounded-xl border border-line bg-surface p-2.5 text-[13px] uppercase text-ink sm:min-h-0 sm:rounded-md sm:text-sm" />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto sm:h-9 sm:px-4 sm:text-[13px]">Draft entry</Button>
        </form>
      </Panel>

      <Panel className="p-4 sm:p-6">
        <h3 className="mb-4 text-[17px] font-medium sm:text-lg">Journal entries</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-3">No entries yet.</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {entries.map((entry) => (
              <article key={entry.id} className="min-w-0 rounded-xl border border-line p-3.5 sm:p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-ink">{entry.memo || 'No memo'}</p>
                    <p className="mt-1 text-[12px] capitalize text-ink-3 sm:text-sm">Status: {entry.status}</p>
                  </div>
                  {entry.status === 'draft' && (
                    <form action={async () => { await postJournalEntryAction(entry.id); }} className="shrink-0">
                      <Button type="submit" variant="primary" size="sm">Post</Button>
                    </form>
                  )}
                </div>
                {entry.lines && entry.lines.length > 0 && (
                  <>
                    <div className="mt-4 space-y-2 sm:hidden">
                      {entry.lines.map((line) => (
                        <div key={line.id} className="rounded-xl bg-surface-2/55 p-3">
                          <p className="text-[12.5px] font-medium leading-snug text-ink">{line.accountName} ({line.accountCode})</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
                            <div><p className="text-ink-4">Debit</p><p className="tnum mt-0.5 text-ink-2">{line.debit_minor > 0 ? (line.debit_minor / 100).toLocaleString('en-US', { style: 'currency', currency: line.currency }) : '—'}</p></div>
                            <div><p className="text-ink-4">Credit</p><p className="tnum mt-0.5 text-ink-2">{line.credit_minor > 0 ? (line.credit_minor / 100).toLocaleString('en-US', { style: 'currency', currency: line.currency }) : '—'}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mobile-scroll-x mt-4 hidden sm:block">
                      <table className="min-w-[520px] w-full text-sm">
                        <thead>
                          <tr className="border-b border-line text-left text-ink-3">
                            <th className="pb-2 font-medium">Account</th>
                            <th className="pb-2 font-medium">Debit</th>
                            <th className="pb-2 font-medium">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line) => (
                            <tr key={line.id} className="border-b border-line/50 last:border-0">
                              <td className="py-2">{line.accountName} ({line.accountCode})</td>
                              <td className="tnum py-2">{line.debit_minor > 0 ? (line.debit_minor / 100).toLocaleString('en-US', { style: 'currency', currency: line.currency }) : '-'}</td>
                              <td className="tnum py-2">{line.credit_minor > 0 ? (line.credit_minor / 100).toLocaleString('en-US', { style: 'currency', currency: line.currency }) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
