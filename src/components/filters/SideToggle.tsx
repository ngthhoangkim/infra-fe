'use client';

import { SIDE_LABELS, SIDES, Side } from '@/constants/config';

interface SideToggleProps {
  value: Side;
  onChange: (value: Side) => void;
}

export function SideToggle({ value, onChange }: SideToggleProps) {
  return (
    <div className="toggle">
      {SIDES.map((side) => (
        <button
          key={side}
          type="button"
          className={`toggle__btn toggle__btn--${side} ${
            value === side ? 'is-active' : ''
          }`}
          onClick={() => onChange(side)}
        >
          {SIDE_LABELS[side]}
        </button>
      ))}
    </div>
  );
}
