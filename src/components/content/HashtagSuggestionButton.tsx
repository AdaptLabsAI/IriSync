import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Hash, Sparkles, Plus, X, Loader2, BrainCircuit } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Badge } from '../../ui/Badge';
import { Toggle } from '../../ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { useSubscription } from '../../hooks/useSubscription';
import { Card } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Slider } from '../../ui/slider';

// Import Hashtag type from HashtagButton component
import { Hashtag } from './HashtagButton';

export interface HashtagSuggestionButtonProps {
  /**
   * The content text to analyze for hashtag suggestions
   */
  contentText: string;
  /**
   * Currently selected hashtags
   */
  selectedHashtags: Hashtag[];
  /**
   * Function to call when hashtags are selected
   */
  onSelectHashtags: (hashtags: Hashtag[]) => void;
  /**
   * Library of existing hashtags (to avoid duplicates)
   */
  existingHashtags?: Hashtag[];
  /**
   * Function to call to get hashtag suggestions
   */
  onGetSuggestions: (
    text: string, 
    options: {
      relevance: number;
      maxSuggestions: number;
      includeTrading?: boolean;
      language?: string;
      categories?: string[];
    }
  ) => Promise<Hashtag[]>;
  /**
   * Maximum number of hashtags allowed
   */
  maxHashtags?: number;
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
  variant?: 'primary' | 'outline' | 'ghost';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * HashtagSuggestionButton - Component for suggesting hashtags based on content
 */
export const HashtagSuggestionButton: React.FC<HashtagSuggestionButtonProps> = ({
  contentText,
  selectedHashtags,
  onSelectHashtags,
  existingHashtags = [],
  onGetSuggestions,
  maxHashtags = 30,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Hashtag[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Hashtag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('relevant');
  const [relevance, setRelevance] = useState(75); // 0-100 scale
  const [maxSuggestions, setMaxSuggestions] = useState(15);
  const [includeTrending, setIncludeTrending] = useState(true);
  const { subscription } = useSubscription();
  
  const userTier = subscription?.tier || 'creator';
  
  // Check if reached the hashtag limit
  const reachedLimit = selectedHashtags.length >= maxHashtags;
  const remainingSlots = maxHashtags - selectedHashtags.length;
  
  // Check if suggestions are enabled based on subscription tier
  const canUseSuggestions = userTier === 'influencer' || userTier === 'enterprise';
  
  // Filter out already selected hashtags
  const getUnusedSuggestions = () => {
    return suggestions.filter(suggestion => 
      !selectedHashtags.some(selected => 
        selected.id === suggestion.id || selected.text.toLowerCase() === suggestion.text.toLowerCase()
      )
    );
  };
  
  // Get content length for validation
  const contentLength = contentText.trim().length;
  const minContentLength = 15;
  
  // Handle getting suggestions
  const handleGetSuggestions = async () => {
    if (!canUseSuggestions) return;
    if (contentLength < minContentLength) {
      setError(`Add more content (at least ${minContentLength} characters) to generate suggestions.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newSuggestions = await onGetSuggestions(
        contentText,
        {
          relevance: relevance / 100, // Convert to 0-1 scale
          maxSuggestions,
          includeTrading: includeTrending,
          language: 'en', // Default to English
        }
      );
      
      // Add temporary IDs if not provided
      const suggestionsWithIds = newSuggestions.map((suggestion, index) => {
        if (!suggestion.id) {
          return {
            ...suggestion,
            id: `suggestion-${Date.now()}-${index}`,
          };
        }
        return suggestion;
      });
      
      setSuggestions(suggestionsWithIds);
      setSelectedSuggestions([]);
    } catch (error) {
      console.error('Error getting hashtag suggestions:', error);
      setError('Failed to generate hashtag suggestions. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle selecting/deselecting a suggestion
  const handleToggleSuggestion = (hashtag: Hashtag) => {
    const isSelected = selectedSuggestions.some(selected => selected.id === hashtag.id);
    
    if (isSelected) {
      // Deselect
      setSelectedSuggestions(selectedSuggestions.filter(selected => selected.id !== hashtag.id));
    } else {
      // Select if we haven't reached the limit
      if (selectedSuggestions.length < remainingSlots) {
        setSelectedSuggestions([...selectedSuggestions, hashtag]);
      }
    }
  };
  
  // Handle applying selected suggestions
  const handleApplySuggestions = () => {
    if (selectedSuggestions.length === 0) return;
    
    onSelectHashtags([...selectedHashtags, ...selectedSuggestions]);
    setSelectedSuggestions([]);
    setOpen(false);
  };
  
  // Get suggestions based on active tab
  const getTabSuggestions = () => {
    const unusedSuggestions = getUnusedSuggestions();
    
    switch (activeTab) {
      case 'trending':
        return unusedSuggestions
          .filter(tag => tag.performance?.trend === 'up')
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      case 'relevant':
      default:
        return unusedSuggestions;
    }
  };
  
  const filteredSuggestions = getTabSuggestions();
  
  // Reset selections when popover closes
  useEffect(() => {
    if (!open) {
      setSelectedSuggestions([]);
    }
  }, [open]);
  
  // Auto-generate suggestions when content changes significantly
  useEffect(() => {
    if (open && canUseSuggestions && contentLength >= minContentLength && !isLoading) {
      const timer = setTimeout(() => {
        handleGetSuggestions();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [contentText, open, canUseSuggestions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className}`}
          disabled={isDisabled || !canUseSuggestions}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          <span className="flex gap-1 items-center">
            Suggest Hashtags
          </span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" sideOffset={8}>
        {!canUseSuggestions ? (
          <div className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Sparkles className="h-4 w-4" />
              <h3 className="font-medium">Hashtag Suggestions</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Upgrade to Influencer or Enterprise tier to unlock AI-powered hashtag suggestions.
            </p>
            <Button className="w-full" size="sm">
              Upgrade Plan
            </Button>
          </div>
        ) : (
          <>
            <div className="p-3 border-b">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1">
                  <BrainCircuit className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-sm">Hashtag Suggestions</h3>
                </div>
                <div className="text-xs text-gray-500">
                  {!reachedLimit 
                    ? `${remainingSlots} remaining`
                    : 'Limit reached'}
                </div>
              </div>
              
              {contentText.length === 0 && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Add content to your post to generate hashtag suggestions.
                </div>
              )}
            </div>
            
            <Tabs defaultValue="relevant" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-1">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="relevant" className="text-xs">Relevant</TabsTrigger>
                  <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="relevant" className="m-0">
                <div className="p-3 max-h-[280px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                      <p className="text-sm text-gray-500">Analyzing content...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-red-500 mb-2">{error}</p>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={handleGetSuggestions}
                        disabled={contentLength < minContentLength}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : filteredSuggestions.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-2">
                        {suggestions.length === 0
                          ? 'No suggestions generated yet'
                          : 'No unused suggestions available'}
                      </p>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={handleGetSuggestions}
                        disabled={contentLength < minContentLength}
                      >
                        Generate Suggestions
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {filteredSuggestions.map(hashtag => {
                          const isSelected = selectedSuggestions.some(
                            selected => selected.id === hashtag.id
                          );
                          return (
                            <Badge
                              key={hashtag.id}
                              variant={isSelected ? 'default' : 'outline'}
                              className={`cursor-pointer ${
                                remainingSlots === 0 && !isSelected
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }`}
                              onClick={() => remainingSlots > 0 || isSelected ? handleToggleSuggestion(hashtag) : null}
                            >
                              #{hashtag.text}
                              {isSelected && (
                                <span className="ml-1 text-xs">✓</span>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                      
                      <div className="pt-2 text-xs text-gray-500">
                        <p>Click hashtags to select/deselect them</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="trending" className="m-0">
                <div className="p-3 max-h-[280px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                      <p className="text-sm text-gray-500">Finding trending hashtags...</p>
                    </div>
                  ) : filteredSuggestions.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-2">
                        No trending hashtags found
                      </p>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={handleGetSuggestions}
                        disabled={contentLength < minContentLength}
                      >
                        Find Trending Hashtags
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {filteredSuggestions.map(hashtag => {
                          const isSelected = selectedSuggestions.some(
                            selected => selected.id === hashtag.id
                          );
                          return (
                            <Badge
                              key={hashtag.id}
                              variant={isSelected ? 'default' : 'outline'}
                              className={`cursor-pointer ${
                                remainingSlots === 0 && !isSelected
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }`}
                              onClick={() => remainingSlots > 0 || isSelected ? handleToggleSuggestion(hashtag) : null}
                            >
                              #{hashtag.text}
                              {hashtag.usageCount && (
                                <span className="ml-1 text-xs">{hashtag.usageCount > 1000 
                                  ? `${(hashtag.usageCount / 1000).toFixed(1)}k` 
                                  : hashtag.usageCount}
                                </span>
                              )}
                              {isSelected && (
                                <span className="ml-1 text-xs">✓</span>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="border-t p-2">
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={handleGetSuggestions}
                  disabled={isLoading || contentLength < minContentLength}
                  className="text-xs h-8"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Regenerate
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline" 
                    size="sm"
                    onClick={() => setOpen(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary" 
                    size="sm"
                    onClick={handleApplySuggestions}
                    disabled={selectedSuggestions.length === 0}
                    className="text-xs h-8"
                  >
                    Add {selectedSuggestions.length > 0 ? selectedSuggestions.length : ''}
                  </Button>
                </div>
              </div>
            </div>
            
            {userTier === 'enterprise' && (
              <Card className="m-2 p-2 bg-gray-50">
                <p className="text-xs font-medium mb-2">Advanced Options</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Relevance</span>
                      <span>{relevance}%</span>
                    </div>
                    <Slider 
                      value={[relevance]} 
                      onValueChange={(value: any) => setRelevance(value[0])}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="trending-toggle" className="text-xs">
                      Include trending hashtags
                    </label>
                    <Toggle
                      id="trending-toggle"
                      pressed={includeTrending}
                      onPressedChange={setIncludeTrending}
                      size="sm"
                    />
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default HashtagSuggestionButton; 