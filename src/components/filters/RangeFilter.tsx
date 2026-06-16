'use client';

import { RANGES, RANGE_LABELS, Range } from '@/constants/config';

interface RangeFilterProps {
  value: Range;
  onChange: (value: Range) => void;
}

export function RangeFilter({ value, onChange }: RangeFilterProps) {
  return (
    <div className="toggle">
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          className={`toggle__btn ${value === range ? 'is-active' : ''}`}
          onClick={() => onChange(range)}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
