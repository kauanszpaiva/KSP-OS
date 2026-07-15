import type { ReactNode } from 'react';

export function WorkspaceShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-blue-900">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-4 max-w-3xl text-slate-600">{description}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
