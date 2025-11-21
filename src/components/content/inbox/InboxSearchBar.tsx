import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MoveDown, MoveUp, Loader2, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/separator';

export interface SearchQuery {
  /**
   * Search text
   */
  text: string;
  /**
   * Whether to enable advanced search
   */
  useAdvanced: boolean;
  /**
   * Field to search within (subject, body, sender, etc.)
   */
  field?: 'all' | 'subject' | 'body' | 'sender' | 'recipient';
  /**
   * Case sensitivity
   */
  caseSensitive?: boolean;
  /**
   * Whether to use regex
   */
  useRegex?: boolean;
}

export type SearchResult = {
  /**
   * Number of matches found
   */
  totalResults: number;
  /**
   * Current result index being viewed
   */
  currentIndex: number;
  /**
   * Was the search successful
   */
  success: boolean;
  /**
   * Optional error message
   */
  errorMessage?: string;
};

export interface InboxSearchBarProps {
  /**
   * Current search query
   */
  query: SearchQuery;
  /**
   * Function to call when search query changes
   */
  onQueryChange: (query: SearchQuery) => void;
  /**
   * Function to call to search with current query
   */
  onSearch: (query: SearchQuery) => Promise<SearchResult>;
  /**
   * Function to navigate to next search result
   */
  onNextResult: () => void;
  /**
   * Function to navigate to previous search result
   */
  onPreviousResult: () => void;
  /**
   * Function to clear search
   */
  onClearSearch: () => void;
  /**
   * Current search result (if any)
   */
  searchResult?: SearchResult;
  /**
   * Recent searches
   */
  recentSearches?: string[];
  /**
   * Function to clear recent searches
   */
  onClearRecentSearches?: () => void;
  /**
   * Whether the component is in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Placeholder text for search input
   */
  placeholder?: string;
  /**
   * Size of the search bar
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * InboxSearchBar - Search bar for filtering messages in the unified inbox
 */
export const InboxSearchBar: React.FC<InboxSearchBarProps> = ({
  query,
  onQueryChange,
  onSearch,
  onNextResult,
  onPreviousResult,
  onClearSearch,
  searchResult,
  recentSearches = [],
  onClearRecentSearches,
  isLoading = false,
  className = '',
  placeholder = 'Search messages...',
  size = 'md',
}) => {
  const [showAdvanced, setShowAdvanced] = useState(query.useAdvanced);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [localQuery, setLocalQuery] = useState<SearchQuery>(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Update local state when props change
  useEffect(() => {
    setLocalQuery(query);
    setShowAdvanced(query.useAdvanced);
  }, [query]);
  
  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(prev => ({ ...prev, text: e.target.value }));
    
    // If user clears the search, call the clear search function
    if (e.target.value === '' && searchResult) {
      onClearSearch();
    }
  };
  
  // Handle field change in advanced search
  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'all' | 'subject' | 'body' | 'sender' | 'recipient';
    setLocalQuery(prev => ({ ...prev, field: value }));
  };
  
