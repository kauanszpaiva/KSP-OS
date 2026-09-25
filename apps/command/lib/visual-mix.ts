import type { Distribution } from '@ksp/ui';

/**
 * Mixes that must keep a declared order instead of the count sort `distribution`
 * applies.
 *
 * `distribution` sorts by size, which is right for a share of the whole but
 * wrong for a sequence: a runway (overdue → today → later) or a progress ladder
 * (0% → 100%) reads as nonsense when the biggest bar jumps to the top. These
 * helpers keep the caller's order, still count real rows only, and still compute
 * `ratio` against every row passed in so a stage cannot overstate its share.
 */

/**
 * Counts `values` and returns them in the declared `order`, keeping only the
 * stages that hold a row — an empty stage is dropped, never drawn as a zero.
 *
 * A value outside `order` is folded into `otherLabel` (last) rather than being
 * dropped silently, so a band function that drifts out of sync with its order
 * cannot lose a row or invent one.
 */
export function orderedMix(
  values: string[],
  order: readonly string[],
  options: { total?: number; otherLabel?: string } = {}
): Distribution[] {
  const { total = values.length, otherLabel = 'Other' } = options;
  const counts = new Map<string, number>();
  let unmatched = 0;

  for (const value of values) {
    if (order.includes(value)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    } else {
      unmatched += 1;
    }
  }

  const stages = order
    .filter((label) => (counts.get(label) ?? 0) > 0)
    .map((label) => ({ label, value: counts.get(label) ?? 0 }));

  if (unmatched > 0) stages.push({ label: otherLabel, value: unmatched });

  return stages.map((stage) => ({
    label: stage.label,
    value: stage.value,
    ratio: total === 0 ? 0 : stage.value / total
  }));
}
