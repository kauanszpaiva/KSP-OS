/**
 * Inline SVG icons — the house style is hand-rolled marks, no icon dependency.
 * Each is a 16×16 stroke glyph that inherits `currentColor`.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ListIcon(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="5" y1="4" x2="14" y2="4" />
      <line x1="5" y1="8" x2="14" y2="8" />
      <line x1="5" y1="12" x2="14" y2="12" />
      <circle cx="2.2" cy="4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="2.2" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="2.2" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function BoardIcon(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2" y="2.5" width="3.2" height="11" rx="1" />
      <rect x="6.4" y="2.5" width="3.2" height="7.5" rx="1" />
      <rect x="10.8" y="2.5" width="3.2" height="9" rx="1" />
    </Base>
  );
}

export function TableIcon(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <line x1="2" y1="6.5" x2="14" y2="6.5" />
      <line x1="2" y1="10" x2="14" y2="10" />
      <line x1="8" y1="3" x2="8" y2="13" />
    </Base>
  );
}

export function SheetIcon(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2" y="2.5" width="12" height="11" rx="1" />
      <line x1="2" y1="5.8" x2="14" y2="5.8" />
      <line x1="2" y1="9.2" x2="14" y2="9.2" />
      <line x1="5.6" y1="2.5" x2="5.6" y2="13.5" />
      <line x1="9.2" y1="2.5" x2="9.2" y2="13.5" />
    </Base>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2.5" y="3" width="11" height="10.5" rx="1" />
      <line x1="2.5" y1="6" x2="13.5" y2="6" />
      <line x1="5" y1="1.8" x2="5" y2="4" />
      <line x1="11" y1="1.8" x2="11" y2="4" />
    </Base>
  );
}

export function TimelineIcon(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="2" y1="8" x2="14" y2="8" />
      <circle cx="4" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function GanttIcon(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="2" y1="4" x2="9" y2="4" strokeWidth="2.4" />
      <line x1="5" y1="8" x2="13" y2="8" strokeWidth="2.4" />
      <line x1="3" y1="12" x2="8" y2="12" strokeWidth="2.4" />
    </Base>
  );
}

export function RoadmapIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 13V6a2 2 0 0 1 2-2h5" />
      <path d="M11 2 14 4l-3 2z" fill="currentColor" stroke="none" />
      <circle cx="4" cy="13" r="1.2" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function ChartsIcon(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="2.5" y1="13" x2="13.5" y2="13" />
      <rect x="3" y="8" width="2.4" height="4" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="6.8" y="5" width="2.4" height="7" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="10.6" y="9.5" width="2.4" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function WorkloadIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="8" cy="5" r="2.4" />
      <path d="M3.2 13a4.8 4.8 0 0 1 9.6 0" />
    </Base>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="8" y1="3.5" x2="8" y2="12.5" />
      <line x1="3.5" y1="8" x2="12.5" y2="8" />
    </Base>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Base {...p}>
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </Base>
  );
}
