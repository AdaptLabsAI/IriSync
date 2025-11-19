import { Grid2 as MuiGrid } from '@mui/material';
import React from 'react';

// Custom wrapper for MUI Grid2 (v7+ API) with backwards compatibility for old Grid props
interface GridProps {
  children?: React.ReactNode;
  item?: boolean; // Backwards compatibility - ignored in v7
  container?: boolean; // Backwards compatibility - converted to container prop
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
  spacing?: number;
  sx?: any;
  [key: string]: any; // Allow other props
}

const Grid = ({ children, item, container, xs, sm, md, lg, xl, spacing, ...rest }: GridProps) => {
  // In MUI v7, Grid2 uses container prop for containers and size props for items
  // The 'item' prop is no longer needed - items are identified by having size props (xs, sm, etc.)
  const props: any = {
    ...rest,
  };

  // If container is true, add container prop and spacing
  if (container) {
    props.container = true;
    if (spacing !== undefined) {
      props.spacing = spacing;
    }
  }

  // If any size props are provided, this is an item (no explicit item prop needed in v7)
  if (xs !== undefined) props.xs = xs;
  if (sm !== undefined) props.sm = sm;
  if (md !== undefined) props.md = md;
  if (lg !== undefined) props.lg = lg;
  if (xl !== undefined) props.xl = xl;

  return (
    <MuiGrid {...props}>
      {children}
    </MuiGrid>
  );
};

export default Grid; 