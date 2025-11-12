import React, { useState } from 'react';
import { DatePicker, DatePickerProps } from './DatePicker';
import { Box, Typography } from '@mui/material';

export interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange?: (date: Date | null) => void;
  onEndDateChange?: (date: Date | null) => void;
  onRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: {
    start?: string;
    end?: string;
  };
}

/**
 * DateRangePicker component for selecting date ranges
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange,
  className = '',
  disabled = false,
  minDate,
  maxDate,
  placeholder = { start: 'Start date', end: 'End date' }
}) => {
  const [internalStartDate, setInternalStartDate] = useState<Date | undefined>(startDate);
  const [internalEndDate, setInternalEndDate] = useState<Date | undefined>(endDate);

  const handleStartDateChange = (date: Date | null) => {
    const newStartDate = date || undefined;
    setInternalStartDate(newStartDate);
    
    if (onStartDateChange) {
      onStartDateChange(date);
    }
    
    if (onRangeChange) {
      onRangeChange(date, internalEndDate || null);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    const newEndDate = date || undefined;
    setInternalEndDate(newEndDate);
    
    if (onEndDateChange) {
      onEndDateChange(date);
    }
    
    if (onRangeChange) {
      onRangeChange(internalStartDate || null, date);
    }
  };

  return (
    <Box className={`flex flex-col space-y-2 ${className}`}>
      <Box className="flex space-x-2">
        <Box className="flex-1">
          <Typography variant="caption" className="block mb-1">
            Start Date
          </Typography>
          <DatePicker
            selected={internalStartDate}
            onChange={handleStartDateChange}
            disabled={disabled}
            minDate={minDate}
            maxDate={internalEndDate || maxDate}
            placeholderText={placeholder.start}
          />
        </Box>
        
        <Box className="flex-1">
          <Typography variant="caption" className="block mb-1">
            End Date
          </Typography>
          <DatePicker
            selected={internalEndDate}
            onChange={handleEndDateChange}
            disabled={disabled}
            minDate={internalStartDate || minDate}
            maxDate={maxDate}
            placeholderText={placeholder.end}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default DateRangePicker; 