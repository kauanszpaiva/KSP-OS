/** Initials avatar — same treatment as the shell's user chip. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const SIZES = {
  sm: 'h-5 w-5 text-[9px]',
  md: 'h-7 w-7 text-[11px]',
  lg: 'h-9 w-9 text-[13px]'
} as const;

export function Avatar({
  name,
  size = 'md',
  accountable = false,
  title
}: {
  name: string;
  size?: keyof typeof SIZES;
  accountable?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title ?? name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]} ${
        accountable ? 'bg-brand text-white ring-2 ring-brand-tint' : 'bg-brand-tint text-brand'
      }`}
      aria-label={name}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Overlapping stack of assignee avatars used in dense rows/cards. */
export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) {
    return <span className="text-[11px] text-ink-4">Unassigned</span>;
  }
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="flex items-center">
      <span className="flex -space-x-1.5">
        {shown.map((n, i) => (
          <span key={`${n}-${i}`} className="rounded-full ring-2 ring-surface">
            <Avatar name={n} size="sm" />
          </span>
        ))}
      </span>
      {extra > 0 && <span className="ml-1 text-[10px] text-ink-3">+{extra}</span>}
    </span>
  );
}
