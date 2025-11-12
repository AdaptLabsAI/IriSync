import React from 'react';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export interface AnalyticsCardProps {
  /**
   * Title of the analytics card
   */
  title: string;
  /**
   * The current value to display
   */
  value: string | number;
  /**
   * Percentage change compared to previous period
   */
  change?: number;
  /**
   * Whether an increasing change is positive
   */
  increasesIsPositive?: boolean;
  /**
   * Previous period's value
   */
  previousValue?: string | number;
  /**
   * Optional helper text to explain the metric
   */
  helpText?: string;
  /**
   * Optional label for the previous period
   */
  previousPeriodLabel?: string;
  /**
   * Optional icon to display
   */
  icon?: React.ReactNode;
  /**
   * Optional color theme
   */
  colorTheme?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  /**
   * Extra className for the card
   */
  className?: string;
  /**
   * Optional loading state
   */
  isLoading?: boolean;
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
}

/**
 * AnalyticsCard - Card component for displaying analytics metrics
 */
export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  change,
  increasesIsPositive = true,
  previousValue,
  helpText,
  previousPeriodLabel = 'vs. previous period',
  icon,
  colorTheme = 'blue',
  className = '',
  isLoading = false,
  footer
}) => {
  // Determine color based on theme
  const getColorClasses = () => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200'
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200'
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200'
      },
      orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200'
      },
      red: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200'
      },
      gray: {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200'
      }
    };
    
    return colors[colorTheme];
  };
  
  // Determine if change is positive, negative or neutral
  const getChangeIndicator = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-4 w-4" />;
    }
    
    const isPositive = change > 0;
    const isNegativeImpact = isPositive !== increasesIsPositive;
    
    // Colors for change indicator
    const colorClass = isNegativeImpact
      ? "text-red-600"
      : change === 0
      ? "text-gray-500"
      : "text-green-600";
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        {isPositive ? (
          <>
            <ArrowUp className="h-4 w-4" />
            <span>{Math.abs(change)}%</span>
            {increasesIsPositive ? <TrendingUp className="h-4 w-4 ml-1" /> : <TrendingDown className="h-4 w-4 ml-1" />}
          </>
        ) : (
          <>
            <ArrowDown className="h-4 w-4" />
            <span>{Math.abs(change)}%</span>
            {increasesIsPositive ? <TrendingDown className="h-4 w-4 ml-1" /> : <TrendingUp className="h-4 w-4 ml-1" />}
          </>
        )}
      </div>
    );
  };
  
  const colors = getColorClasses();
  
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="ml-1" aria-label="More information">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {icon && (
          <div className={`rounded-full p-1 ${colors.bg}`}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {value}
            </div>
            
            {change !== undefined && (
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-gray-500">
                  {previousPeriodLabel}
                </div>
                {getChangeIndicator()}
              </div>
            )}
            
            {previousValue !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                Previous: {previousValue}
              </div>
            )}
            
            {footer && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                {footer}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard; 