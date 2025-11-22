import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Users, Search, PlusCircle, XCircle, Loader, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

export interface Competitor {
  /**
   * Competitor ID
   */
  id: string;
  /**
   * Competitor name
   */
  name: string;
  /**
   * Platform details
   */
  platforms: {
    platformId: string;
    platformName: string;
    handle: string;
    profileUrl?: string;
    avatarUrl?: string;
  }[];
  /**
   * Whether this competitor is saved/tracked
   */
  isSaved: boolean;
}

export interface CompetitorComparisonButtonProps {
  /**
   * Currently active competitors for comparison
   */
  activeCompetitors?: Competitor[];
  /**
   * Maximum number of competitors that can be selected
   */
  maxCompetitors?: number;
  /**
   * User's subscription tier
   */
  userTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Saved/tracked competitors
   */
  savedCompetitors?: Competitor[];
  /**
   * Callback when searching for competitors
   */
  onSearchCompetitors: (query: string) => Promise<Competitor[]>;
  /**
   * Callback when competitors are selected/changed
   */
  onCompetitorsChange: (competitors: Competitor[]) => void;
  /**
   * Callback to save a competitor for future use
   */
  onSaveCompetitor?: (competitor: Competitor) => Promise<void>;
  /**
   * Callback to remove a saved competitor
   */
  onRemoveCompetitor?: (competitorId: string) => Promise<void>;
  /**
   * Optional variant
   */
  variant?: 'primary' | 'outline' | 'ghost';
  /**
   * Optional size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show as icon-only button
   */
  iconOnly?: boolean;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Optional CSS class
   */
  className?: string;
}

/**
 * CompetitorComparisonButton - Button to manage and activate competitor comparisons
 */
