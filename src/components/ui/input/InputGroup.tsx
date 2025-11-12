import React from 'react';
import cn from 'classnames';

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Input elements and addons
   */
  children: React.ReactNode;
  /**
   * Whether to make the group full width
   */
  fullWidth?: boolean;
}

/**
 * InputGroup component for combining inputs with addons like buttons or icons
 */
export const InputGroup: React.FC<InputGroupProps> = ({
  children,
  fullWidth = false,
  className,
  ...props
}) => {
  return (
    <div 
      className={cn(
        'flex',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        // Clone the child with additional classes for positioning
        return React.cloneElement(child, {
          className: cn(
            child.props.className,
            // Remove rounded corners from middle elements
            index === 0 ? 'rounded-r-none' : '',
            index === React.Children.count(children) - 1 ? 'rounded-l-none' : '',
            index > 0 && index < React.Children.count(children) - 1 ? 'rounded-none' : '',
            index > 0 ? '-ml-px' : ''
          )
        });
      })}
    </div>
  );
};

export default InputGroup; 