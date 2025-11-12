'use client';

import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function TokensLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const value = pathname?.includes('/admin/tokens/usage') 
    ? 0 
    : pathname?.includes('/admin/tokens/settings') 
      ? 1 
      : 0;
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={value} aria-label="token management tabs">
          <Tab 
            label="Usage Statistics" 
            component={Link}
            href="/admin/tokens/usage"
          />
          <Tab 
            label="Token Settings" 
            component={Link}
            href="/admin/tokens/settings"
          />
        </Tabs>
      </Box>
      {children}
    </Box>
  );
}

export default TokensLayout; 