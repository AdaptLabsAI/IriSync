// Calendar component
import * as React from 'react';

export interface CalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | { from: Date; to: Date };
  onSelect?: (date: Date | { from: Date; to: Date } | undefined) => void;
  className?: string;
}

export function Calendar({ mode = 'single', selected, onSelect, className }: CalendarProps) {
  return (
    <div className={`p-3 ${className || ''}`}>
      <div className="text-sm text-muted-foreground">
        Calendar component - implement with date-fns or similar
      </div>
    </div>
  );
}
