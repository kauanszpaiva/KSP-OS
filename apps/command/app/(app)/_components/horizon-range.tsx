'use client';

import { useRouter } from 'next/navigation';
import { Segmented } from '@ksp/ui';

export function HorizonRangePicker({ range }: { range: number }) {
  const router = useRouter();
  return (
    <Segmented
      items={[
        { value: '7', label: '7 days' },
        { value: '30', label: '30 days' },
        { value: '90', label: '90 days' }
      ]}
      value={String(range)}
      onValueChange={(value) => router.push(`/horizon?range=${value}`)}
    />
  );
}
