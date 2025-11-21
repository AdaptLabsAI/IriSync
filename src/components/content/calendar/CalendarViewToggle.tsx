import React from 'react';
import { Button } from '../../ui/button/Button';

export type CalendarViewType = 'day' | 'week' | 'month' | 'year' | 'list';

export interface CalendarViewToggleProps {
  /**
   * Currently selected view
   */
  view: CalendarViewType;
  /**
   * Callback for view changes
   */
  onViewChange: (view: CalendarViewType) => void;
  /**
   * Which views to display
   */
  availableViews?: CalendarViewType[];
  /**
   * Size of the toggle
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Whether the control is disabled
   */
  disabled?: boolean;
  /**
   * Required subscription plan for certain views
   * Enterprise users have access to all views
   * Influencer can access day, week, month
   * Creator is limited to month view only
   */
  featureTiers?: {
    day?: 'creator' | 'influencer' | 'enterprise';
    week?: 'creator' | 'influencer' | 'enterprise';
    month?: 'creator' | 'influencer' | 'enterprise';
    year?: 'creator' | 'influencer' | 'enterprise';
    list?: 'creator' | 'influencer' | 'enterprise';
  };
  /**
   * User's current subscription tier
   */
  userTier?: 'creator' | 'influencer' | 'enterprise';
}

/**
 * CalendarViewToggle component for switching between different calendar views
 */
export const CalendarViewToggle: React.FC<CalendarViewToggleProps> = ({
  view,
  onViewChange,
  availableViews = ['day', 'week', 'month', 'list'],
  size = 'md',
  className = '',
  disabled = false,
  featureTiers = {
    day: 'influencer',
    week: 'influencer',
    month: 'creator',
    year: 'enterprise',
    list: 'creator'
  },
  userTier = 'creator',
}) => {
  // Check if user has access to a specific view
  const hasAccessToView = (viewType: CalendarViewType): boolean => {
    const requiredTier = featureTiers[viewType];
    if (!requiredTier) return true;
    
    const tierLevels = {
      'creator': 1,
      'influencer': 2,
      'enterprise': 3
    };
    
    return tierLevels[userTier] >= tierLevels[requiredTier];
  };

  // Generate tooltip for views that are restricted by subscription tier
  const getTooltip = (viewType: CalendarViewType): string | undefined => {
    if (hasAccessToView(viewType)) return undefined;
    
    const requiredTier = featureTiers[viewType];
    return `Upgrade to ${requiredTier} plan to access ${viewType} view`;
  };

  // Map of view types to display labels
  const viewLabels: Record<CalendarViewType, string> = {
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    list: 'List'
  };

  // Map of view types to icons
  const viewIcons: Record<CalendarViewType, React.ReactNode> = {
    day: <DayIcon />,
    week: <WeekIcon />,
    month: <MonthIcon />,
    year: <YearIcon />,
    list: <ListIcon />
  };

  return (
    <div className={`inline-flex rounded-md shadow-sm ${className}`}>
      {availableViews.map((viewType) => {
        const isActive = view === viewType;
        const hasAccess = hasAccessToView(viewType);
        
        return (
          <Button
            key={viewType}
            size={size}
            variant={isActive ? 'primary' : 'outline'}
            onClick={() => onViewChange(viewType)}
            disabled={disabled || !hasAccess}
            className={`
              ${availableViews.indexOf(viewType) === 0 ? 'rounded-r-none' : ''}
              ${availableViews.indexOf(viewType) === availableViews.length - 1 ? 'rounded-l-none' : ''}
              ${availableViews.indexOf(viewType) > 0 && availableViews.indexOf(viewType) < availableViews.length - 1 ? 'rounded-none' : ''}
              ${isActive ? 'z-10' : ''}
              ${!isActive && !hasAccess ? 'opacity-50' : ''}
            `}
            tooltipText={getTooltip(viewType)}
            leftIcon={viewIcons[viewType]}
          >
            {viewLabels[viewType]}
          </Button>
        );
      })}
    </div>
  );
};

// Icon components
const DayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <rect x="8" y="14" width="3" height="3" />
  </svg>
);

const WeekIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="4" x2="8" y2="22" />
    <line x1="16" y1="4" x2="16" y2="22" />
  </svg>
);

const MonthIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const YearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="3" y1="16" x2="21" y2="16" />
  </svg>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

export default CalendarViewToggle; 