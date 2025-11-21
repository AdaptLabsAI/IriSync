import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button, ButtonVariant, ButtonSize } from '../../ui/button';
import { Filter, Check, X, ChevronDown, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Badge } from '../../ui/Badge';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';

export type MessageStatus = 'read' | 'unread' | 'starred' | 'responded' | 'assigned' | 'needs_response';
export type MessageType = 'comment' | 'mention' | 'dm' | 'review' | 'support' | 'other';

export interface MessageFilter {
  /**
   * Platforms to filter by
   */
  platforms: string[];
  /**
   * Message status filters
   */
  status: MessageStatus[];
  /**
   * Message type filters
   */
  type: MessageType[];
  /**
   * Date range filter - start date
   */
  dateFrom?: Date;
  /**
   * Date range filter - end date
   */
  dateTo?: Date;
  /**
   * Filter by assigned user ID 
   */
  assignedTo?: string[];
}

export interface PlatformOption {
  /**
   * Platform ID
   */
  id: string;
  /**
   * Platform name
   */
  name: string;
  /**
   * Platform icon element
   */
  icon?: React.ReactNode;
  /**
   * Whether the platform is connected and available
   */
  isConnected: boolean;
}

export interface UserOption {
  /**
   * User ID
   */
  id: string;
  /**
   * User display name
   */
  name: string;
  /**
   * User avatar URL
   */
  avatarUrl?: string;
}

export interface MessageFilterButtonProps {
  /**
   * Current filter values
   */
  filters: MessageFilter;
  /**
   * Function to call when filters change
   */
  onFiltersChange: (filters: MessageFilter) => void;
  /**
   * Available platforms to filter by
   */
  availablePlatforms: PlatformOption[];
  /**
   * Available team members to filter by assignment
   */
  teamMembers?: UserOption[];
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Button variant
   */
  variant?: ButtonVariant;
}

/**
 * MessageFilterButton - Button for filtering inbox messages by various criteria
 */
