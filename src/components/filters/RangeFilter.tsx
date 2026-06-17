'use client';

import { Button } from '@/components/ui/button';
import { RANGES, RANGE_LABELS, Range } from '@/constants/config';

interface RangeFilterProps {
  value: Range;
  onChange: (value: Range) => void;
}

export function RangeFilter({ value, onChange }: RangeFilterProps) {
  return (
    <div className="flex gap-2">
      {RANGES.map((range) => (
        <Button
          key={range}
          type="button"
          variant={value === range ? 'default' : 'outline'}
          onClick={() => onChange(range)}
        >
          {RANGE_LABELS[range]}
        </Button>
      ))}
    </div>
  );
}
