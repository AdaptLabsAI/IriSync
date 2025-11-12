import React, { useState } from 'react';
import { Button } from '../ui/button';
import { BarChart3, PieChart, LineChart, AreaChart, Lock, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export type VisualizationType = 'bar' | 'line' | 'pie' | 'area' | 'table' | 'donut' | 'radar' | 'heatmap';

interface VisualizationOption {
  /**
   * Type identifier
   */
  type: VisualizationType;
  /**
   * Display name
   */
  name: string;
  /**
   * Icon component
   */
  icon: React.ReactNode;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Subscription tier required for this visualization
   */
  requiredTier?: 'creator' | 'influencer' | 'enterprise';
}

export interface VisualizationTypeButtonProps {
  /**
   * Current selected type
   */
  currentType: VisualizationType;
  /**
   * Available visualization types
   */
  availableTypes?: VisualizationType[];
  /**
   * Callback when type is changed
   */
  onTypeChange: (type: VisualizationType) => void;
  /**
   * User's current subscription tier
   */
  userTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
  /**
   * Whether to show the button in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Optional icon-only mode
   */
  iconOnly?: boolean;
}

/**
 * VisualizationTypeButton - Button to switch between different chart/visualization types
 */
export const VisualizationTypeButton: React.FC<VisualizationTypeButtonProps> = ({
  currentType,
  availableTypes,
  onTypeChange,
  userTier = 'creator',
  className = '',
  disabled = false,
  isLoading = false,
  size = 'sm',
  iconOnly = false,
}) => {
  const [open, setOpen] = useState(false);

  // Convert tier string to numeric level for comparison
  const getTierLevel = (tier: 'creator' | 'influencer' | 'enterprise'): number => {
    switch (tier) {
      case 'creator': return 1;
      case 'influencer': return 2;
      case 'enterprise': return 3;
      default: return 1;
    }
  };

  // All possible visualization options
  const visualizationOptions: VisualizationOption[] = [
    { 
      type: 'bar', 
      name: 'Bar Chart', 
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Compare values across categories'
    },
    { 
      type: 'line', 
      name: 'Line Chart', 
      icon: <LineChart className="h-5 w-5" />,
      description: 'Show trends over time'
    },
    { 
      type: 'pie', 
      name: 'Pie Chart', 
      icon: <PieChart className="h-5 w-5" />,
      description: 'Show proportion of the whole'
    },
    { 
      type: 'area', 
      name: 'Area Chart', 
      icon: <AreaChart className="h-5 w-5" />,
      description: 'Highlight volume under a line',
      requiredTier: 'influencer'
    },
    { 
      type: 'table', 
      name: 'Table View', 
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      description: 'Display raw data in rows and columns'
    },
    { 
      type: 'donut', 
      name: 'Donut Chart', 
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="8" strokeWidth={2} />
          <circle cx="12" cy="12" r="3" strokeWidth={2} />
        </svg>
      ),
      description: 'Pie chart with a hole in the center',
      requiredTier: 'influencer'
    },
    { 
      type: 'radar', 
      name: 'Radar Chart', 
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2L12 22M2 12L22 12M4 4L20 20M4 20L20 4" />
        </svg>
      ),
      description: 'Compare multiple variables at once',
      requiredTier: 'enterprise'
    },
    { 
      type: 'heatmap', 
      name: 'Heat Map', 
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="6" y="6" width="3" height="3" />
          <rect x="6" y="12" width="3" height="3" />
          <rect x="6" y="18" width="3" height="3" />
          <rect x="12" y="6" width="3" height="3" />
          <rect x="12" y="12" width="3" height="3" />
          <rect x="12" y="18" width="3" height="3" />
          <rect x="18" y="6" width="3" height="3" />
          <rect x="18" y="12" width="3" height="3" />
          <rect x="18" y="18" width="3" height="3" />
        </svg>
      ),
      description: 'Visualize data through color variations',
      requiredTier: 'enterprise'
    }
  ];

  // Filter to only the available types if specified
  const options = availableTypes 
    ? visualizationOptions.filter(option => availableTypes.includes(option.type))
    : visualizationOptions;

  // Get the current selected option details
  const selectedOption = options.find(option => option.type === currentType) || options[0];

  // Handle visualization type change
  const handleTypeChange = (type: VisualizationType) => {
    const option = options.find(opt => opt.type === type);
    if (!option) return;
    
    // Check if user has access to this visualization type
    const requiredTierLevel = option.requiredTier ? getTierLevel(option.requiredTier) : 1;
    const userTierLevel = getTierLevel(userTier);
    
    if (userTierLevel >= requiredTierLevel) {
      onTypeChange(type);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            selectedOption.icon
          )}
          {!iconOnly && (
            <>
              <span className="hidden md:inline">{selectedOption.name}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-2">
          <h3 className="font-medium text-sm mb-2">Visualization Type</h3>
          <div className="grid grid-cols-1 gap-1">
            {options.map((option) => {
              // Check if user has access to this visualization
              const requiredTierLevel = option.requiredTier ? getTierLevel(option.requiredTier) : 1;
              const userTierLevel = getTierLevel(userTier);
              const hasAccess = userTierLevel >= requiredTierLevel;
              
              return (
                <button
                  key={option.type}
                  className={`flex items-center p-2 rounded-md text-left transition-colors ${
                    !hasAccess 
                      ? 'opacity-60 cursor-not-allowed' 
                      : currentType === option.type
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-gray-100'
                  }`}
                  onClick={() => hasAccess && handleTypeChange(option.type)}
                  disabled={!hasAccess}
                >
                  <div className="mr-3 text-gray-700">
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{option.name}</p>
                      {option.requiredTier && !hasAccess && (
                        <Lock className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>
                    {option.description && (
                      <p className="text-xs text-gray-500 truncate">{option.description}</p>
                    )}
                    {option.requiredTier && !hasAccess && (
                      <p className="text-xs text-amber-600 mt-1">
                        Requires {option.requiredTier} plan
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VisualizationTypeButton; 