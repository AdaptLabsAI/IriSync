import React from 'react';
import { Grid as MuiGrid } from '@mui/material';

// This is a compatibility wrapper for MUI v7 Grid
export const Grid: React.FC<any> = (props) => {
  // Pass all props directly to MuiGrid
  return <MuiGrid {...props} />;
};

export default Grid; 