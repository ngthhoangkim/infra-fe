'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/utils/datetime';

interface DateTabsProps {
  selected: string;
  onSelect: (date: string) => void;
}

function buildDateOptions(selected: string): string[] {
  const today = new Date();
  const dates = new Set<string>([selected]);

  for (let i = 0; i < 120; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.add(date.toISOString().slice(0, 10));
  }

  return [...dates].sort((a, b) => b.localeCompare(a));
}

export function DateTabs({ selected, onSelect }: DateTabsProps) {
  const [open, setOpen] = useState(false);
  const dates = useMemo(() => buildDateOptions(selected), [selected]);

  return (
    <div className="date-picker">
      <button
        type="button"
        className="date-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{formatDate(selected)}</span>
        <span aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="date-picker__menu" role="listbox">
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              className={`date-picker__option ${
                date === selected ? 'is-selected' : ''
              }`}
              role="option"
              aria-selected={date === selected}
              onClick={() => {
                onSelect(date);
                setOpen(false);
              }}
            >
              <span>{date === selected ? '✓' : ''}</span>
              <span>{formatDate(date)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
