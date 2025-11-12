import React, { useState } from 'react';
import cn from 'classnames';

export interface TooltipProps {
  /**
   * The content to display in the tooltip
   */
  content: React.ReactNode;
  /**
   * The element that will trigger the tooltip
   */
  children: React.ReactElement;
  /**
   * The position of the tooltip relative to the trigger element
   */
  position?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * The delay before showing the tooltip (in ms)
   */
  delay?: number;
  /**
   * Custom classes to apply to the tooltip
   */
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
  className,
}) => {
  const [active, setActive] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTip = () => {
    const id = setTimeout(() => {
      setActive(true);
    }, delay);
    setTimeoutId(id);
  };

  const hideTip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setActive(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  };

  const arrowClasses = {
    top: 'bottom-[-6px] left-1/2 -ml-1 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800',
    right: 'left-[-6px] top-1/2 -mt-1 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-800',
    bottom: 'top-[-6px] left-1/2 -ml-1 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800',
    left: 'right-[-6px] top-1/2 -mt-1 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-800',
  };

  return (
    <div className="relative inline-block">
      {React.cloneElement(children, {
        onMouseEnter: showTip,
        onMouseLeave: hideTip,
        onFocus: showTip,
        onBlur: hideTip,
      })}
      
      {active && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded shadow-sm whitespace-nowrap',
            positionClasses[position],
            className
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              'absolute w-0 h-0',
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip; 