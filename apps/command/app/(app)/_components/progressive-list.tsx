'use client';

import { Children, type ReactNode, useState } from 'react';

export function ProgressiveList({ children, initial = 6 }: { children: ReactNode; initial?: number }) {
  const rows = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(rows.length - initial, 0);

  return (
    <>
      {expanded ? rows : rows.slice(0, initial)}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-11 w-full items-center justify-center border-t border-line px-4 text-[12px] font-semibold text-brand transition-colors hover:bg-brand-tint/45"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </>
  );
}
