'use client';

import { Button } from '@ksp/ui';
import { Panel } from '../../_components/ui';
import type { AccountingPeriod } from '../../data';
import { lockAccountingPeriod, openAccountingPeriod } from '../../actions';
import { formatDate } from '../../../../lib/format';

export function PeriodsConsole({ periods }: { periods: AccountingPeriod[] }) {
  return (
    <Panel className="p-6">
      <h3 className="text-lg font-medium mb-4">Accounting Periods</h3>
      {periods.length === 0 ? (
        <p className="text-sm text-ink-3">No periods defined.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-3 border-b border-line">
              <th className="pb-2 font-medium">Start Date</th>
              <th className="pb-2 font-medium">End Date</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.map(p => {
              const isLocked = p.locked_at !== null;
              return (
                <tr key={p.id} className="border-b border-line/50 last:border-0">
                  <td className="py-3">{formatDate(p.period_start)}</td>
                  <td className="py-3">{formatDate(p.period_end)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {isLocked ? 'Closed' : 'Open'}
                    </span>
                  </td>
                  <td className="py-3">
                    {isLocked ? (
                      <form action={async () => { await openAccountingPeriod(p.id); }}>
                        <Button type="submit" variant="ghost" size="sm">Open Period</Button>
                      </form>
                    ) : (
                      <form action={async () => { await lockAccountingPeriod(p.id); }}>
                        <Button type="submit" variant="ghost" size="sm">Close Period</Button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
