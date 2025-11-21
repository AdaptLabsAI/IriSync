import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

export interface MediaSearchBarProps {
  /**
   * Callback when search query changes
   */
  onSearch: (query: string) => void;
  /**
   * Delay in milliseconds before search is triggered
   */
  debounceTime?: number;
  /**
   * Initial search query
   */
  initialQuery?: string;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether the search bar is disabled
   */
  isDisabled?: boolean;
  /**
   * Optional CSS class name
   */
  className?: string;
  /**
   * Show/hide clear button
   */
  showClearButton?: boolean;
  /**
   * Available filters for advanced search
   */
  filters?: {
    type?: boolean;
    date?: boolean;
    tags?: boolean;
    size?: boolean;
  };
  /**
   * Whether to show the advanced search toggle
   */
  showAdvancedSearch?: boolean;
}

/**
 * MediaSearchBar - Search component for media library with debounce functionality
 */
export const MediaSearchBar: React.FC<MediaSearchBarProps> = ({
  onSearch,
  debounceTime = 300,
  initialQuery = '',
  placeholder = 'Search media...',
  isDisabled = false,
  className = '',
  showClearButton = true,
  filters = {
    type: true,
    date: true,
    tags: true,
    size: false
  },
  showAdvancedSearch = true
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{from?: string, to?: string}>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sizeRange, setSizeRange] = useState<{min?: number, max?: number}>({});
  const [isSearching, setIsSearching] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Mock available tags
  const availableTags = ['social', 'branding', 'product', 'event', 'marketing', 'background', 'profile'];
  
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set timeout for debounce
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      // Build the search query
      let finalQuery = query;
      
      // Add filters to query if the advanced search is open
      if (showFilters) {
        // Add type filter
        if (selectedTypes.length > 0) {
          finalQuery += ` type:${selectedTypes.join(',')}`;
        }
        
        // Add date filter
        if (dateRange.from || dateRange.to) {
          const dateFilter = `date:${dateRange.from || ''}${dateRange.to ? ('-' + dateRange.to) : ''}`;
          finalQuery += ` ${dateFilter}`;
        }
        
        // Add tag filter
        if (selectedTags.length > 0) {
          finalQuery += ` tags:${selectedTags.join(',')}`;
        }
        
        // Add size filter
        if (sizeRange.min || sizeRange.max) {
          const sizeFilter = `size:${sizeRange.min || '0'}-${sizeRange.max || 'max'}`;
          finalQuery += ` ${sizeFilter}`;
        }
      }
      
      onSearch(finalQuery.trim());
      setIsSearching(false);
    }, debounceTime);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, selectedTypes, dateRange, selectedTags, sizeRange, showFilters, onSearch, debounceTime]);
  
  const handleClear = () => {
    setQuery('');
    setSelectedTypes([]);
    setDateRange({});
    setSelectedTags([]);
    setSizeRange({});
    onSearch('');
    
    // Focus the input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSizeChange = (field: 'min' | 'max', value: string) => {
    const numberValue = value === '' ? undefined : parseInt(value);
    setSizeRange(prev => ({
      ...prev,
      [field]: numberValue
    }));
  };
  
  const isFiltered = selectedTypes.length > 0 || selectedTags.length > 0 || 
                    dateRange.from || dateRange.to || sizeRange.min || sizeRange.max;
  
  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className={`w-4 h-4 ${isSearching ? 'text-[#00CC44]' : 'text-gray-500'}`}
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          className={`
            block w-full py-2 pl-10 pr-12 rounded-md border
            ${isDisabled ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900'}
            ${isFiltered ? 'border-[#00FF6A]/20' : 'border-gray-300'}
            focus:outline-none focus:ring-2 focus:ring-[#00CC44] focus:border-transparent
          `}
          aria-label="Search media"
        />
        
        {showClearButton && (query || isFiltered) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-14 flex items-center text-gray-400 hover:text-gray-600 px-1"
            aria-label="Clear search"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        
        {showAdvancedSearch && (
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`
              absolute inset-y-0 right-0 flex items-center px-3
              ${isFiltered ? 'text-[#00CC44]' : 'text-gray-400 hover:text-gray-600'}
            `}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
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
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {isFiltered && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#00CC44] rounded-full"></span>
            )}
          </button>
        )}
      </div>
      
      {showFilters && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filters.type && (
              <div>
                <h3 className="text-sm font-medium mb-2">File Type</h3>
                <div className="flex flex-wrap gap-2">
                  {['image', 'video', 'gif'].map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`
                        px-3 py-1 text-xs rounded-full capitalize
                        ${selectedTypes.includes(type)
                          ? 'bg-[#00FF6A]/10 text-[#00CC44] border-[#00FF6A]/20'
                          : 'bg-gray-100 text-gray-700 border-gray-300'}
                        border hover:bg-opacity-80
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {filters.date && (
              <div>
                <h3 className="text-sm font-medium mb-2">Upload Date</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">From</label>
                    <input 
                      type="date" 
                      value={dateRange.from || ''} 
                      onChange={(e) => handleDateChange('from', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md p-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">To</label>
                    <input 
                      type="date" 
                      value={dateRange.to || ''} 
                      onChange={(e) => handleDateChange('to', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md p-1"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {filters.tags && (
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`
                        px-2 py-1 text-xs rounded-full capitalize
                        ${selectedTags.includes(tag)
                          ? 'bg-[#00FF6A]/10 text-[#00CC44] border-[#00FF6A]/20'
                          : 'bg-gray-100 text-gray-700 border-gray-300'}
                        border hover:bg-opacity-80
                      `}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {filters.size && (
              <div>
                <h3 className="text-sm font-medium mb-2">File Size (KB)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Min</label>
                    <input 
                      type="number" 
                      value={sizeRange.min || ''} 
                      onChange={(e) => handleSizeChange('min', e.target.value)}
                      min="0"
                      className="w-full text-sm border border-gray-300 rounded-md p-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Max</label>
                    <input 
                      type="number" 
                      value={sizeRange.max || ''} 
                      onChange={(e) => handleSizeChange('max', e.target.value)}
                      min="0"
                      className="w-full text-sm border border-gray-300 rounded-md p-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={handleClear}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="text-sm text-[#00CC44] hover:text-[#00CC44] font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaSearchBar; 