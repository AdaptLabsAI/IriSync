import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Filter, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

export interface MediaFilters {
  /**
   * Filter by media type
   */
  types?: ('image' | 'video' | 'document' | 'all')[];
  /**
   * Filter by date range
   */
  dateRange?: 'last7days' | 'last30days' | 'last90days' | 'lastYear' | 'all';
  /**
   * Sort order
   */
  sortBy?: 'newest' | 'oldest' | 'name' | 'size';
  /**
   * Filter by tags
   */
  tags?: string[];
}

export interface MediaFilterButtonProps {
  /**
   * Current active filters
   */
  activeFilters: MediaFilters;
  /**
   * Callback when filters change
   */
  onFiltersChange: (filters: MediaFilters) => void;
  /**
   * Available tags for filtering
   */
  availableTags?: string[];
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Option to override default button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
}

/**
 * MediaFilterButton - Button to filter media library items
 */
export const MediaFilterButton: React.FC<MediaFilterButtonProps> = ({
  activeFilters,
  onFiltersChange,
  availableTags = [],
  className = '',
  size = 'sm',
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<MediaFilters>(activeFilters);
  
  // Count active filters (excluding default values)
  const getActiveFilterCount = (): number => {
    let count = 0;
    
    if (localFilters.types && 
        !(localFilters.types.length === 1 && localFilters.types[0] === 'all')) {
      count += 1;
    }
    
    if (localFilters.dateRange && localFilters.dateRange !== 'all') {
      count += 1;
    }
    
    if (localFilters.sortBy && localFilters.sortBy !== 'newest') {
      count += 1;
    }
    
    if (localFilters.tags && localFilters.tags.length > 0) {
      count += 1;
    }
    
    return count;
  };
  
  // Handle type selection
  const handleTypeChange = (type: 'image' | 'video' | 'document' | 'all') => {
    if (type === 'all') {
      setLocalFilters(prev => ({
        ...prev,
        types: ['all']
      }));
    } else {
      setLocalFilters(prev => {
        const currentTypes = prev.types || [];
        
        // Remove 'all' if it exists
        const filteredTypes = currentTypes.filter(t => t !== 'all');
        
        // Toggle the selected type
        const newTypes = filteredTypes.includes(type)
          ? filteredTypes.filter(t => t !== type)
          : [...filteredTypes, type];
        
        // If nothing is selected, default to 'all'
        if (newTypes.length === 0) {
          return { ...prev, types: ['all'] };
        }
        
        return { ...prev, types: newTypes };
      });
    }
  };
  
  // Handle date range selection
  const handleDateRangeChange = (value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      dateRange: value as MediaFilters['dateRange']
    }));
  };
  
  // Handle sort order selection
  const handleSortChange = (value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      sortBy: value as MediaFilters['sortBy']
    }));
  };
  
  // Handle tag selection
  const handleTagToggle = (tag: string) => {
    setLocalFilters(prev => {
      const currentTags = prev.tags || [];
      
      return {
        ...prev,
        tags: currentTags.includes(tag)
          ? currentTags.filter(t => t !== tag)
          : [...currentTags, tag]
      };
    });
  };
  
  // Apply filters
  const applyFilters = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };
  
  // Reset filters to defaults
  const resetFilters = () => {
    const defaultFilters: MediaFilters = {
      types: ['all'],
      dateRange: 'all',
      sortBy: 'newest',
      tags: []
    };
    
    setLocalFilters(defaultFilters);
  };
  
  // Determine if type is checked
  const isTypeChecked = (type: 'image' | 'video' | 'document' | 'all'): boolean => {
    const types = localFilters.types || [];
    
    if (type === 'all') {
      return types.includes('all');
    }
    
    return types.includes(type);
  };
  
  // Get the active filter count badge
  const activeFilterCount = getActiveFilterCount();
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled}
          aria-label="Filter media"
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary/10 px-1.5 py-0.5 rounded-full text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Filter Media</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
          
          <Separator />
          
          {/* Media Type Filter */}
          <div>
            <h4 className="text-sm font-medium mb-2">Media Type</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="type-all"
                  checked={isTypeChecked('all')}
                  onCheckedChange={() => handleTypeChange('all')}
                />
                <Label htmlFor="type-all" className="text-sm">All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="type-image"
                  checked={isTypeChecked('image')}
                  onCheckedChange={() => handleTypeChange('image')}
                />
                <Label htmlFor="type-image" className="text-sm">Images</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="type-video"
                  checked={isTypeChecked('video')}
                  onCheckedChange={() => handleTypeChange('video')}
                />
                <Label htmlFor="type-video" className="text-sm">Videos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="type-document"
                  checked={isTypeChecked('document')}
                  onCheckedChange={() => handleTypeChange('document')}
                />
                <Label htmlFor="type-document" className="text-sm">Documents</Label>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Date Range Filter */}
          <div>
            <h4 className="text-sm font-medium mb-2">Date Added</h4>
            <RadioGroup 
              value={localFilters.dateRange || 'all'}
              onValueChange={handleDateRangeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="date-all" />
                <Label htmlFor="date-all" className="text-sm">All time</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last7days" id="date-7days" />
                <Label htmlFor="date-7days" className="text-sm">Last 7 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last30days" id="date-30days" />
                <Label htmlFor="date-30days" className="text-sm">Last 30 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last90days" id="date-90days" />
                <Label htmlFor="date-90days" className="text-sm">Last 90 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lastYear" id="date-year" />
                <Label htmlFor="date-year" className="text-sm">Last year</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Separator />
          
          {/* Sort Order */}
          <div>
            <h4 className="text-sm font-medium mb-2">Sort By</h4>
            <RadioGroup 
              value={localFilters.sortBy || 'newest'}
              onValueChange={handleSortChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="newest" id="sort-newest" />
                <Label htmlFor="sort-newest" className="text-sm">Newest</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oldest" id="sort-oldest" />
                <Label htmlFor="sort-oldest" className="text-sm">Oldest</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="name" id="sort-name" />
                <Label htmlFor="sort-name" className="text-sm">Name (A to Z)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="size" id="sort-size" />
                <Label htmlFor="sort-size" className="text-sm">Size (largest first)</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="max-h-[120px] overflow-y-auto space-y-1 pr-2">
                  {availableTags.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`tag-${tag}`}
                        checked={(localFilters.tags || []).includes(tag)}
                        onCheckedChange={() => handleTagToggle(tag)}
                      />
                      <Label htmlFor={`tag-${tag}`} className="text-sm">{tag}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MediaFilterButton; 