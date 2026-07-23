'use client';

import type { Proof } from '@ksp/database';

function isLink(ref: string): boolean {
  return /^https?:\/\//i.test(ref);
}

/**
 * Attachments are surfaced through the Proof Chain: proofs of kind `file` or
 * `url` carry a link or reference to the artifact. Native binary upload (a
 * Supabase Storage bucket with the Files policy) is a separate, ADR-gated
 * change — until then, attach evidence as a link via the Update → Submit proof
 * control, which is what these rows reflect.
 */
export function Attachments({ proofs, canAdd }: { commitmentId: string; proofs: Proof[]; canAdd: boolean }) {
  const files = proofs.filter((p) => p.kind === 'file' || p.kind === 'url');
  if (files.length === 0) {
    return (
      <p className="text-[12px] text-ink-4">
        No attachments.{canAdd ? ' Attach a link or file reference from the Update section (Submit proof).' : ''}
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {files.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-[12.5px]">
          <span className="min-w-0">
            <span className="mr-2 rounded bg-canvas px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">{p.kind}</span>
            {isLink(p.reference) ? (
              <a href={p.reference} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2">
                {p.description || p.reference}
              </a>
            ) : (
              <span className="text-ink-2">{p.description || p.reference}</span>
            )}
          </span>
          <span className={`shrink-0 text-[11px] ${p.accepted_at ? 'text-good' : 'text-warn'}`}>{p.accepted_at ? 'accepted' : 'pending'}</span>
        </li>
      ))}
    </ul>
  );
}
