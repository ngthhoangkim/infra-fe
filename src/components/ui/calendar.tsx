'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import 'react-day-picker/style.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn('text-xs', className)}
      classNames={{
        root: 'p-1',
        months: 'flex flex-col gap-2 sm:flex-row',
        month: 'space-y-2',
        month_caption: 'flex h-8 items-center justify-center text-sm font-semibold text-slate-950',
        nav: 'absolute right-2 top-2 flex items-center gap-1',
        button_previous:
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        button_next:
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        weekdays: 'grid grid-cols-7 text-[11px] text-slate-500',
        weekday: 'flex h-7 items-center justify-center',
        week: 'grid grid-cols-7',
        day: 'h-8 w-8 p-0 text-center text-xs',
        day_button:
          'h-8 w-8 rounded-md text-xs text-slate-950 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
        selected:
          'bg-blue-500 text-white hover:bg-blue-500 [&_button]:text-white',
        range_start:
          'rounded-l-md bg-blue-500 text-white [&_button]:text-white',
        range_end: 'rounded-r-md bg-blue-500 text-white [&_button]:text-white',
        range_middle:
          'rounded-none bg-blue-100 text-slate-950 [&_button]:text-slate-950',
        today: 'font-semibold text-blue-600',
        outside: 'text-slate-400 opacity-60 [&_button]:text-slate-400',
        disabled: 'text-slate-400 opacity-50',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
