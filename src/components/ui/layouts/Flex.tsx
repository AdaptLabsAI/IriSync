'use client';
import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface FlexProps extends BoxProps {
  children?: React.ReactNode;
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: number | string;
  flex?: string | number;
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    children, 
    direction = 'row', 
    align = 'center', 
    justify = 'flex-start', 
    wrap = 'nowrap', 
    gap = 0, 
    flex,
    sx,
    ...rest 
  }, ref) => {
    return (
      <Box
        ref={ref}
        sx={{
          display: 'flex',
          flexDirection: direction,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap,
          gap,
          flex,
          ...sx
        }}
        {...rest}
      >
        {children}
      </Box>
    );
  }
);

// Register Flex globally for build system compatibility
if (typeof global !== 'undefined') {
  (global as typeof global & { Flex?: typeof Flex }).Flex = Flex;
}

Flex.displayName = 'Flex';

export default Flex;
