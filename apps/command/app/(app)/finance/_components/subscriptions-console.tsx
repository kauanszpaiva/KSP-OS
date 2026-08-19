'use client';

import { Button } from '@ksp/ui';
import { Panel } from '../../_components/ui';
import type { Subscription } from '@ksp/database';
import { updateSubscription, cancelSubscription } from '../../actions';

export function SubscriptionsConsole({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <div className="space-y-6">
      {subscriptions.map(s => (
        <Panel key={s.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium">{s.vendor} - {s.product}</h4>
              <p className="text-sm text-ink-3">Status: {s.status}</p>
            </div>
            {s.status === 'active' && (
              <form action={async () => { await cancelSubscription(s.id); }}>
                <Button type="submit" variant="ghost">Cancel Subscription</Button>
              </form>
            )}
          </div>

          <form action={async (data) => { await updateSubscription(data, s.id); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan</label>
                <input type="text" name="plan" defaultValue={(s as any).plan || ''} className="w-full rounded-md border border-line p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project ID</label>
                <input type="text" name="project_id" defaultValue={(s as any).project_id || ''} className="w-full rounded-md border border-line p-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <input type="text" name="notes" defaultValue={(s as any).notes || ''} className="w-full rounded-md border border-line p-2 text-sm" />
            </div>
            <Button type="submit">Update Details</Button>
          </form>
        </Panel>
      ))}
      {subscriptions.length === 0 && <p className="text-sm text-ink-3">No subscriptions found.</p>}
    </div>
  );
}
