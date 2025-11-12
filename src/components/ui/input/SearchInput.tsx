import React, { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import Input, { InputProps } from './Input';

export interface SearchInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  /**
   * Called when the search value changes
   */
  onSearch?: (value: string) => void;
  /**
   * Search delay in milliseconds (debounce)
   */
  debounceMs?: number;
  /**
   * Initial search value
   */
  initialValue?: string;
}

/**
 * Search input with search icon and clear button
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  debounceMs = 300,
  initialValue = '',
  placeholder = 'Search...',
  ...props
}) => {
  const [value, setValue] = useState(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear the debounce timer when component unmounts
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set up a new timer
    debounceTimerRef.current = setTimeout(() => {
      onSearch?.(newValue);
    }, debounceMs);
  };
  
  const handleClear = () => {
    setValue('');
    onSearch?.('');
  };
  
  return (
    <Input
      type="search"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      leftElement={<SearchIcon />}
      rightElement={
        value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        ) : null
      }
      {...props}
    />
  );
};

// Search icon
const SearchIcon = () => (
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
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

// Clear icon (X)
const ClearIcon = () => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export default SearchInput; 