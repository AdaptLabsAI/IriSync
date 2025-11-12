'use client';

import React from 'react';
import { Tooltip as MuiTooltip, TooltipProps } from '@mui/material';
import ButtonWrapper from './ButtonWrapper';

/**
 * A wrapper around MUI Tooltip that handles disabled buttons properly
 */
export const Tooltip: React.FC<TooltipProps & { children: React.ReactElement }> = ({
  children,
  ...props
}) => {
  // Check if the child is a button and disabled
  // This checks both native buttons and MUI Button components
  const isDisabledButton = 
    React.isValidElement(children) && 
    (
      (children.type === 'button' && children.props.disabled) ||
      (typeof children.type === 'function' && 
       children.type.displayName === 'Button' && 
       children.props.disabled) ||
      (children.props.disabled)
    );

  // If it's a disabled button, wrap it in a span to prevent the MUI warning
  const wrappedChildren = isDisabledButton ? (
    <ButtonWrapper>{children}</ButtonWrapper>
  ) : (
    children
  );

  return <MuiTooltip {...props}>{wrappedChildren}</MuiTooltip>;
};

export default Tooltip; 