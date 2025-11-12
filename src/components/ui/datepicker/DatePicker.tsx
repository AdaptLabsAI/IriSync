import React, { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { 
  format, 
  isValid, 
  parse, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  getYear,
  setYear
} from 'date-fns';
import { Input, InputProps } from '../input';

export interface DatePickerProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  /**
   * The selected date (controlled)
   */
  value?: Date;
  /**
   * Default selected date (uncontrolled)
   */
  defaultValue?: Date;
  /**
   * Called when the date changes
   */
  onChange?: (date: Date | null) => void;
  /**
   * Date format string (date-fns format)
   */
  dateFormat?: string;
  /**
   * Minimum selectable date
   */
  minDate?: Date;
  /**
   * Maximum selectable date
   */
  maxDate?: Date;
  /**
   * Placeholder text when no date is selected
   */
  placeholder?: string;
  /**
   * Whether the datepicker is disabled
   */
  disabled?: boolean;
  /**
   * Whether the field is required
   */
  required?: boolean;
}

/**
 * DatePicker component for selecting dates
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  defaultValue,
  onChange,
  dateFormat = 'MM/dd/yyyy',
  minDate,
  maxDate,
  placeholder = 'Select date...',
  disabled = false,
  required = false,
  ...inputProps
}) => {
  // State for uncontrolled component
  const [selectedDate, setSelectedDate] = useState<Date | null>(defaultValue || null);
  const [inputValue, setInputValue] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Refs for click outside handling
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentDate = isControlled ? value || null : selectedDate;
  
  // Initialize input value
  useEffect(() => {
    if (currentDate && isValid(currentDate)) {
      setInputValue(format(currentDate, dateFormat));
    } else {
      setInputValue('');
    }
  }, [currentDate, dateFormat]);
  
  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Handle date selection
  const handleDateSelect = (date: Date) => {
    const newDate = new Date(date);
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedDate(newDate);
    }
    
    // Update the input value
    setInputValue(format(newDate, dateFormat));
    
    // Close the dropdown
    setIsOpen(false);
    
    // Notify parent component
    onChange?.(newDate);
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!value) {
      // Clear the date
      if (!isControlled) {
        setSelectedDate(null);
      }
      onChange?.(null);
      return;
    }
    
    // Try to parse the input as a date
    const parsedDate = parse(value, dateFormat, new Date());
    
    if (isValid(parsedDate)) {
      // Update internal state if uncontrolled
      if (!isControlled) {
        setSelectedDate(parsedDate);
      }
      
      // Set current month view to match the parsed date
      setCurrentMonth(parsedDate);
      
      // Notify parent component
      onChange?.(parsedDate);
    }
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    // Open the dropdown
    if (!disabled) {
      setIsOpen(true);
    }
    
    // If there's a selected date, set current month to match
    if (currentDate) {
      setCurrentMonth(currentDate);
    }
  };
  
  // Generate calendar for the current month
  const generateCalendar = () => {
    // Get the start and end dates for the current month view
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get the start and end of the week for complete weeks
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    // Generate all days to display
    const calendarDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });
    
    // Check if a date is selectable (within min/max constraints)
    const isDateSelectable = (date: Date) => {
      if (minDate && date < startOfDay(minDate)) return false;
      if (maxDate && date > endOfDay(maxDate)) return false;
      return true;
    };
    
    // Split days into weeks
    const calendarWeeks = [];
    let week = [];
    
    for (let i = 0; i < calendarDays.length; i++) {
      week.push(calendarDays[i]);
      
      if (week.length === 7 || i === calendarDays.length - 1) {
        calendarWeeks.push(week);
        week = [];
      }
    }
    
    return (
      <div className="p-2">
        {/* Calendar header */}
        <div className="flex justify-between items-center mb-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </button>
          
          <div className="font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </button>
        </div>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div 
              key={day} 
              className="text-center text-xs font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid gap-1">
          {calendarWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = currentDate ? isSameDay(day, currentDate) : false;
                const isToday = isSameDay(day, new Date());
                const selectable = isDateSelectable(day);
                
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => selectable && handleDateSelect(day)}
                    disabled={!selectable}
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-sm focus:outline-none',
                      !isCurrentMonth && 'text-gray-400',
                      isCurrentMonth && !isSelected && !isToday && 'text-gray-900',
                      isToday && !isSelected && 'text-primary border border-primary',
                      isSelected && 'bg-primary text-white',
                      selectable && isCurrentMonth && !isSelected && 'hover:bg-gray-100',
                      !selectable && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label={format(day, 'PPP')}
                    aria-selected={isSelected}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Helper function for the startOfDay
  const startOfDay = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };
  
  // Helper function for the endOfDay
  const endOfDay = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };
  
  return (
    <div ref={datePickerRef} className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onClick={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rightElement={<CalendarIcon />}
        {...inputProps}
      />
      
      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          {generateCalendar()}
        </div>
      )}
    </div>
  );
};

// Calendar icon
const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-500"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Chevron left icon
const ChevronLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

// Chevron right icon
const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default DatePicker; 