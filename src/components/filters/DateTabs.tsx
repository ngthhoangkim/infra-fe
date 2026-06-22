'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { datePartsInVietnam, formatDate } from '@/utils/datetime';

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
    dates.add(datePartsInVietnam(date));
  }

  return [...dates].sort((a, b) => b.localeCompare(a));
}

export function DateTabs({ selected, onSelect }: DateTabsProps) {
  const dates = useMemo(() => buildDateOptions(selected), [selected]);

  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {dates.map((date) => (
          <SelectItem key={date} value={date}>
            {formatDate(date)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
