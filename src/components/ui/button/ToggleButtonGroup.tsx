import React, { Children, isValidElement, cloneElement } from 'react';
import cn from 'classnames';
import { ToggleButton } from './ToggleButton';

export interface ToggleButtonGroupProps {
  /**
   * Selected value(s) in the group (controlled)
   */
  value: string | string[];
  /**
   * Called when the selection changes
   */
  onChange: (value: string | string[]) => void;
  /**
   * Whether to allow multiple selections
   */
  multiple?: boolean;
  /**
   * Custom class name for the wrapper
   */
  className?: string;
  /**
   * The Button components to render. These should be ToggleButtons
   */
  children: React.ReactNode;
}

export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  children,
  value,
  onChange,
  multiple = false,
  className,
}) => {
  // Normalize value to array
  const selectedValues = multiple 
    ? (Array.isArray(value) ? value : [value])
    : (Array.isArray(value) ? [value[0]] : [value]);

  const handleToggle = (toggleValue: string, isSelected: boolean) => {
    if (multiple) {
      // For multiple selection, add or remove from array
      const newValue = isSelected
        ? [...selectedValues, toggleValue]
        : selectedValues.filter(val => val !== toggleValue);
      
      onChange(newValue);
    } else {
      // For single selection, just set the value
      onChange(toggleValue);
    }
  };

  return (
    <div 
      className={cn(
        'inline-flex rounded-md',
        className
      )}
      role="group"
    >
      {Children.map(children, child => {
        if (!isValidElement(child)) return child;
        
        // Get the value from the child props or fall back to children as string
        const childValue = child.props.value || (typeof child.props.children === 'string' ? child.props.children : '');
        const isSelected = selectedValues.includes(childValue);
        
        // Clone the child and pass appropriate props
        return cloneElement(child, {
          isActive: isSelected,
          onChange: () => handleToggle(childValue, !isSelected),
          className: cn(
            child.props.className,
            'rounded-none first:rounded-l-md last:rounded-r-md -ml-px first:ml-0'
          ),
        });
      })}
    </div>
  );
};

export default ToggleButtonGroup; 