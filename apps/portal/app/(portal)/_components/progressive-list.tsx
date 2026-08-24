'use client';

import { Children, type ReactNode, useState } from 'react';

export function ProgressiveList({ children, initial = 4 }: { children: ReactNode; initial?: number }) {
  const items = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initial);
  const hidden = Math.max(0, items.length - initial);

  return (
    <>
      {visible}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full border-t border-line px-4 py-3 text-center text-[12.5px] font-semibold text-brand transition-colors hover:bg-surface-2"
        >
          {expanded ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </>
  );
}
