'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currentDailyMarketDate, formatDate } from '@/utils/datetime';

interface DateTabsProps {
  selected: string;
  onSelect: (date: string) => void;
  includeAll?: boolean;
}

function buildDateOptions(selected: string): string[] {
  const dates = new Set<string>(selected === 'all' ? [] : [selected]);
  const currentMarketDate = currentDailyMarketDate();
  const [year, month, day] = currentMarketDate.split('-').map(Number);
  const latest = new Date(Date.UTC(year, month - 1, day));

  for (let i = 0; i < 120; i++) {
    const date = new Date(latest);
    date.setUTCDate(latest.getUTCDate() - i);
    dates.add(date.toISOString().slice(0, 10));
  }

  return [...dates].sort((a, b) => b.localeCompare(a));
}

export function DateTabs({ selected, onSelect, includeAll = false }: DateTabsProps) {
  const dates = useMemo(() => buildDateOptions(selected), [selected]);

  return (
    <div className="outlined-field">
      <span className="outlined-field__label">Date</span>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger className="outlined-field__control w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {includeAll && <SelectItem value="all">All date</SelectItem>}
          {dates.map((date) => (
            <SelectItem key={date} value={date}>
              {formatDate(date)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
