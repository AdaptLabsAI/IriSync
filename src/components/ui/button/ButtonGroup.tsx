import React from 'react';
import cn from 'classnames';

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Button group orientation
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Makes buttons appear attached without space between them
   */
  attached?: boolean;
  /**
   * Children should be Button components
   */
  children: React.ReactNode;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  orientation = 'horizontal',
  attached = false,
  children,
  className,
  ...props
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'inline-flex',
        isHorizontal ? 'flex-row' : 'flex-col',
        attached && isHorizontal && [
          '[&>*:not(:first-child)]:border-l-0',
          '[&>*:not(:first-child)]:rounded-l-none',
          '[&>*:not(:last-child)]:rounded-r-none',
        ],
        attached && !isHorizontal && [
          '[&>*:not(:first-child)]:border-t-0',
          '[&>*:not(:first-child)]:rounded-t-none',
          '[&>*:not(:last-child)]:rounded-b-none',
        ],
        !attached && isHorizontal && '[&>*:not(:last-child)]:mr-2',
        !attached && !isHorizontal && '[&>*:not(:last-child)]:mb-2',
        className
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
};

export default ButtonGroup; 