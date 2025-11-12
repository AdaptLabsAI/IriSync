'use client';

import { useMediaQuery as muiUseMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Client-side wrapper for MUI's useMediaQuery hook
 * Ensures it's only used in client components
 */
export function useMediaQuery(query: string) {
  return muiUseMediaQuery(query);
}

/**
 * Utility hook for responsive design using theme breakpoints
 */
export function useResponsive() {
  const theme = useTheme();
  
  return {
    isMobile: muiUseMediaQuery(theme.breakpoints.down('sm')),
    isTablet: muiUseMediaQuery(theme.breakpoints.between('sm', 'md')),
    isDesktop: muiUseMediaQuery(theme.breakpoints.up('md')),
    isLargeScreen: muiUseMediaQuery(theme.breakpoints.up('lg')),
  };
}

export default useMediaQuery; 