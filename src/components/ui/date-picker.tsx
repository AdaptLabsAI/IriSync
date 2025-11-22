// Date Picker component
import * as React from 'react';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  // Date range support
  selectedRange?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
}

export function DatePicker({ date, onDateChange, selectedRange, onChange, className }: DatePickerProps) {
  // If selectedRange is provided, render two date inputs for range selection
  if (selectedRange && onChange) {
    return (
      <div className={`flex gap-2 ${className || ''}`}>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">From</label>
          <input
            type="date"
            value={selectedRange.from ? selectedRange.from.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const newFrom = e.target.value ? new Date(e.target.value) : selectedRange.from;
              onChange({ from: newFrom, to: selectedRange.to });
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">To</label>
          <input
            type="date"
            value={selectedRange.to ? selectedRange.to.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const newTo = e.target.value ? new Date(e.target.value) : selectedRange.to;
              onChange({ from: selectedRange.from, to: newTo });
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
    );
  }

  // Otherwise, render single date input
  return (
    <div className={`${className || ''}`}>
      <input
        type="date"
        value={date ? date.toISOString().split('T')[0] : ''}
        onChange={(e) => onDateChange?.(e.target.value ? new Date(e.target.value) : undefined)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