export const MessageFilterButton: React.FC<MessageFilterButtonProps> = ({
  filters,
  onFiltersChange,
  availablePlatforms,
  teamMembers = [],
  className = '',
  disabled = false,
  isLoading = false,
  size = 'sm',
  variant = 'outline',
}) => {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<MessageFilter>({ ...filters });
  
  // Update local state when props change
  useEffect(() => {
    setLocalFilters({ ...filters });
  }, [filters]);
  
  // Helper to count active filters
  const countActiveFilters = (filters: MessageFilter): number => {
    let count = 0;
    if (filters.platforms.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.type.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.assignedTo && filters.assignedTo.length > 0) count++;
    return count;
  };
  
  const activeFilterCount = countActiveFilters(filters);
  
  // Apply filters
  const applyFilters = () => {
    onFiltersChange({ ...localFilters });
    setOpen(false);
  };
  
  // Reset all filters
  const resetFilters = () => {
    const resetValue: MessageFilter = {
      platforms: [],
      status: [],
      type: [],
      dateFrom: undefined,
      dateTo: undefined,
      assignedTo: [],
    };
    setLocalFilters(resetValue);
    onFiltersChange(resetValue);
  };
  
  // Toggle a platform filter
  const togglePlatform = (platformId: string) => {
    setLocalFilters(prev => {
      const newPlatforms = prev.platforms.includes(platformId)
        ? prev.platforms.filter(id => id !== platformId)
        : [...prev.platforms, platformId];
      
      return { ...prev, platforms: newPlatforms };
    });
  };
  
  // Toggle a status filter
  const toggleStatus = (status: MessageStatus) => {
    setLocalFilters(prev => {
      const newStatus = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
      
      return { ...prev, status: newStatus };
    });
  };
  
  // Toggle a message type filter
  const toggleType = (type: MessageType) => {
    setLocalFilters(prev => {
      const newTypes = prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type];
      
      return { ...prev, type: newTypes };
    });
  };
  
  // Toggle an assigned user filter
  const toggleAssignedTo = (userId: string) => {
    setLocalFilters(prev => {
      const newAssigned = prev.assignedTo ? 
        (prev.assignedTo.includes(userId)
          ? prev.assignedTo.filter(id => id !== userId)
          : [...prev.assignedTo, userId])
        : [userId];
      
      return { ...prev, assignedTo: newAssigned };
    });
  };
  
  // Update date range
  const updateDateRange = (type: 'from' | 'to', dateString: string) => {
    const date = dateString ? new Date(dateString) : undefined;
    
    setLocalFilters(prev => ({
      ...prev,
      dateFrom: type === 'from' ? date : prev.dateFrom,
      dateTo: type === 'to' ? date : prev.dateTo,
    }));
  };
  
  // Format date for input value
  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={activeFilterCount > 0 ? 'primary' : variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Filter className="h-4 w-4" />
          )}
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <Badge className="ml-1" variant="filled" color="primary">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Filter Messages</h3>
            {countActiveFilters(localFilters) > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="h-7 text-xs px-2"
              >
                Reset all
              </Button>
            )}
          </div>
          
          {/* Platforms filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500">Platforms</h4>
            <div className="grid grid-cols-2 gap-1">
              {availablePlatforms.map(platform => (
                <div 
                  key={platform.id}
                  className={`flex items-center space-x-2 p-2 rounded-md border ${
                    localFilters.platforms.includes(platform.id) 
                      ? 'border-primary/40 bg-primary/5' 
                      : 'border-gray-200'
                  } ${!platform.isConnected ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    id={`platform-${platform.id}`}
                    checked={localFilters.platforms.includes(platform.id)}
                    onChange={() => platform.isConnected && togglePlatform(platform.id)}
                    disabled={!platform.isConnected}
                  />
                  <Label
                    htmlFor={`platform-${platform.id}`}
                    className="flex items-center text-sm cursor-pointer"
                  >
                    {platform.icon && <span className="mr-1.5">{platform.icon}</span>}
                    {platform.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Status filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500">Status</h4>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'read', label: 'Read' },
                { id: 'unread', label: 'Unread' },
                { id: 'starred', label: 'Starred' },
                { id: 'responded', label: 'Responded' },
                { id: 'assigned', label: 'Assigned' },
                { id: 'needs_response', label: 'Needs Response' },
              ].map(status => (
                <div 
                  key={status.id}
                  className={`flex items-center space-x-2 p-2 rounded-md border ${
                    localFilters.status.includes(status.id as MessageStatus) 
                      ? 'border-primary/40 bg-primary/5' 
                      : 'border-gray-200'
                  }`}
                >
                  <Checkbox
                    id={`status-${status.id}`}
                    checked={localFilters.status.includes(status.id as MessageStatus)}
                    onChange={() => toggleStatus(status.id as MessageStatus)}
                  />
                  <Label
                    htmlFor={`status-${status.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Message type filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500">Message Type</h4>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'comment', label: 'Comments' },
                { id: 'mention', label: 'Mentions' },
                { id: 'dm', label: 'Direct Messages' },
                { id: 'review', label: 'Reviews' },
                { id: 'support', label: 'Support' },
                { id: 'other', label: 'Other' },
              ].map(type => (
                <div 
                  key={type.id}
                  className={`flex items-center space-x-2 p-2 rounded-md border ${
                    localFilters.type.includes(type.id as MessageType) 
                      ? 'border-primary/40 bg-primary/5' 
                      : 'border-gray-200'
                  }`}
                >
                  <Checkbox
                    id={`type-${type.id}`}
                    checked={localFilters.type.includes(type.id as MessageType)}
                    onChange={() => toggleType(type.id as MessageType)}
                  />
                  <Label
                    htmlFor={`type-${type.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Date range filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500">Date Range</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="date-from" className="text-xs">From</Label>
                <input
                  id="date-from"
                  type="date"
                  className="w-full mt-1 rounded-md border border-gray-200 text-sm px-2 py-1"
                  value={formatDateForInput(localFilters.dateFrom)}
                  onChange={(e) => updateDateRange('from', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-xs">To</Label>
                <input
                  id="date-to"
                  type="date"
                  className="w-full mt-1 rounded-md border border-gray-200 text-sm px-2 py-1"
                  value={formatDateForInput(localFilters.dateTo)}
                  onChange={(e) => updateDateRange('to', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Assigned to filter */}
          {teamMembers.length > 0 && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500">Assigned To</h4>
                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1">
                  {teamMembers.map(user => (
                    <div 
                      key={user.id}
                      className={`flex items-center space-x-2 p-2 rounded-md border ${
                        localFilters.assignedTo?.includes(user.id) 
                          ? 'border-primary/40 bg-primary/5' 
                          : 'border-gray-200'
                      }`}
                    >
                      <Checkbox
                        id={`assigned-${user.id}`}
                        checked={localFilters.assignedTo?.includes(user.id) || false}
                        onChange={() => toggleAssignedTo(user.id)}
                      />
                      <Label
                        htmlFor={`assigned-${user.id}`}
                        className="flex items-center text-sm cursor-pointer"
                      >
                        {user.avatarUrl ? (
                          <Image 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 mr-2" />
                        )}
                        {user.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <div className="pt-2 flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
            >
              <Check className="h-4 w-4 mr-1" />
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MessageFilterButton; 