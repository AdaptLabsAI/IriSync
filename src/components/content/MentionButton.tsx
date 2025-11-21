import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { AtSign, Search, UserCheck, Users, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '../../ui/command';
import { Avatar } from '../../ui/avatar';
import { Badge } from '../../ui/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

export interface UserProfile {
  /**
   * Unique ID for the user
   */
  id: string;
  /**
   * Username (without @ symbol)
   */
  username: string;
  /**
   * Display name of the user
   */
  displayName: string;
  /**
   * URL to user's avatar/profile picture
   */
  avatarUrl?: string;
  /**
   * User's bio or description
   */
  bio?: string;
  /**
   * Number of followers
   */
  followers?: number;
  /**
   * Platforms this user is active on
   */
  platforms?: string[];
  /**
   * Whether this user is verified
   */
  isVerified?: boolean;
  /**
   * Whether this is a frequently mentioned user
   */
  isFrequent?: boolean;
  /**
   * Categories or groups this user belongs to
   */
  categories?: string[];
}

export interface MentionButtonProps {
  /**
   * Currently mentioned users
   */
  mentionedUsers: UserProfile[];
  /**
   * Suggested users to mention
   */
  suggestedUsers: UserProfile[];
  /**
   * Function to call when users are mentioned/unmentiond
   */
  onChange: (users: UserProfile[]) => void;
  /**
   * Function to call to search for users
   */
  onSearch?: (query: string) => Promise<UserProfile[]>;
  /**
   * Maximum number of users that can be mentioned
   */
  maxMentions?: number;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
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
 * MentionButton - Component for mentioning users in social media content
 */
export const MentionButton: React.FC<MentionButtonProps> = ({
  mentionedUsers,
  suggestedUsers,
  onChange,
  onSearch,
  maxMentions = 30,
  iconOnly = false,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Check if reached the mention limit
  const reachedLimit = mentionedUsers.length >= maxMentions;
  
  // Extract categories from suggested users
  const getCategories = () => {
    const categories = new Set<string>();
    
    suggestedUsers.forEach(user => {
      if (user.categories) {
        user.categories.forEach(category => categories.add(category));
      }
    });
    
    return Array.from(categories);
  };
  
  const categories = getCategories();
  
  // Filter suggested users based on search and selected category
  const getFilteredUsers = () => {
    // First filter out users already mentioned
    let filtered = [...suggestedUsers].filter(user => 
      !mentionedUsers.some(mentioned => mentioned.id === user.id)
    );
    
    // Then filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter(user => 
        user.categories?.includes(selectedCategory)
      );
    }
    
    // Then filter by search query if present
    if (searchQuery && !isSearching && searchResults.length === 0) {
      const query = searchQuery.toLowerCase().replace(/^@/, '');
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };
  
  // Get frequent users for quick mention
  const getFrequentUsers = () => {
    return getFilteredUsers().filter(user => user.isFrequent);
  };
  
  // Handle searching for users
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!onSearch || !query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const trimmedQuery = query.replace(/^@/, '');
    
    // Only search if query is different and long enough
    if (trimmedQuery.length >= 2) {
      setIsSearching(true);
      
      try {
        const results = await onSearch(trimmedQuery);
        
        // Filter out users already mentioned
        const filteredResults = results.filter(user => 
          !mentionedUsers.some(mentioned => mentioned.id === user.id)
        );
        
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching for users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  };
  
  // Handle selecting a user to mention
  const handleSelectUser = (user: UserProfile) => {
    if (reachedLimit) return;
    
    onChange([...mentionedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };
  
  // Handle removing a mention
  const handleRemoveMention = (userId: string) => {
    onChange(mentionedUsers.filter(user => user.id !== userId));
  };
  
  // Get filtered users
  const filteredUsers = getFilteredUsers();
  const frequentUsers = getFrequentUsers();
  
  // Determine which users to show based on search state
  const usersToShow = searchQuery && searchResults.length > 0 
    ? searchResults 
    : filteredUsers;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className}`}
          disabled={isDisabled}
        >
          <AtSign className="h-4 w-4 mr-2" />
          {!iconOnly && (
            <span className="flex gap-1 items-center">
              {mentionedUsers.length > 0 ? 'Mentions' : 'Mention'}
              {mentionedUsers.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {mentionedUsers.length}
                </Badge>
              )}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search users to mention..."
            value={searchQuery}
            onValueChange={handleSearch}
          />
          
          {mentionedUsers.length > 0 && (
            <div className="p-2 flex flex-wrap gap-1 border-b">
              {mentionedUsers.map(user => (
                <Badge 
                  key={user.id} 
                  variant="secondary"
                  className="flex items-center gap-1 pl-2 pr-1 py-1"
                >
                  @{user.username}
                  <button 
                    onClick={() => handleRemoveMention(user.id)}
                    className="ml-1 text-gray-500 hover:text-gray-700 rounded-full p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
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
              {isSearching ? (
                <div className="py-6 text-center text-sm text-gray-500 flex flex-col items-center">
                  <Loader2 className="h-4 w-4 animate-spin mb-2" />
                  <p>Searching...</p>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  <p>No users found</p>
                </div>
              )}
            </CommandEmpty>
            
            {frequentUsers.length > 0 && !searchQuery && (
              <CommandGroup heading="Frequent">
                {frequentUsers.map(user => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleSelectUser(user)}
                    disabled={reachedLimit}
                    className={`${reachedLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.displayName} />
                        ) : (
                          <div className="h-full w-full bg-blue-100 flex items-center justify-center text-blue-800 text-xs font-medium">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm flex items-center gap-1">
                          {user.displayName}
                          {user.isVerified && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <UserCheck className="h-3 w-3 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Verified User</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">@{user.username}</span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {frequentUsers.length > 0 && !searchQuery && usersToShow.length > 0 && (
              <CommandSeparator />
            )}
            
            {usersToShow.length > 0 && (
              <CommandGroup heading={searchQuery ? 'Search Results' : 'Suggested'}>
                {usersToShow.map(user => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleSelectUser(user)}
                    disabled={reachedLimit}
                    className={`${reachedLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.displayName} />
                        ) : (
                          <div className="h-full w-full bg-blue-100 flex items-center justify-center text-blue-800 text-xs font-medium">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm flex items-center gap-1">
                          {user.displayName}
                          {user.isVerified && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <UserCheck className="h-3 w-3 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Verified User</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">@{user.username}</span>
                      </div>
                      {user.followers !== undefined && (
                        <span className="ml-auto text-xs text-gray-500 flex items-center">
                          <Users className="h-3 w-3 mr-1" /> 
                          {user.followers > 1000 
                            ? `${(user.followers / 1000).toFixed(1)}k` 
                            : user.followers}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {reachedLimit && (
              <div className="px-2 py-1.5 text-xs text-red-500">
                Maximum {maxMentions} mentions reached
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MentionButton; 