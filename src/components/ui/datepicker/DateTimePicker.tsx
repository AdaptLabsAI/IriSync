import React, { useState, useEffect } from 'react';
import cn from 'classnames';
import { format, parse, isValid, setHours, setMinutes, setSeconds } from 'date-fns';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

export interface DateTimePickerProps {
  /**
   * The selected date and time (controlled)
   */
  value?: Date;
  /**
   * Default selected date and time (uncontrolled)
   */
  defaultValue?: Date;
  /**
   * Called when the date or time changes
   */
  onChange?: (dateTime: Date | null) => void;
  /**
   * Date format string (date-fns format)
   */
  dateFormat?: string;
  /**
   * Time format string (date-fns format)
   */
  timeFormat?: string;
  /**
   * Whether to use 12-hour format with AM/PM for time
   */
  use12Hours?: boolean;
  /**
   * Interval in minutes between time options
   */
  minuteStep?: number;
  /**
   * Minimum selectable date and time
   */
  minDateTime?: Date;
  /**
   * Maximum selectable date and time
   */
  maxDateTime?: Date;
  /**
   * Date placeholder text
   */
  datePlaceholder?: string;
  /**
   * Time placeholder text
   */
  timePlaceholder?: string;
  /**
   * Whether the inputs are disabled
   */
  disabled?: boolean;
  /**
   * Whether the fields are required
   */
  required?: boolean;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Label text
   */
  label?: string;
  /**
   * Custom wrapper class name
   */
  className?: string;
}

/**
 * DateTimePicker component for selecting both date and time
 */
export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  defaultValue,
  onChange,
  dateFormat = 'MM/dd/yyyy',
  timeFormat,
  use12Hours = false,
  minuteStep = 15,
  minDateTime,
  maxDateTime,
  datePlaceholder = 'Select date...',
  timePlaceholder = 'Select time...',
  disabled = false,
  required = false,
  error,
  label,
  className,
}) => {
  // State for uncontrolled component
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(defaultValue || null);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentDateTime = isControlled ? value || null : selectedDateTime;
  
  // Handle date change
  const handleDateChange = (date: Date | null) => {
    if (!date) {
      // If date is cleared, clear the whole datetime
      if (!isControlled) {
        setSelectedDateTime(null);
      }
      onChange?.(null);
      return;
    }
    
    // Keep the time part from the current selection if it exists
    const newDateTime = new Date(date);
    
    if (currentDateTime) {
      newDateTime.setHours(
        currentDateTime.getHours(),
        currentDateTime.getMinutes(),
        currentDateTime.getSeconds(),
        currentDateTime.getMilliseconds()
      );
    }
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedDateTime(newDateTime);
    }
    
    // Notify parent component
    onChange?.(newDateTime);
  };
  
  // Handle time change
  const handleTimeChange = (time: Date | null) => {
    if (!time) {
      // If no time is selected but we have a date, set time to midnight
      if (currentDateTime) {
        const newDateTime = new Date(currentDateTime);
        newDateTime.setHours(0, 0, 0, 0);
        
        if (!isControlled) {
          setSelectedDateTime(newDateTime);
        }
        
        onChange?.(newDateTime);
      }
      return;
    }
    
    // Use current date if it exists, or today's date
    const newDateTime = currentDateTime 
      ? new Date(currentDateTime) 
      : new Date();
    
    // Set the time part
    newDateTime.setHours(
      time.getHours(),
      time.getMinutes(),
      time.getSeconds(),
      time.getMilliseconds()
    );
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedDateTime(newDateTime);
    }
    
    // Notify parent component
    onChange?.(newDateTime);
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-900">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <DatePicker
            value={currentDateTime}
            onChange={handleDateChange}
            dateFormat={dateFormat}
            minDate={minDateTime}
            maxDate={maxDateTime}
            placeholder={datePlaceholder}
            disabled={disabled}
            required={required}
            error={error}
          />
        </div>
        
        <div className="flex-1">
          <TimePicker
            value={currentDateTime}
            onChange={handleTimeChange}
            timeFormat={timeFormat}
            use12Hours={use12Hours}
            minuteStep={minuteStep}
            minTime={minDateTime}
            maxTime={maxDateTime}
            placeholder={timePlaceholder}
            disabled={disabled}
            required={required}
            error={error}
          />
        </div>
      </div>
      
      {error && !currentDateTime && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export default DateTimePicker; 