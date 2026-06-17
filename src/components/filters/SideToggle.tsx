'use client';

import { Button } from '@/components/ui/button';
import { SIDE_LABELS, SIDES, Side } from '@/constants/config';

interface SideToggleProps {
  value: Side;
  onChange: (value: Side) => void;
}

export function SideToggle({ value, onChange }: SideToggleProps) {
  return (
    <div className="flex gap-2">
      {SIDES.map((side) => (
        <Button
          key={side}
          type="button"
          size="default"
          variant={value === side ? 'default' : 'outline'}
          onClick={() => onChange(side)}
        >
          {SIDE_LABELS[side]}
        </Button>
      ))}
    </div>
  );
}
