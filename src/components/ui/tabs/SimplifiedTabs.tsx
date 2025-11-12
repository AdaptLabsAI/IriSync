import React from 'react';
import { Box } from '@mui/material';

interface TabItem {
  id: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SimplifiedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * A simplified tabs component for use with string values
 */
const SimplifiedTabs: React.FC<SimplifiedTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className
}) => {
  return (
    <Box className={`flex space-x-2 border-b ${className || ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`px-4 py-2 ${activeTab === tab.id ? 'border-b-2 border-primary font-medium' : ''}`}
          onClick={() => onTabChange(tab.id)}
          disabled={tab.disabled}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
    </Box>
  );
};

export default SimplifiedTabs; 