import { Grid as MuiGrid, GridProps as MuiGridProps } from '@mui/material';
import React from 'react';

// Custom wrapper for MUI Grid to fix TypeScript errors with props passing
interface GridProps extends Omit<MuiGridProps, 'item' | 'container'> {
  item?: boolean;
  container?: boolean;
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
  spacing?: number;
}

const Grid = ({ children, item, container, xs, sm, md, lg, xl, spacing, ...rest }: GridProps) => {
  // Pass all props to MUI Grid
  const props: any = {
    ...rest,
    item,
    container,
    xs,
    sm,
    md,
    lg,
    xl,
    spacing,
  };

  return (
    <MuiGrid {...props}>
      {children}
    </MuiGrid>
  );
};

export default Grid; 