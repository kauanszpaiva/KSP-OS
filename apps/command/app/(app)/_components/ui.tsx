import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ksp-blue">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ksp-navy">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-ksp-line bg-white p-5 ${className}`}>{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ksp-line bg-white/60 p-8 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ksp-mist">
      <div className="h-full rounded-full bg-ksp-blue transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}

const STATE_STYLES: Record<string, string> = {
  open: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-ksp-blue',
  blocked: 'bg-red-50 text-red-700',
  proof_submitted: 'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-800',
  replaced: 'bg-slate-100 text-slate-500',
  archived: 'bg-slate-100 text-slate-500'
};

export function StatePill({ state }: { state: string }) {
  const style = STATE_STYLES[state] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${style}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}
