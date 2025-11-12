'use client';
import React from 'react';
import { Box } from '@mui/material';

export const Flex = ({ children, ...props }) => {
  return <Box display="flex" {...props}>{children}</Box>;
};

export default Flex;
