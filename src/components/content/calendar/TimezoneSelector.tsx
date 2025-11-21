import React, { useState, useEffect } from 'react';
import { Select } from '../ui/select/Select';

export interface TimezoneSelectorProps {
  /**
   * Currently selected timezone (in IANA format, e.g., 'America/New_York')
   */
  value: string;
  /**
   * Callback when timezone is changed
   */
  onChange: (timezone: string) => void;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  /**
   * Label for the selector
   */
  label?: string;
  /**
   * Error message
   */
  error?: string;
  /**
   * Help text below the input
   */
  helpText?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show common timezones only (vs. full list)
   */
  showCommonOnly?: boolean;
  /**
   * Whether the timezone display includes the UTC offset
   */
  showOffset?: boolean;
}

/**
 * TimezoneSelector component for selecting timezones in calendar views
 */
const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select timezone',
  disabled = false,
  label = 'Timezone',
  error,
  helpText,
  className = '',
  showCommonOnly = true,
  showOffset = true,
}) => {
  const [timezones, setTimezones] = useState<Array<{
    value: string;
    label: string;
    offset: number;
  }>>([]);
  
  // Get current date for calculating offsets
  const now = new Date();
  
  // Common timezones that are frequently used
  const commonTimezones = [
    'America/New_York',    // Eastern Time
    'America/Chicago',     // Central Time
    'America/Denver',      // Mountain Time
    'America/Los_Angeles', // Pacific Time
    'America/Anchorage',   // Alaska Time
    'Pacific/Honolulu',    // Hawaii Time
    'Europe/London',       // GMT/BST
    'Europe/Paris',        // Central European Time
    'Europe/Moscow',       // Moscow Time
    'Asia/Dubai',          // Gulf Time
    'Asia/Kolkata',        // India Time
    'Asia/Singapore',      // Singapore Time
    'Asia/Tokyo',          // Japan Time
    'Australia/Sydney',    // Australian Eastern Time
    'Pacific/Auckland',    // New Zealand Time
  ];

  // Load timezones on component mount
  useEffect(() => {
    // Function to get available timezones and their offsets
    const getTimezones = () => {
      try {
        // Get all timezones if Intl.supportedValuesOf is available (modern browsers)
        let tzNames: string[] = [];
        
        if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
          // This is a modern browser with Intl.supportedValuesOf
          try {
            tzNames = (Intl as any).supportedValuesOf('timeZone');
          } catch (e) {
            // Fallback to common timezones if not supported
            tzNames = commonTimezones;
          }
        } else {
          // Fallback to common timezones
          tzNames = commonTimezones;
        }
        
        // Filter to common timezones if requested
        const filteredNames = showCommonOnly ? 
          tzNames.filter(tz => commonTimezones.includes(tz)) : 
          tzNames;
          
        // Format timezone labels with offsets
        const formattedTimezones = filteredNames.map(timezone => {
          // Calculate offset
          const offsetMinutes = getTimezoneOffset(timezone);
          const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
          const offsetMins = Math.abs(offsetMinutes) % 60;
          const offsetSign = offsetMinutes <= 0 ? '+' : '-'; // Reversed because getTimezoneOffset returns reversed sign
          const offsetFormatted = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
          
          // Format timezone name
          const nameFormatted = timezone.replace(/_/g, ' ').replace(/\//g, ' / ');
          
          return {
            value: timezone,
            label: showOffset ? `${nameFormatted} (GMT${offsetFormatted})` : nameFormatted,
            offset: offsetMinutes,
          };
        });
        
        // Sort by offset
        formattedTimezones.sort((a, b) => a.offset - b.offset);
        
        setTimezones(formattedTimezones);
      } catch (error) {
        console.error('Error loading timezones:', error);
        // Fallback to a few basic timezones
        setTimezones([
          { value: 'America/New_York', label: 'Eastern Time (GMT-05:00)', offset: 300 },
          { value: 'America/Chicago', label: 'Central Time (GMT-06:00)', offset: 360 },
          { value: 'America/Denver', label: 'Mountain Time (GMT-07:00)', offset: 420 },
          { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-08:00)', offset: 480 },
          { value: 'Europe/London', label: 'London (GMT+00:00)', offset: 0 },
          { value: 'Europe/Paris', label: 'Paris (GMT+01:00)', offset: -60 },
          { value: 'Asia/Tokyo', label: 'Tokyo (GMT+09:00)', offset: -540 },
        ]);
      }
    };
    
    getTimezones();
  }, [showCommonOnly, showOffset]);

  // Helper function to get timezone offset
  const getTimezoneOffset = (timeZone: string): number => {
    try {
      // Create a date object for the current date in the target timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        timeZoneName: 'short',
      };
      
      // Get the parts
      const formatter = new Intl.DateTimeFormat('en-GB', options);
      
      // Get target timezone's current time
      const targetTime = new Date(formatter.format(now));
      
      // Compare with UTC
      const localOffset = now.getTimezoneOffset();
      const targetOffset = targetTime.getTimezoneOffset();
      
      return targetOffset - localOffset;
    } catch (error) {
      // Default to UTC if there's an error
      return 0;
    }
  };

  // Handle timezone change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      <Select
        label={label}
        value={value}
        onChange={handleChange}
        options={timezones}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        helpText={helpText}
      />
    </div>
  );
};

export default TimezoneSelector; 