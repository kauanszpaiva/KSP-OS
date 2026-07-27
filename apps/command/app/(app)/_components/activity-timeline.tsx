import { formatDate } from '../../../lib/format';
import type { ActivityView } from '../data';
import { SectionLabel } from './ui';

/**
 * Reusable activity feed — a vertical dot-and-line timeline of recent actions.
 * Extracted from Pulse's "Since you were away" markup (C6.6.4) so any module
 * that gains a scoped activity view can reuse the exact same presentation.
 * Renders nothing when there are no items. The caller owns any surrounding
 * animation wrapper (e.g. Reveal); pass `label` to title the section.
 */
export function ActivityTimeline({ items, label = 'Recent activity' }: { items: ActivityView[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <ol className="space-y-0">
        {items.map((e, i) => (
          <li key={e.id} className="flex gap-3 py-2">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-ink-4" />
              {i < items.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className="pb-1">
              <p className="text-[13px] text-ink">
                <span className="font-medium">{e.actorName}</span> · {e.summary}
              </p>
              <p className="text-[11.5px] text-ink-4">{formatDate(e.created_at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
