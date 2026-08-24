import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './primitives';

export type KspSurface = 'paper' | 'carbon';

/**
 * Shared visual primitives for the KSP operating-experience migration.
 *
 * These components intentionally do not embed a logo asset, legal entity name,
 * or division name. Callers must supply approved copy/assets for the surface in
 * which they are used. This keeps the visual migration independent from the
 * unresolved public/legal naming gate.
 */
export function KspSignalLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('block h-[3px] w-full bg-ksp-signal', className)}
    />
  );
}

export function KspWordmark({
  product,
  descriptor,
  inverse = false,
  className
}: {
  product?: string;
  descriptor?: string;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex min-w-0 flex-col', inverse ? 'text-white' : 'text-ksp-carbon', className)}>
      <span className="flex min-w-0 items-baseline gap-2 leading-none">
        <span className="text-[18px] font-black tracking-[-0.055em] sm:text-[20px]">KSP</span>
        {product ? (
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-ksp-signal sm:text-[11px]">
            {product}
          </span>
        ) : null}
      </span>
      {descriptor ? (
        <span className={cx('mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.2em]', inverse ? 'text-white/55' : 'text-ksp-graphite/60')}>
          {descriptor}
        </span>
      ) : null}
    </span>
  );
}

export function KspOperatingRail({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <aside
      className={cx('bg-ksp-carbon text-white', className)}
      {...props}
    >
      {children}
    </aside>
  );
}

export function KspPaperSurface({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cx('bg-ksp-paper text-ksp-carbon', className)} {...props}>
      {children}
    </div>
  );
}

export function KspSectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('text-[10px] font-bold uppercase tracking-[0.16em] text-ksp-graphite/60', className)}>
      {children}
    </span>
  );
}

export function KspMetric({
  label,
  value,
  detail,
  className
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('min-w-0 border-t border-black/10 pt-3', className)}>
      <KspSectionLabel>{label}</KspSectionLabel>
      <div className="mt-2 text-[26px] font-bold leading-none tracking-[-0.04em] text-ksp-carbon">{value}</div>
      {detail ? <div className="mt-2 text-[11.5px] leading-snug text-ksp-graphite/65">{detail}</div> : null}
    </div>
  );
}

export function KspPrimaryAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cx(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-ksp-signal px-4 text-[13px] font-bold text-ksp-carbon transition-[transform,filter] duration-fast hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ksp-carbon focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
