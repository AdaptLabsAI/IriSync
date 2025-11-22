import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { cn } from '../../lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangeSelectorProps {
  /**
   * Callback function when date range changes
   */
  onRangeChange: (range: DateRange) => void;
  /**
   * Initial date range
   */
  initialRange?: DateRange;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Custom presets to show
   */
  presets?: Array<{
    label: string;
    getValue: () => DateRange;
  }>;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Whether to disable the component
   */
  disabled?: boolean;
  /**
   * Display mode: dropdown or dialog
   */
  mode?: 'dropdown' | 'dialog';
  /**
   * Format to display the selected dates
   */
  displayFormat?: string;
}

/**
 * DateRangeSelector - Component for selecting date ranges in analytics
 */
export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  onRangeChange,
  initialRange,
  size = 'md',
  presets,
  className = '',
  disabled = false,
  mode = 'dropdown',
  displayFormat = 'MMM d, yyyy'
}) => {
  // Default to last 7 days if no initial range provided
  const defaultRange = {
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date())
  };
  
  const [date, setDate] = useState<DateRange>(initialRange || defaultRange);
  const [isOpen, setIsOpen] = useState(false);
  
  // Common date range presets
  const defaultPresets = [
    {
      label: 'Today',
      getValue: () => ({
        from: startOfDay(new Date()),
        to: endOfDay(new Date())
      })
    },
    {
      label: 'Yesterday',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 1)),
        to: endOfDay(subDays(new Date(), 1))
      })
    },
    {
      label: 'Last 7 days',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 6)),
        to: endOfDay(new Date())
      })
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 29)),
        to: endOfDay(new Date())
      })
    },
    {
      label: 'This week',
      getValue: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
      })
    },
    {
      label: 'This month',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      })
    },
    {
      label: 'Last month',
      getValue: () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth)
        };
      }
    },
    {
      label: 'This year',
      getValue: () => ({
        from: startOfYear(new Date()),
        to: endOfYear(new Date())
      })
    }
  ];
  
  const activePresets = presets || defaultPresets;
  
  // Handle date selection from calendar
  const handleDateSelect = (selectedDate: Date) => {
    const newRange = {
      ...date,
      ...(date.from && date.to && !date.from && !date.to
        ? { from: selectedDate, to: selectedDate }
        : !date.from
        ? { from: selectedDate }
        : { to: selectedDate })
    };
    
    // If selecting 'to' before 'from', adjust accordingly
    if (newRange.from && newRange.to && newRange.from > newRange.to) {
      if (!date.to) {
        newRange.to = newRange.from;
        newRange.from = selectedDate;
      } else {
        newRange.from = newRange.to;
        newRange.to = selectedDate;
      }
    }
    
    // If we have a complete range
    if (newRange.from && newRange.to) {
      newRange.from = startOfDay(newRange.from);
      newRange.to = endOfDay(newRange.to);
      
      setDate(newRange);
      onRangeChange(newRange);
      
      // Close the dropdown after selecting a complete range
      if (date.from && newRange.to) {
        setTimeout(() => setIsOpen(false), 300);
      }
    } else {
      setDate(newRange as DateRange);
    }
  };
  
  // Apply a preset range
  const applyPreset = (preset: typeof activePresets[0]) => {
    const newRange = preset.getValue();
    setDate(newRange);
    onRangeChange(newRange);
    setIsOpen(false);
  };
  
  const formatDate = (date: Date) => format(date, displayFormat);
  
  const getDisplayValue = () => {
    if (date.from && date.to) {
      return `${formatDate(date.from)} - ${formatDate(date.to)}`;
    }
    return 'Select date range';
  };
  
  // Render as dropdown (popover)
  const renderDropdown = () => (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={disabled}
          className={cn('w-auto justify-between gap-1', className)}
        >
          <Calendar className="h-4 w-4" />
          <span>{getDisplayValue()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-2">
            <div className="py-1 px-2 font-medium">Presets</div>
            <div className="space-y-1 p-1">
              {activePresets.map((preset, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <CalendarComponent
              mode="range"
              selected={{
                from: date.from,
                to: date.to
              }}
              onSelect={(range: any) => {
                if (range?.from) {
                  handleDateSelect(range.from);
                }
                if (range?.to) {
                  handleDateSelect(range.to);
                }
              }}
              numberOfMonths={2}
              defaultMonth={date.from}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
  
  // Render as dialog (for mobile-friendly view)
  const renderDialog = () => (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={disabled}
          className={cn('w-auto justify-between gap-1', className)}
        >
          <Calendar className="h-4 w-4" />
          <span>{getDisplayValue()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Date Range</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-wrap gap-2">
            {activePresets.map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          <CalendarComponent
            mode="range"
            selected={{
              from: date.from,
              to: date.to
            }}
            onSelect={(range: any) => {
              if (range?.from) {
                handleDateSelect(range.from);
              }
              if (range?.to) {
                handleDateSelect(range.to);
              }
            }}
            numberOfMonths={1}
            defaultMonth={date.from}
          />
          
          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  
  return mode === 'dropdown' ? renderDropdown() : renderDialog();
};

export default DateRangeSelector; 