  // Handle toggle changes in advanced search
  const handleToggleChange = (key: 'caseSensitive' | 'useRegex') => {
    setLocalQuery(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Handle search submit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localQuery.text.trim()) return;
    
    // Update parent component with current query
    onQueryChange(localQuery);
    
    // Hide recent searches dropdown
    setShowRecentSearches(false);
    
    // Execute search
    setIsSearching(true);
    try {
      await onSearch(localQuery);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Apply a recent search
  const applyRecentSearch = (searchText: string) => {
    const newQuery = { ...localQuery, text: searchText };
    setLocalQuery(newQuery);
    onQueryChange(newQuery);
    setShowRecentSearches(false);
    
    // Focus input after selection
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Toggle advanced search
  const toggleAdvanced = () => {
    const newAdvancedState = !showAdvanced;
    setShowAdvanced(newAdvancedState);
    setLocalQuery(prev => ({ ...prev, useAdvanced: newAdvancedState }));
  };
  
  // Get field label
  const getFieldLabel = (field: string): string => {
    switch (field) {
      case 'all': return 'All Fields';
      case 'subject': return 'Subject';
      case 'body': return 'Body';
      case 'sender': return 'Sender';
      case 'recipient': return 'Recipient';
      default: return 'All Fields';
    }
  };
  
  // Get size-based classes
  const getInputSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-8 text-sm';
      case 'lg': return 'h-12 text-base';
      case 'md':
      default: return 'h-10 text-sm';
    }
  };
  
  return (
    <div className={`relative flex flex-col ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center w-full relative">
        <div 
          className={`bg-white flex items-center w-full border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary ${
            searchResult && searchResult.success && searchResult.totalResults > 0 
              ? 'border-primary' 
              : searchResult && !searchResult.success 
                ? 'border-red-300' 
                : 'border-gray-300'
          }`}
        >
          <Popover open={showRecentSearches} onOpenChange={setShowRecentSearches}>
            <PopoverTrigger asChild>
              <div 
                className="px-3 text-gray-500 cursor-pointer"
                onClick={() => recentSearches.length > 0 && setShowRecentSearches(true)}
              >
                <Search className="h-4 w-4" />
              </div>
            </PopoverTrigger>
            
            {recentSearches.length > 0 && (
              <PopoverContent className="w-72 p-0" align="start">
                <div className="py-2 px-3 flex justify-between items-center border-b">
                  <p className="text-sm font-medium">Recent Searches</p>
                  {onClearRecentSearches && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        onClearRecentSearches();
                        setShowRecentSearches(false);
                      }}
                      className="h-7 text-xs px-2"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {recentSearches.map((search, index) => (
                    <div 
                      key={`${search}-${index}`} 
                      className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => applyRecentSearch(search)}
                    >
                      <Clock className="h-3.5 w-3.5 text-gray-500 mr-2" />
                      <span className="text-sm truncate">{search}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            )}
          </Popover>
          
          <Input
            ref={inputRef}
            type="text"
            value={localQuery.text}
            onChange={handleInputChange}
            className={`border-0 focus:outline-none focus:ring-0 flex-1 ${getInputSizeClasses()}`}
            placeholder={placeholder}
            disabled={isLoading || isSearching}
          />
          
          {localQuery.text && (
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setLocalQuery(prev => ({ ...prev, text: '' }));
                onClearSearch();
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          <button
            type="button"
            className={`px-3 h-full border-l border-gray-300 text-xs font-medium hover:bg-gray-50 transition-colors ${
              showAdvanced ? 'bg-gray-50 text-primary' : 'text-gray-500'
            }`}
            onClick={toggleAdvanced}
          >
            Advanced
          </button>
          
          <Button
            type="submit"
            variant="default"
            className={`rounded-none ${getInputSizeClasses()}`}
            disabled={!localQuery.text.trim() || isLoading || isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
        </div>
      </form>
      
      {/* Advanced search options */}
      {showAdvanced && (
        <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50 text-sm">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Field</label>
              <select
                value={localQuery.field || 'all'}
                onChange={handleFieldChange}
                className="w-32 h-8 border-gray-300 rounded-md text-xs focus:border-primary focus:ring-primary"
              >
                <option value="all">All Fields</option>
                <option value="subject">Subject</option>
                <option value="body">Body</option>
                <option value="sender">Sender</option>
                <option value="recipient">Recipient</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-4">
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={localQuery.caseSensitive || false}
                  onChange={() => handleToggleChange('caseSensitive')}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Case Sensitive</span>
              </label>
              
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={localQuery.useRegex || false}
                  onChange={() => handleToggleChange('useRegex')}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Use Regex</span>
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Search results counter */}
      {searchResult && searchResult.success && searchResult.totalResults > 0 && (
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {searchResult.currentIndex} of {searchResult.totalResults} results
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={onPreviousResult}
              disabled={searchResult.currentIndex <= 1}
              className="h-7 w-7 p-0"
              aria-label="Previous result"
            >
              <MoveUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={onNextResult}
              disabled={searchResult.currentIndex >= searchResult.totalResults}
              className="h-7 w-7 p-0"
              aria-label="Next result"
            >
              <MoveDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {searchResult && !searchResult.success && searchResult.errorMessage && (
        <div className="mt-2 text-xs text-red-500">
          {searchResult.errorMessage}
        </div>
      )}
      
      {/* No results message */}
      {searchResult && searchResult.success && searchResult.totalResults === 0 && localQuery.text && (
        <div className="mt-2 text-xs text-gray-500">
          No results found for "{localQuery.text}"
          {localQuery.useAdvanced && localQuery.field !== 'all' && (
            <span> in {getFieldLabel(localQuery.field || 'all')}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default InboxSearchBar; 