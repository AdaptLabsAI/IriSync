import React, { useState } from 'react';
import { Button, ButtonVariant, ButtonSize } from '../../ui/button';
import { MessageSquare, ChevronDown, Eye, EyeOff, ArrowUp, ArrowDown, Clock, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';

export type ThreadViewMode = 'conversation' | 'flat' | 'grouped';

export interface ThreadViewButtonProps {
  /**
   * Current view mode
   */
  viewMode: ThreadViewMode;
  /**
   * Callback for when view mode changes
   */
  onChange: (mode: ThreadViewMode) => void;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * ThreadViewButton - Toggle between different thread view modes
 */
export const ThreadViewButton: React.FC<ThreadViewButtonProps> = ({
  viewMode,
  onChange,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  className = '',
}) => {
  // Get the appropriate icon and text for the current mode
  const getModeInfo = (mode: ThreadViewMode) => {
    switch (mode) {
      case 'conversation':
        return {
          icon: <MessageSquare className="h-4 w-4" />,
          text: 'Conversation View',
          description: 'View messages in a conversation thread'
        };
      case 'flat':
        return {
          icon: <Eye className="h-4 w-4" />,
          text: 'Flat View',
          description: 'View all messages in chronological order'
        };
      case 'grouped':
        return {
          icon: <User className="h-4 w-4" />,
          text: 'Grouped View',
          description: 'Group messages by sender'
        };
      default:
        return {
          icon: <MessageSquare className="h-4 w-4" />,
          text: 'Conversation View',
          description: 'View messages in a conversation thread'
        };
    }
  };
  
  const currentMode = getModeInfo(viewMode);
  
  // Handle changing the view mode
  const handleChangeMode = (mode: ThreadViewMode) => {
    onChange(mode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={isDisabled}
        >
          {currentMode.icon}
          <span className="text-sm">{currentMode.text}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => handleChangeMode('conversation')}
          className={`flex items-center py-2 ${viewMode === 'conversation' ? 'bg-[#00FF6A]/5' : ''}`}
        >
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            <div className="text-sm">
              <div className="font-medium">Conversation View</div>
              <div className="text-xs text-gray-500">View messages in a conversation thread</div>
            </div>
          </div>
          {viewMode === 'conversation' && (
            <div className="ml-auto">
              <div className="h-2 w-2 rounded-full bg-[#00CC44]"></div>
            </div>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => handleChangeMode('flat')}
          className={`flex items-center py-2 ${viewMode === 'flat' ? 'bg-[#00FF6A]/5' : ''}`}
        >
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            <div className="text-sm">
              <div className="font-medium">Flat View</div>
              <div className="text-xs text-gray-500">View all messages in chronological order</div>
            </div>
          </div>
          {viewMode === 'flat' && (
            <div className="ml-auto">
              <div className="h-2 w-2 rounded-full bg-[#00CC44]"></div>
            </div>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => handleChangeMode('grouped')}
          className={`flex items-center py-2 ${viewMode === 'grouped' ? 'bg-[#00FF6A]/5' : ''}`}
        >
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <div className="text-sm">
              <div className="font-medium">Grouped View</div>
              <div className="text-xs text-gray-500">Group messages by sender</div>
            </div>
          </div>
          {viewMode === 'grouped' && (
            <div className="ml-auto">
              <div className="h-2 w-2 rounded-full bg-[#00CC44]"></div>
            </div>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThreadViewButton; 