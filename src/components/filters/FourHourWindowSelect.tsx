'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FOUR_HOUR_SLOT_LABELS,
  FOUR_HOUR_SLOTS,
  FourHourSlot,
} from '@/constants/config';
import {
  NEW_YORK_TIME_ZONE,
  datePartsInNewYork,
  formatDate,
  zonedTimeToUtcSeconds,
} from '@/utils/datetime';

interface FourHourWindowSelectProps {
  marketDate: string;
  windowStartTs: number;
  onSelect: (value: { marketDate: string; windowStartTs: number }) => void;
}

interface FourHourWindowOption {
  value: string;
  marketDate: string;
  windowStartTs: number;
  label: string;
}

function buildWindowStartTs(marketDate: string, slot: FourHourSlot): number {
  const [hour] = slot.split(':').map(Number);
  return zonedTimeToUtcSeconds(marketDate, hour, NEW_YORK_TIME_ZONE);
}

function optionValue(marketDate: string, windowStartTs: number): string {
  return `${marketDate}__${windowStartTs}`;
}

function buildOptions(
  selectedDate: string,
  selectedWindowStartTs: number,
): FourHourWindowOption[] {
  const today = new Date();
  const options: FourHourWindowOption[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < 120; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const marketDate = datePartsInNewYork(date);

    for (const slot of FOUR_HOUR_SLOTS) {
      const windowStartTs = buildWindowStartTs(marketDate, slot);
      const value = optionValue(marketDate, windowStartTs);
      seen.add(value);
      options.push({
        value,
        marketDate,
        windowStartTs,
        label: `${formatDate(marketDate)} · ${FOUR_HOUR_SLOT_LABELS[slot]}`,
      });
    }
  }

  const selectedValue = optionValue(selectedDate, selectedWindowStartTs);
  if (!seen.has(selectedValue)) {
    options.unshift({
      value: selectedValue,
      marketDate: selectedDate,
      windowStartTs: selectedWindowStartTs,
      label: `${formatDate(selectedDate)} · Selected 4H`,
    });
  }

  return options;
}

export function FourHourWindowSelect({
  marketDate,
  windowStartTs,
  onSelect,
}: FourHourWindowSelectProps) {
  const options = useMemo(
    () => buildOptions(marketDate, windowStartTs),
    [marketDate, windowStartTs],
  );
  const selected = optionValue(marketDate, windowStartTs);

  return (
    <Select
      value={selected}
      onValueChange={(value) => {
        const option = options.find((item) => item.value === value);
        if (option) {
          onSelect({
            marketDate: option.marketDate,
            windowStartTs: option.windowStartTs,
          });
        }
      }}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
