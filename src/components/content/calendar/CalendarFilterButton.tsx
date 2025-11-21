import React, { useState } from 'react';
import { Button } from '../../ui/button/Button';
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@mui/material';
import { Checkbox } from '../../ui/checkbox/Checkbox';

export interface CalendarFilterOptions {
  /**
   * List of platform filters
   */
  platforms: string[];
  /**
   * List of status filters
   */
  status: Array<'draft' | 'scheduled' | 'published' | 'failed'>;
  /**
   * List of content type filters
   */
  contentTypes?: string[];
  /**
   * List of team member filters (assigned to)
   */
  teamMembers?: string[];
}

export interface CalendarFilterButtonProps {
  /**
   * Currently applied filters
   */
  currentFilters: CalendarFilterOptions;
  /**
   * Available platform options
   */
  availablePlatforms: Array<{
    id: string;
    name: string;
  }>;
  /**
   * Available content type options
   */
  availableContentTypes?: Array<{
    id: string;
    name: string;
  }>;
  /**
   * Available team member options
   */
  availableTeamMembers?: Array<{
    id: string;
    name: string;
  }>;
  /**
   * Callback when filters are changed
   */
  onFilterChange: (filters: CalendarFilterOptions) => void;
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show the button as icon only
   */
  iconOnly?: boolean;
  /**
   * Additional classes for the button
   */
  className?: string;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
}

/**
 * CalendarFilterButton component that opens a dialog to filter calendar content
 */
const CalendarFilterButton: React.FC<CalendarFilterButtonProps> = ({
  currentFilters,
  availablePlatforms,
  availableContentTypes = [],
  availableTeamMembers = [],
  onFilterChange,
  variant = 'outline',
  size = 'md',
  iconOnly = false,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<CalendarFilterOptions>(currentFilters);
  
  // Helper to check if filters are active
  const hasActiveFilters = () => {
    return (
      localFilters.platforms.length > 0 ||
      localFilters.status.length > 0 ||
      (localFilters.contentTypes?.length || 0) > 0 ||
      (localFilters.teamMembers?.length || 0) > 0
    );
  };

  // Handle opening the filter dialog
  const handleOpenDialog = () => {
    setIsOpen(true);
    setLocalFilters(currentFilters);
  };

  // Handle closing the filter dialog
  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  // Handle applying the filters
  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  // Handle clearing all filters
  const handleClearFilters = () => {
    const emptyFilters: CalendarFilterOptions = {
      platforms: [],
      status: [],
      contentTypes: [],
      teamMembers: [],
    };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
    setIsOpen(false);
  };

  // Handle toggling a platform filter
  const handleTogglePlatform = (platformId: string) => {
    setLocalFilters(prev => {
      const isAlreadySelected = prev.platforms.includes(platformId);
      return {
        ...prev,
        platforms: isAlreadySelected
          ? prev.platforms.filter(id => id !== platformId)
          : [...prev.platforms, platformId],
      };
    });
  };

  // Handle toggling a status filter
  const handleToggleStatus = (status: 'draft' | 'scheduled' | 'published' | 'failed') => {
    setLocalFilters(prev => {
      const isAlreadySelected = prev.status.includes(status);
      return {
        ...prev,
        status: isAlreadySelected
          ? prev.status.filter(s => s !== status)
          : [...prev.status, status],
      };
    });
  };

  // Handle toggling a content type filter
  const handleToggleContentType = (contentTypeId: string) => {
    setLocalFilters(prev => {
      const contentTypes = prev.contentTypes || [];
      const isAlreadySelected = contentTypes.includes(contentTypeId);
      return {
        ...prev,
        contentTypes: isAlreadySelected
          ? contentTypes.filter(id => id !== contentTypeId)
          : [...contentTypes, contentTypeId],
      };
    });
  };

  // Handle toggling a team member filter
  const handleToggleTeamMember = (teamMemberId: string) => {
    setLocalFilters(prev => {
      const teamMembers = prev.teamMembers || [];
      const isAlreadySelected = teamMembers.includes(teamMemberId);
      return {
        ...prev,
        teamMembers: isAlreadySelected
          ? teamMembers.filter(id => id !== teamMemberId)
          : [...teamMembers, teamMemberId],
      };
    });
  };

  // Determine the filter count badge
  const filterCount = 
    (currentFilters.platforms?.length || 0) +
    (currentFilters.status?.length || 0) +
    (currentFilters.contentTypes?.length || 0) +
    (currentFilters.teamMembers?.length || 0);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenDialog}
        className={`${className} ${hasActiveFilters() ? 'relative' : ''}`}
        disabled={disabled}
        leftIcon={!iconOnly && <FilterIcon />}
        aria-label={iconOnly ? 'Filter calendar' : undefined}
      >
        {iconOnly ? <FilterIcon /> : 'Filter'}
        
        {filterCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Filter Calendar Content</DialogTitle>
        <DialogContent>
          <div className="p-4 flex flex-col gap-6 min-w-[300px]">
            {/* Platforms filter section */}
            <div>
              <h3 className="font-medium text-sm mb-2">Platforms</h3>
              <div className="grid grid-cols-2 gap-2">
                {availablePlatforms.map(platform => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={localFilters.platforms.includes(platform.id)}
                      onChange={() => handleTogglePlatform(platform.id)}
                    />
                    <label htmlFor={`platform-${platform.id}`} className="text-sm">
                      {platform.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status filter section */}
            <div>
              <h3 className="font-medium text-sm mb-2">Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {['draft', 'scheduled', 'published', 'failed'].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={localFilters.status.includes(status as any)}
                      onChange={() => handleToggleStatus(status as any)}
                    />
                    <label htmlFor={`status-${status}`} className="text-sm capitalize">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Content types filter section */}
            {availableContentTypes.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">Content Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  {availableContentTypes.map(type => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`content-type-${type.id}`}
                        checked={(localFilters.contentTypes || []).includes(type.id)}
                        onChange={() => handleToggleContentType(type.id)}
                      />
                      <label htmlFor={`content-type-${type.id}`} className="text-sm">
                        {type.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team members filter section */}
            {availableTeamMembers.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">Team Members</h3>
                <div className="grid grid-cols-2 gap-2">
                  {availableTeamMembers.map(member => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`team-member-${member.id}`}
                        checked={(localFilters.teamMembers || []).includes(member.id)}
                        onChange={() => handleToggleTeamMember(member.id)}
                      />
                      <label htmlFor={`team-member-${member.id}`} className="text-sm">
                        {member.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
          >
            Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCloseDialog}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Filter icon component
const FilterIcon = () => (
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
);

export default CalendarFilterButton; 