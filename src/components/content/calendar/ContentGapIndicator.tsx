import React from 'react';

export interface ContentGapIndicatorProps {
  /**
   * Start date of the gap period
   */
  startDate: Date;
  /**
   * End date of the gap period
   */
  endDate: Date;
  /**
   * The threshold in days to flag as a concern 
   * (e.g., 3 days without content is a warning, 7 days is critical)
   */
  warningThreshold?: number;
  /**
   * The threshold in days to flag as critical
   */
  criticalThreshold?: number;
  /**
   * A callback function when the gap indicator is clicked
   */
  onClick?: () => void;
  /**
   * Whether to display the tooltip explaining the gap
   */
  showTooltip?: boolean;
  /**
   * Additional class names to apply
   */
  className?: string;
  /**
   * List of platforms that should have content
   */
  platforms?: string[];
  /**
   * Whether the component is currently hovered
   */
  isHovered?: boolean;
}

/**
 * ContentGapIndicator component to highlight periods without scheduled content
 * in the publishing calendar
 */
export const ContentGapIndicator: React.FC<ContentGapIndicatorProps> = ({
  startDate,
  endDate,
  warningThreshold = 3,
  criticalThreshold = 7,
  onClick,
  showTooltip = true,
  className = '',
  platforms = [],
  isHovered = false,
}) => {
  // Calculate duration of gap in days
  const gapDuration = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine severity based on thresholds
  const severity = 
    gapDuration >= criticalThreshold 
      ? 'critical' 
      : gapDuration >= warningThreshold 
        ? 'warning' 
        : 'info';

  // Style based on severity
  const severityStyles = {
    critical: 'bg-red-100 border-red-300 text-red-800',
    warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-600',
  };

  // Generate date range string
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const dateRangeText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  
  // Generate tooltip text
  const tooltipText = platforms.length > 0
    ? `No content scheduled for ${platforms.join(', ')} during this period`
    : `No content scheduled during this period`;

  return (
    <div 
      className={`
        p-2 border rounded-md cursor-pointer transition-all
        ${severityStyles[severity]}
        ${isHovered ? 'shadow-md' : ''}
        ${className}
      `}
      onClick={onClick}
      title={showTooltip ? tooltipText : undefined}
    >
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0">
          {severity === 'critical' ? (
            <AlertIcon className="w-5 h-5 text-red-500" />
          ) : severity === 'warning' ? (
            <WarningIcon className="w-5 h-5 text-yellow-500" />
          ) : (
            <InfoIcon className="w-5 h-5 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            Content Gap: {gapDuration} days
          </p>
          <p className="text-xs truncate">
            {dateRangeText}
          </p>
        </div>
        {platforms.length > 0 && (
          <div className="flex-shrink-0 flex space-x-1">
            {platforms.slice(0, 3).map((platform, index) => (
              <div 
                key={index}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs"
                title={platform}
              >
                {platform.substring(0, 1).toUpperCase()}
              </div>
            ))}
            {platforms.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs">
                +{platforms.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Icons
const AlertIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
      clipRule="evenodd" 
    />
  </svg>
);

const WarningIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
      clipRule="evenodd" 
    />
  </svg>
);

const InfoIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" 
      clipRule="evenodd" 
    />
  </svg>
);

export default ContentGapIndicator; 