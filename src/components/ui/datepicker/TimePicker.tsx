import React, { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { format, parse, isValid } from 'date-fns';
import { Input, InputProps } from '../input';

export interface TimePickerProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  /**
   * The selected time (controlled)
   */
  value?: Date;
  /**
   * Default selected time (uncontrolled)
   */
  defaultValue?: Date;
  /**
   * Called when the time changes
   */
  onChange?: (time: Date | null) => void;
  /**
   * Time format string (date-fns format)
   */
  timeFormat?: string;
  /**
   * Whether to use 12-hour format with AM/PM
   */
  use12Hours?: boolean;
  /**
   * Interval in minutes between options in the dropdown
   */
  minuteStep?: number;
  /**
   * Minimum selectable time
   */
  minTime?: Date;
  /**
   * Maximum selectable time
   */
  maxTime?: Date;
  /**
   * Placeholder text when no time is selected
   */
  placeholder?: string;
  /**
   * Whether the time picker is disabled
   */
  disabled?: boolean;
  /**
   * Whether the field is required
   */
  required?: boolean;
}

/**
 * TimePicker component for selecting times
 */
export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  defaultValue,
  onChange,
  timeFormat: propTimeFormat,
  use12Hours = false,
  minuteStep = 15,
  minTime,
  maxTime,
  placeholder = 'Select time...',
  disabled = false,
  required = false,
  ...inputProps
}) => {
  // Determine time format based on 12/24 hour setting
  const timeFormat = propTimeFormat || (use12Hours ? 'hh:mm a' : 'HH:mm');
  
  // State for uncontrolled component
  const [selectedTime, setSelectedTime] = useState<Date | null>(defaultValue || null);
  const [inputValue, setInputValue] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Ref for click outside handling
  const timePickerRef = useRef<HTMLDivElement>(null);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentTime = isControlled ? value || null : selectedTime;
  
  // Initialize input value
  useEffect(() => {
    if (currentTime && isValid(currentTime)) {
      setInputValue(format(currentTime, timeFormat));
    } else {
      setInputValue('');
    }
  }, [currentTime, timeFormat]);
  
  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Generate time options for the dropdown
  const generateTimeOptions = () => {
    const options: Date[] = [];
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Generate times at the specified interval
    for (let minutes = 0; minutes < 24 * 60; minutes += minuteStep) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      
      const time = new Date(baseDate);
      time.setHours(hour, minute, 0, 0);
      
      // Apply min/max constraints
      if (minTime && time < minTime) continue;
      if (maxTime && time > maxTime) continue;
      
      options.push(time);
    }
    
    return options;
  };
  
  // Handle time selection
  const handleTimeSelect = (time: Date) => {
    const newTime = new Date(time);
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedTime(newTime);
    }
    
    // Update the input value
    setInputValue(format(newTime, timeFormat));
    
    // Close the dropdown
    setIsOpen(false);
    
    // Notify parent component
    onChange?.(newTime);
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!value) {
      // Clear the time
      if (!isControlled) {
        setSelectedTime(null);
      }
      onChange?.(null);
      return;
    }
    
    // Try to parse the input as a time
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    try {
      const parsedTime = parse(value, timeFormat, baseDate);
      
      if (isValid(parsedTime)) {
        // Check min/max constraints
        if (minTime && parsedTime < minTime) return;
        if (maxTime && parsedTime > maxTime) return;
        
        // Update internal state if uncontrolled
        if (!isControlled) {
          setSelectedTime(parsedTime);
        }
        
        // Notify parent component
        onChange?.(parsedTime);
      }
    } catch (error) {
      // Invalid time format, do nothing
    }
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    // Open the dropdown
    if (!disabled) {
      setIsOpen(true);
    }
  };
  
  // Get time options for the dropdown
  const timeOptions = generateTimeOptions();
  
  // Check if a time matches the current selection
  const isTimeSelected = (time: Date) => {
    if (!currentTime) return false;
    
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    
    return time.getHours() === currentHours && time.getMinutes() === currentMinutes;
  };
  
  return (
    <div ref={timePickerRef} className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onClick={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rightElement={<ClockIcon />}
        {...inputProps}
      />
      
      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto">
          <div className="p-1">
            {timeOptions.length > 0 ? (
              timeOptions.map((time, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleTimeSelect(time)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm rounded-md focus:outline-none',
                    isTimeSelected(time) ? 'bg-primary text-white' : 'hover:bg-gray-100'
                  )}
                >
                  {format(time, timeFormat)}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                No available times
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Clock icon
const ClockIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default TimePicker; 