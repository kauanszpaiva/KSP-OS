'use client';

import { useActionState } from 'react';
import { Button } from '@ksp/ui';
import { Panel } from '../../_components/ui';
import type { JournalEntry } from '../../data'; import type { ChartAccount } from '@ksp/database';
import { draftJournalEntry, postJournalEntryAction } from '../../actions';

export function JournalWorkbench({ entries, accounts }: { entries: JournalEntry[], accounts: ChartAccount[] }) {
  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <h3 className="text-lg font-medium mb-4">Draft New Entry</h3>
        <form action={draftJournalEntry} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Memo</label>
            <input type="text" name="memo" required className="w-full rounded-md border border-line p-2 text-sm" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Account</label>
              <select name="account_id" className="w-full rounded-md border border-line p-2 text-sm" required>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Debit (minor)</label>
              <input type="number" name="debit_minor" defaultValue="0" className="w-full rounded-md border border-line p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credit (minor)</label>
              <input type="number" name="credit_minor" defaultValue="0" className="w-full rounded-md border border-line p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input type="text" name="currency" defaultValue="USD" className="w-full rounded-md border border-line p-2 text-sm" />
            </div>
          </div>
          <Button type="submit">Draft Entry</Button>
        </form>
      </Panel>

      <Panel className="p-6">
        <h3 className="text-lg font-medium mb-4">Journal Entries</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-3">No entries yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.map(e => (
              <div key={e.id} className="border border-line rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{e.memo || 'No memo'}</p>
                    <p className="text-sm text-ink-3">Status: {e.status}</p>
                  </div>
                  {e.status === 'draft' && (
                    <form action={async () => { await postJournalEntryAction(e.id); }}>
                      <Button type="submit" variant="primary">Post Entry</Button>
                    </form>
                  )}
                </div>
                {e.lines && e.lines.length > 0 && (
                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="text-left text-ink-3 border-b border-line">
                        <th className="pb-2 font-medium">Account</th>
                        <th className="pb-2 font-medium">Debit</th>
                        <th className="pb-2 font-medium">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.lines.map(l => (
                        <tr key={l.id} className="border-b border-line/50 last:border-0">
                          <td className="py-2">{l.accountName} ({l.accountCode})</td>
                          <td className="py-2">{l.debit_minor > 0 ? (l.debit_minor / 100).toLocaleString('en-US', { style: 'currency', currency: l.currency }) : '-'}</td>
                          <td className="py-2">{l.credit_minor > 0 ? (l.credit_minor / 100).toLocaleString('en-US', { style: 'currency', currency: l.currency }) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
