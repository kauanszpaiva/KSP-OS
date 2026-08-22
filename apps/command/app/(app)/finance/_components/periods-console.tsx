'use client';

import { Button } from '@ksp/ui';
import { Panel } from '../../_components/ui';
import type { AccountingPeriod } from '../../data';
import { lockAccountingPeriod, openAccountingPeriod } from '../../actions';
import { formatDate } from '../../../../lib/format';

export function PeriodsConsole({ periods }: { periods: AccountingPeriod[] }) {
  return (
    <Panel className="p-4 sm:p-6">
      <h3 className="mb-4 text-[17px] font-medium sm:text-lg">Accounting periods</h3>
      {periods.length === 0 ? (
        <p className="text-sm text-ink-3">No periods defined.</p>
      ) : (
        <>
          <div className="space-y-2.5 sm:hidden">
            {periods.map((period) => {
              const isLocked = period.locked_at !== null;
              return (
                <article key={period.id} className="rounded-xl border border-line bg-surface-2/45 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-4">Period</p>
                      <p className="mt-1 text-[13px] font-medium text-ink">{formatDate(period.period_start)} — {formatDate(period.period_end)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${isLocked ? 'bg-risk-tint text-risk' : 'bg-good-tint text-good'}`}>
                      {isLocked ? 'Closed' : 'Open'}
                    </span>
                  </div>
                  <form action={async () => { if (isLocked) await openAccountingPeriod(period.id); else await lockAccountingPeriod(period.id); }} className="mt-3 border-t border-line pt-3">
                    <Button type="submit" variant="secondary" size="md" className="w-full">{isLocked ? 'Open period' : 'Close period'}</Button>
                  </form>
                </article>
              );
            })}
          </div>

          <div className="mobile-scroll-x hidden sm:block">
            <table className="min-w-[560px] w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-3">
                  <th className="pb-2 font-medium">Start date</th>
                  <th className="pb-2 font-medium">End date</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const isLocked = period.locked_at !== null;
                  return (
                    <tr key={period.id} className="border-b border-line/50 last:border-0">
                      <td className="py-3">{formatDate(period.period_start)}</td>
                      <td className="py-3">{formatDate(period.period_end)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${isLocked ? 'bg-risk-tint text-risk' : 'bg-good-tint text-good'}`}>
                          {isLocked ? 'Closed' : 'Open'}
                        </span>
                      </td>
                      <td className="py-3">
                        <form action={async () => { if (isLocked) await openAccountingPeriod(period.id); else await lockAccountingPeriod(period.id); }}>
                          <Button type="submit" variant="ghost" size="sm">{isLocked ? 'Open period' : 'Close period'}</Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
