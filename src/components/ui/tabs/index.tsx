import React, { useState } from 'react';
import {
  Tabs as MuiTabs,
  Tab as MuiTab,
  Box,
  styled
} from '@mui/material';

export type TabsAlignment = 'start' | 'center' | 'end';
export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabsProps {
  variant?: 'standard' | 'fullWidth' | 'scrollable';
  alignment?: TabsAlignment;
  orientation?: TabsOrientation;
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  defaultIndex?: number;
  value?: number;
  onChange?: (event: React.SyntheticEvent, newValue: number) => void;
  className?: string;
  [key: string]: any;
}

export interface TabItemProps {
  label: string | React.ReactNode;
  disabled?: boolean;
  className?: string;
  value?: number;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end' | 'top' | 'bottom';
  [key: string]: any;
}

export interface TabPanelItemProps {
  children: React.ReactNode;
  value: number;
  index: number;
  className?: string;
  [key: string]: any;
}

// Styled TabPanel component
const StyledTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

/**
 * TabPanel component - content container for each tab
 */
const TabPanel: React.FC<TabPanelItemProps> = ({ 
  children, 
  value, 
  index, 
  className, 
  ...props 
}) => {
  return (
    <StyledTabPanel
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      className={className}
      {...props}
    >
      {value === index && children}
    </StyledTabPanel>
  );
};

/**
 * Tabs component for organizing content into separate views
 */
export const Tabs: React.FC<TabsProps> & {
  Tab: React.FC<TabItemProps>;
  TabPanel: React.FC<TabPanelItemProps>;
} = ({
  children,
  variant = 'standard',
  alignment = 'start',
  orientation = 'horizontal',
  size = 'medium',
  defaultIndex = 0,
  value: controlledValue,
  onChange: controlledOnChange,
  className,
  ...props
}) => {
  const [value, setValue] = useState(defaultIndex);
  
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    if (controlledOnChange) {
      controlledOnChange(event, newValue);
    } else {
      setValue(newValue);
    }
  };
  
  const currentValue = controlledValue !== undefined ? controlledValue : value;
  
  // Convert alignment to MUI textAlign prop
  const getAlignment = () => {
    switch (alignment) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      default: return 'flex-start';
    }
  };
  
  return (
    <Box className={className}>
      <MuiTabs
        value={currentValue}
        onChange={handleChange}
        variant={variant}
        orientation={orientation}
        centered={alignment === 'center'}
        sx={{ 
          '.MuiTabs-flexContainer': {
            justifyContent: alignment !== 'center' ? getAlignment() : undefined
          },
          // Apply size-related styling based on the size prop
          ...(size === 'small' ? { minHeight: 32 } : {}),
          ...(size === 'large' ? { minHeight: 56 } : {})
        }}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === Tab) {
            return React.cloneElement(child, {
              value: index,
              ...child.props
            });
          }
          return null;
        })}
      </MuiTabs>
      
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === TabPanel) {
          return React.cloneElement(child, {
            value: currentValue,
            index,
            ...child.props
          });
        }
        return null;
      })}
    </Box>
  );
};

/**
 * Tab component - individual tab button
 */
const Tab: React.FC<TabItemProps> = ({
  label,
  disabled = false,
  className,
  value,
  icon,
  iconPosition = 'start',
  ...props
}) => {
  // Ensure icon is either a ReactElement or undefined
  const safeIcon = icon && React.isValidElement(icon) ? icon : undefined;
  
  return (
    <MuiTab
      label={label}
      disabled={disabled}
      className={className}
      value={value}
      icon={safeIcon}
      iconPosition={iconPosition}
      {...props}
    />
  );
};

// Assign subcomponents
Tabs.Tab = Tab;
Tabs.TabPanel = TabPanel;

// Export aliases for common naming patterns
export const TabsContent = TabPanel;
export const TabsList = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
  <Box {...props}>{children}</Box>
);
export const TabsTrigger = Tab;

export { Tab, TabPanel };
export default Tabs; 