const CompetitorComparisonButton: React.FC<CompetitorComparisonButtonProps> = ({
  activeCompetitors = [],
  maxCompetitors = 3,
  userTier,
  savedCompetitors = [],
  onSearchCompetitors,
  onCompetitorsChange,
  onSaveCompetitor,
  onRemoveCompetitor,
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
  disabled = false,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('saved');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Competitor[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Competitor[]>(activeCompetitors);
  
  // Check if competitor comparison is available for this tier
  const isFeatureAvailable = userTier === 'enterprise';
  
  // Calculate how many more competitors can be selected
  const remainingSelections = maxCompetitors - selectedCompetitors.length;
  
  const handleSearch = async () => {
    if (!searchQuery.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const results = await onSearchCompetitors(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching competitors:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleToggleCompetitor = (competitor: Competitor, isSelected: boolean) => {
    if (isSelected) {
      if (selectedCompetitors.length >= maxCompetitors) return;
      setSelectedCompetitors([...selectedCompetitors, competitor]);
    } else {
      setSelectedCompetitors(selectedCompetitors.filter(c => c.id !== competitor.id));
    }
  };
  
  const handleSaveCompetitor = async (competitor: Competitor) => {
    if (!onSaveCompetitor) return;
    
    setIsLoading(true);
    try {
      await onSaveCompetitor(competitor);
      // Update competitor in search results to show it's now saved
      setSearchResults(searchResults.map(c => 
        c.id === competitor.id ? { ...c, isSaved: true } : c
      ));
    } catch (error) {
      console.error("Error saving competitor:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveCompetitor = async (competitor: Competitor) => {
    if (!onRemoveCompetitor) return;
    
    setIsLoading(true);
    try {
      await onRemoveCompetitor(competitor.id);
      // Update saved competitors list
      const updatedSaved = savedCompetitors.filter(c => c.id !== competitor.id);
      // If the competitor is in our search results, update its saved status
      setSearchResults(searchResults.map(c => 
        c.id === competitor.id ? { ...c, isSaved: false } : c
      ));
    } catch (error) {
      console.error("Error removing competitor:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApplyComparison = () => {
    onCompetitorsChange(selectedCompetitors);
    setIsDialogOpen(false);
  };
  
  const isCompetitorSelected = (competitorId: string): boolean => {
    return selectedCompetitors.some(c => c.id === competitorId);
  };
  
  return (
    <>
      <Button
        variant={activeCompetitors.length > 0 ? 'primary' : variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || !isFeatureAvailable}
      >
        <Users className="h-4 w-4" />
        {!iconOnly && (
          <span>
            {activeCompetitors.length > 0 
              ? `Comparing (${activeCompetitors.length})` 
              : 'Compare Competitors'}
          </span>
        )}
        {!isFeatureAvailable && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle>Compare with Competitors</DialogTitle>
          
          {!isFeatureAvailable ? (
            <div className="p-4 text-center">
              <Lock className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">Feature Not Available</p>
              <p className="text-sm text-gray-500 mt-1">
                Competitor comparison is an Enterprise tier feature.
              </p>
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={() => setIsDialogOpen(false)}
              >
                Upgrade to Enterprise
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-[#00CC44]" />
                  <span>
                    {selectedCompetitors.length} of {maxCompetitors} competitors selected
                  </span>
                </div>
                
                {selectedCompetitors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCompetitors.map(competitor => (
                      <div
                        key={competitor.id}
                        className="flex items-center gap-2 bg-[#00FF6A]/5 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{competitor.name}</span>
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => handleToggleCompetitor(competitor, false)}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="saved">
                      Saved ({savedCompetitors.length})
                    </TabsTrigger>
                    <TabsTrigger value="search">
                      Find New
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="saved" className="space-y-4">
                    {savedCompetitors.length === 0 ? (
                      <div className="text-center p-6">
                        <p className="text-gray-500">No saved competitors yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Use the "Find New" tab to search and save competitors
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {savedCompetitors.map(competitor => (
                          <div
                            key={competitor.id}
                            className="flex items-center justify-between border rounded-md p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`competitor-${competitor.id}`}
                                checked={isCompetitorSelected(competitor.id)}
                                onCheckedChange={(checked: any) => 
                                  handleToggleCompetitor(competitor, checked as boolean)
                                }
                                disabled={!isCompetitorSelected(competitor.id) && remainingSelections <= 0}
                              />
                              <div>
                                <Label 
                                  htmlFor={`competitor-${competitor.id}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {competitor.name}
                                </Label>
                                {competitor.platforms.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {competitor.platforms.map(p => p.platformName).join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {onRemoveCompetitor && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-600"
                                onClick={() => handleRemoveCompetitor(competitor)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="search" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search by name or social handle"
                        value={searchQuery}
                        onChange={(e: any) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyPress}
                      />
                      <Button
                        variant="outline"
                        onClick={handleSearch}
                        disabled={isLoading || !searchQuery.trim()}
                      >
                        {isLoading ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map(competitor => (
                          <div
                            key={competitor.id}
                            className="flex items-center justify-between border rounded-md p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`search-competitor-${competitor.id}`}
                                checked={isCompetitorSelected(competitor.id)}
                                onCheckedChange={(checked: any) => 
                                  handleToggleCompetitor(competitor, checked as boolean)
                                }
                                disabled={!isCompetitorSelected(competitor.id) && remainingSelections <= 0}
                              />
                              <div>
                                <Label 
                                  htmlFor={`search-competitor-${competitor.id}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {competitor.name}
                                </Label>
                                {competitor.platforms.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {competitor.platforms.map(p => `${p.platformName}: ${p.handle}`).join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {onSaveCompetitor && !competitor.isSaved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-[#00CC44]"
                                onClick={() => handleSaveCompetitor(competitor)}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {onRemoveCompetitor && competitor.isSaved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-600"
                                onClick={() => handleRemoveCompetitor(competitor)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      searchQuery.trim() && !isLoading && (
                        <div className="text-center p-6">
                          <p className="text-gray-500">No results found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Try a different search term
                          </p>
                        </div>
                      )
                    )}
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="flex justify-between mt-6">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                
                <Button
                  variant="primary"
                  onClick={handleApplyComparison}
                  disabled={selectedCompetitors.length === 0}
                >
                  Apply Comparison
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompetitorComparisonButton; 