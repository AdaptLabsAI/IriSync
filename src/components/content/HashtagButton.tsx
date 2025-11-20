import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Hash, Plus, X, Loader2, CheckCircle2, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '../../ui/command';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { useSubscription } from '../../hooks/useSubscription';

export interface Hashtag {
  /**
   * Unique ID for the hashtag
   */
  id: string;
  /**
   * Hashtag text (without the # symbol)
   */
  text: string;
  /**
   * Optional usage count
   */
  usageCount?: number;
  /**
   * Category for organizing hashtags
   */
  category?: string;
  /**
   * Optional performance metrics
   */
  performance?: {
    engagementRate?: number;
    impressions?: number;
    clicks?: number;
    trend?: 'up' | 'down' | 'stable';
  };
  /**
   * Optional date this hashtag was last used
   */
  lastUsed?: Date | string;
  /**
   * Whether this is a favorite hashtag
   */
  isFavorite?: boolean;
}

export interface HashtagButtonProps {
  /**
   * Currently selected hashtags
   */
  selectedHashtags: Hashtag[];
  /**
   * Hashtag library to select from
   */
  hashtagLibrary: Hashtag[];
  /**
   * Categories to organize hashtags
   */
  categories?: string[];
  /**
   * Function to call when hashtags are selected/deselected
   */
  onChange: (hashtags: Hashtag[]) => void;
  /**
   * Function to call when a new hashtag is created
   */
  onCreateHashtag?: (text: string, category?: string) => Promise<Hashtag | null>;
  /**
   * Maximum number of hashtags allowed
   */
  maxHashtags?: number;
  /**
   * Whether to suggest popular hashtags
   */
  suggestPopular?: boolean;
  /**
   * Whether to show performance metrics
   */
  showMetrics?: boolean;
  /**
   * Whether to allow hashtag creation
   */
  allowCreate?: boolean;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * HashtagButton - Component for selecting and managing hashtags for social media content
 */
export const HashtagButton: React.FC<HashtagButtonProps> = ({
  selectedHashtags,
  hashtagLibrary,
  categories = [],
  onChange,
  onCreateHashtag,
  maxHashtags = 30,
  suggestPopular = true,
  showMetrics = false,
  allowCreate = true,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newHashtagText, setNewHashtagText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { subscription } = useSubscription();
  
  const userTier = subscription?.tier || 'creator';
  
  // Check if user can create hashtags based on subscription tier
  const canCreateHashtag = allowCreate && (
    userTier === 'influencer' || userTier === 'enterprise'
  );
  
  // Check if reached the hashtag limit
  const reachedLimit = selectedHashtags.length >= maxHashtags;
  
  // Filter hashtags based on search and selected category
  const getFilteredHashtags = () => {
    let filtered = [...hashtagLibrary].filter(tag => 
      !selectedHashtags.some(selected => selected.id === tag.id)
    );
    
    if (search) {
      const searchLower = search.toLowerCase().replace(/^#/, '');
      filtered = filtered.filter(tag => 
        tag.text.toLowerCase().includes(searchLower) ||
        (tag.category && tag.category.toLowerCase().includes(searchLower))
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(tag => tag.category === selectedCategory);
    }
    
    return filtered;
  };
  
  // Get suggested hashtags based on popular/trending
  const getSuggestedHashtags = () => {
    if (!suggestPopular) return [];
    
    return getFilteredHashtags()
      .sort((a, b) => {
        const aCount = a.usageCount || 0;
        const bCount = b.usageCount || 0;
        return bCount - aCount;
      })
      .slice(0, 5);
  };
  
  // Handle selecting a hashtag
  const handleSelectHashtag = (hashtag: Hashtag) => {
    if (reachedLimit) {
      toast({
        title: "Hashtag limit reached",
        description: `You can only add up to ${maxHashtags} hashtags.`,
        variant: "destructive",
      });
      return;
    }
    
    onChange([...selectedHashtags, hashtag]);
  };
  
  // Handle removing a hashtag
  const handleRemoveHashtag = (hashtagId: string) => {
    onChange(selectedHashtags.filter(tag => tag.id !== hashtagId));
  };
  
  // Handle creating a new hashtag
  const handleCreateHashtag = async () => {
    if (!canCreateHashtag || !onCreateHashtag) return;
    
    let text = newHashtagText.trim();
    
    // Remove # if present
    if (text.startsWith('#')) {
      text = text.substring(1);
    }
    
    if (!text) return;
    
    setIsCreating(true);
    
    try {
      const newHashtag = await onCreateHashtag(text, selectedCategory || undefined);
      
      if (newHashtag) {
        // Add to selected hashtags
        onChange([...selectedHashtags, newHashtag]);
        
        toast({
          title: "Hashtag created",
          description: `Added #${text} to your hashtag library.`,
        });
        
        // Reset state
        setNewHashtagText('');
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating hashtag:', error);
      toast({
        title: "Failed to create hashtag",
        description: "An error occurred while creating the hashtag.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Format trend indicator
  const formatTrend = (trend?: 'up' | 'down' | 'stable') => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <span className="text-[#00CC44] text-xs">↑</span>;
      case 'down':
        return <span className="text-red-500 text-xs">↓</span>;
      case 'stable':
        return <span className="text-gray-500 text-xs">→</span>;
      default:
        return null;
    }
  };
  
  // Focus input when create form is shown
  useEffect(() => {
    if (showCreateForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreateForm]);
  
  // Get filtered hashtags
  const filteredHashtags = getFilteredHashtags();
  const suggestedHashtags = getSuggestedHashtags();
  
  // Organize hashtags by category
  const getHashtagsByCategory = () => {
    const byCategory: Record<string, Hashtag[]> = {};
    
    // Add category groups
    categories.forEach(category => {
      byCategory[category] = [];
    });
    
    // Add "Uncategorized" for hashtags without a category
    byCategory["Uncategorized"] = [];
    
    // Sort hashtags into categories
    filteredHashtags.forEach(tag => {
      if (tag.category && byCategory[tag.category]) {
        byCategory[tag.category].push(tag);
      } else {
        byCategory["Uncategorized"].push(tag);
      }
    });
    
    // Remove empty categories
    Object.keys(byCategory).forEach(key => {
      if (byCategory[key].length === 0) {
        delete byCategory[key];
      }
    });
    
    return byCategory;
  };
  
  const hashtagsByCategory = getHashtagsByCategory();

  return (
    <div className="flex flex-col">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={`${className}`}
            disabled={isDisabled}
          >
            <Hash className="h-4 w-4 mr-2" />
            <span className="flex gap-1 items-center">
              Hashtags
              {selectedHashtags.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedHashtags.length}
                </Badge>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search hashtags..."
              value={search}
              onValueChange={setSearch}
            />
            
            <div className="p-2 flex flex-wrap gap-1 border-b">
              {selectedHashtags.map(tag => (
                <Badge 
                  key={tag.id} 
                  variant="secondary"
                  className="flex items-center gap-1 pl-2 pr-1 py-1"
                >
                  #{tag.text}
                  <button 
                    onClick={() => handleRemoveHashtag(tag.id)}
                    className="ml-1 text-gray-500 hover:text-gray-700 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              {selectedHashtags.length === 0 && (
                <div className="text-xs text-gray-500 py-1 px-2">
                  No hashtags selected
                </div>
              )}
            </div>
            
            {categories.length > 0 && (
              <div className="p-2 border-b overflow-x-auto">
                <div className="flex gap-1">
                  <Badge 
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Badge>
                  
                  {categories.map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <CommandList className="max-h-64 overflow-y-auto">
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-gray-500">
                  <p>No hashtags found</p>
                  {canCreateHashtag && search && (
                    <button
                      onClick={() => {
                        setNewHashtagText(search);
                        setShowCreateForm(true);
                      }}
                      className="mt-2 text-blue-500 hover:text-blue-700"
                    >
                      Create #{search.replace(/^#/, '')}
                    </button>
                  )}
                </div>
              </CommandEmpty>
              
              {showCreateForm ? (
                <div className="p-3">
                  <h3 className="font-medium text-sm mb-2">Create New Hashtag</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Hashtag Text
                      </label>
                      <div className="flex relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          #
                        </span>
                        <input
                          ref={inputRef}
                          type="text"
                          value={newHashtagText.replace(/^#/, '')}
                          onChange={(e: any) => setNewHashtagText(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 text-sm border border-gray-300 rounded-md"
                          placeholder="EnterHashtagWithoutSpaces"
                        />
                      </div>
                    </div>
                    
                    {categories.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">
                          Category (Optional)
                        </label>
                        <select
                          value={selectedCategory || ''}
                          onChange={(e: any) => setSelectedCategory(e.target.value || null)}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md"
                        >
                          <option value="">None</option>
                          {categories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewHashtagText('');
                        }}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateHashtag}
                        disabled={!newHashtagText.trim() || isCreating}
                        className="h-8 text-xs"
                      >
                        {isCreating ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1" />
                        )}
                        Create Hashtag
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {suggestedHashtags.length > 0 && (
                    <CommandGroup heading="Suggested">
                      {suggestedHashtags.map(tag => (
                        <CommandItem
                          key={tag.id}
                          onSelect={() => handleSelectHashtag(tag)}
                          disabled={reachedLimit}
                          className={`${reachedLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <span className="font-medium">#{tag.text}</span>
                              {tag.usageCount !== undefined && (
                                <span className="ml-2 text-xs text-gray-500">
                                  {tag.usageCount} uses
                                </span>
                              )}
                            </div>
                            {showMetrics && tag.performance?.trend && (
                              <span className="ml-2">{formatTrend(tag.performance.trend)}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  
                  {suggestedHashtags.length > 0 && Object.keys(hashtagsByCategory).length > 0 && (
                    <CommandSeparator />
                  )}
                  
                  {Object.entries(hashtagsByCategory).map(([category, hashtags]) => (
                    hashtags.length > 0 && (
                      <CommandGroup key={category} heading={category}>
                        {hashtags.map(tag => (
                          <CommandItem
                            key={tag.id}
                            onSelect={() => handleSelectHashtag(tag)}
                            disabled={reachedLimit}
                            className={`${reachedLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <span className="font-medium">#{tag.text}</span>
                                {tag.isFavorite && (
                                  <span className="ml-1 text-yellow-500">★</span>
                                )}
                              </div>
                              {showMetrics && tag.performance?.engagementRate && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center text-xs text-gray-500">
                                        <span>{Math.round(tag.performance.engagementRate * 100) / 100}%</span>
                                        {tag.performance.trend && (
                                          <span className="ml-1">{formatTrend(tag.performance.trend)}</span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Average engagement rate: {Math.round(tag.performance.engagementRate * 100) / 100}%</p>
                                      {tag.performance.impressions && (
                                        <p>Impressions: {tag.performance.impressions.toLocaleString()}</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )
                  ))}
                  
                  {canCreateHashtag && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-blue-500"
                        onClick={() => setShowCreateForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create new hashtag
                      </Button>
                    </div>
                  )}
                  
                  {!canCreateHashtag && allowCreate && (
                    <div className="p-3 border-t">
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span>Upgrade to create custom hashtags and track performance</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {reachedLimit && (
        <p className="text-xs text-red-500 mt-1">
          Maximum {maxHashtags} hashtags reached
        </p>
      )}
    </div>
  );
};

export default HashtagButton; 