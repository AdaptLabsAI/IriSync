import React from 'react';
import { Badge } from '../../ui/Badge';
import { 
  SendHorizontal, 
  MessageSquare, 
  BarChart, 
  Image, 
  Video, 
  FileText, 
  Clock, 
  Link, 
  Lock, 
  AlertTriangle 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

export type CapabilityType = 
  | 'posting'
  | 'messaging'
  | 'analytics'
  | 'images'
  | 'videos'
  | 'documents'
  | 'scheduling'
  | 'linking'
  | 'authentication'
  | 'custom';

export type CapabilityStatus = 
  | 'available'     // Feature is available and working
  | 'limited'       // Feature is available but with limitations
  | 'unavailable'   // Feature is not available on this platform
  | 'error'         // Feature should be available but has an error
  | 'maintenance'   // Feature is temporarily unavailable due to maintenance
  | 'deprecated'    // Feature is deprecated and will be removed
  | 'beta'          // Feature is in beta testing
  | 'comingSoon';   // Feature is coming soon

export interface PlatformCapabilityBadgeProps {
  /**
   * Type of capability
   */
  type: CapabilityType;
  /**
   * Status of capability
   */
  status: CapabilityStatus;
  /**
   * Custom label for the capability (overrides default)
   */
  label?: string;
  /**
   * Custom description for tooltip
   */
  description?: string;
  /**
   * Badge size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * PlatformCapabilityBadge - Badge showing platform capability status
 */
export const PlatformCapabilityBadge: React.FC<PlatformCapabilityBadgeProps> = ({
  type,
  status,
  label,
  description,
  size = 'sm',
  className = '',
}) => {
  // Map capability types to icons and default labels
  const getCapabilityInfo = (type: CapabilityType) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
    
    switch (type) {
      case 'posting':
        return { icon: <SendHorizontal className={iconSize} />, defaultLabel: 'Posting' };
      case 'messaging':
        return { icon: <MessageSquare className={iconSize} />, defaultLabel: 'Messaging' };
      case 'analytics':
        return { icon: <BarChart className={iconSize} />, defaultLabel: 'Analytics' };
      case 'images':
        return { icon: <Image className={iconSize} />, defaultLabel: 'Images' };
      case 'videos':
        return { icon: <Video className={iconSize} />, defaultLabel: 'Videos' };
      case 'documents':
        return { icon: <FileText className={iconSize} />, defaultLabel: 'Documents' };
      case 'scheduling':
        return { icon: <Clock className={iconSize} />, defaultLabel: 'Scheduling' };
      case 'linking':
        return { icon: <Link className={iconSize} />, defaultLabel: 'Linking' };
      case 'authentication':
        return { icon: <Lock className={iconSize} />, defaultLabel: 'Authentication' };
      case 'custom':
        return { icon: null, defaultLabel: label || 'Custom' };
      default:
        return { icon: null, defaultLabel: 'Unknown' };
    }
  };

  // Map status to badge styles
  const getStatusStyles = (status: CapabilityStatus) => {
    switch (status) {
      case 'available':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          description: 'This feature is available and fully functional.'
        };
      case 'limited':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          description: 'This feature is available but with limitations.'
        };
      case 'unavailable':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          description: 'This feature is not available on this platform.'
        };
      case 'error':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          description: 'This feature should be available but has an error.'
        };
      case 'maintenance':
        return {
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200',
          description: 'This feature is temporarily unavailable due to maintenance.'
        };
      case 'deprecated':
        return {
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200',
          description: 'This feature is deprecated and will be removed in a future update.'
        };
      case 'beta':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          description: 'This feature is in beta testing.'
        };
      case 'comingSoon':
        return {
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-100',
          description: 'This feature is coming soon.'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          description: 'Status unknown.'
        };
    }
  };

  const { icon, defaultLabel } = getCapabilityInfo(type);
  const { bgColor, textColor, borderColor, description: statusDescription } = getStatusStyles(status);
  const displayLabel = label || defaultLabel;
  const tooltipDescription = description || statusDescription;

  // Get size-based class names
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-1.5 py-0.5 text-xs';
      case 'md':
        return 'px-2 py-1 text-sm';
      case 'lg':
        return 'px-2.5 py-1.5 text-sm';
      default:
        return 'px-1.5 py-0.5 text-xs';
    }
  };

  // Special case for error status
  const showErrorIcon = status === 'error' || status === 'maintenance';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={`${bgColor} ${textColor} border ${borderColor} flex items-center ${getSizeClasses()} font-medium rounded ${className}`}
          >
            {showErrorIcon ? (
              <AlertTriangle className={`mr-1 ${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />
            ) : icon && (
              <span className="mr-1">{icon}</span>
            )}
            {displayLabel}
            {status === 'beta' && <span className="ml-1 opacity-80 text-[0.7em] uppercase">Beta</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltipDescription}</p>
          {status === 'error' && (
            <p className="text-xs mt-1 text-red-500">Please check your connection settings.</p>
          )}
          {status === 'maintenance' && (
            <p className="text-xs mt-1 text-amber-500">Check back later for availability.</p>
          )}
          {status === 'deprecated' && (
            <p className="text-xs mt-1 text-orange-500">Please transition to alternative features.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlatformCapabilityBadge; 