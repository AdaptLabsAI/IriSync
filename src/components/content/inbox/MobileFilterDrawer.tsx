import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Badge
} from '@mui/material';
import {
  Close as CloseIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

export interface FilterOptions {
  platforms: string[];
  messageTypes: string[];
  statuses: string[];
  priorities: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface MobileFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  activeFilterCount?: number;
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F' },
  { id: 'twitter', name: 'Twitter', color: '#1DA1F2' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2' },
  { id: 'tiktok', name: 'TikTok', color: '#000000' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000' },
  { id: 'pinterest', name: 'Pinterest', color: '#BD081C' }
];

const MESSAGE_TYPES = [
  { id: 'direct', name: 'Direct Messages' },
  { id: 'mention', name: 'Mentions' },
  { id: 'comment', name: 'Comments' },
  { id: 'review', name: 'Reviews' }
];

const STATUSES = [
  { id: 'unread', name: 'Unread' },
  { id: 'read', name: 'Read' },
  { id: 'replied', name: 'Replied' },
  { id: 'archived', name: 'Archived' }
];

const PRIORITIES = [
  { id: 'high', name: 'High Priority' },
  { id: 'medium', name: 'Medium Priority' },
  { id: 'low', name: 'Low Priority' }
];

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  activeFilterCount = 0
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) {
    return null; // Only render on mobile
  }

  const handlePlatformToggle = (platformId: string) => {
    const newPlatforms = filters.platforms.includes(platformId)
      ? filters.platforms.filter(p => p !== platformId)
      : [...filters.platforms, platformId];
    
    onFiltersChange({
      ...filters,
      platforms: newPlatforms
    });
  };

  const handleMessageTypeToggle = (typeId: string) => {
    const newTypes = filters.messageTypes.includes(typeId)
      ? filters.messageTypes.filter(t => t !== typeId)
      : [...filters.messageTypes, typeId];
    
    onFiltersChange({
      ...filters,
      messageTypes: newTypes
    });
  };

  const handleStatusToggle = (statusId: string) => {
    const newStatuses = filters.statuses.includes(statusId)
      ? filters.statuses.filter(s => s !== statusId)
      : [...filters.statuses, statusId];
    
    onFiltersChange({
      ...filters,
      statuses: newStatuses
    });
  };

  const handlePriorityToggle = (priorityId: string) => {
    const newPriorities = filters.priorities.includes(priorityId)
      ? filters.priorities.filter(p => p !== priorityId)
      : [...filters.priorities, priorityId];
    
    onFiltersChange({
      ...filters,
      priorities: newPriorities
    });
  };

  const handleApply = () => {
    onApplyFilters();
    onClose();
  };

  const handleClear = () => {
    onClearFilters();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          height: '80vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          backgroundColor: theme.palette.background.default
        }
      }}
    >
      {/* Header */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'transparent',
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <FilterIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Filters
            </Typography>
            {activeFilterCount > 0 && (
              <Badge 
                badgeContent={activeFilterCount} 
                color="primary" 
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Platforms */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Platforms
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PLATFORMS.map((platform) => (
              <Chip
                key={platform.id}
                label={platform.name}
                onClick={() => handlePlatformToggle(platform.id)}
                variant={filters.platforms.includes(platform.id) ? 'filled' : 'outlined'}
                sx={{
                  backgroundColor: filters.platforms.includes(platform.id) 
                    ? platform.color 
                    : 'transparent',
                  color: filters.platforms.includes(platform.id) 
                    ? 'white' 
                    : theme.palette.text.primary,
                  borderColor: platform.color,
                  '&:hover': {
                    backgroundColor: filters.platforms.includes(platform.id)
                      ? platform.color
                      : `${platform.color}20`
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Message Types */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Message Types
          </Typography>
          <FormGroup>
            {MESSAGE_TYPES.map((type) => (
              <FormControlLabel
                key={type.id}
                control={
                  <Checkbox
                    checked={filters.messageTypes.includes(type.id)}
                    onChange={() => handleMessageTypeToggle(type.id)}
                  />
                }
                label={type.name}
              />
            ))}
          </FormGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Status
          </Typography>
          <FormGroup>
            {STATUSES.map((status) => (
              <FormControlLabel
                key={status.id}
                control={
                  <Checkbox
                    checked={filters.statuses.includes(status.id)}
                    onChange={() => handleStatusToggle(status.id)}
                  />
                }
                label={status.name}
              />
            ))}
          </FormGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Priority */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Priority
          </Typography>
          <FormGroup>
            {PRIORITIES.map((priority) => (
              <FormControlLabel
                key={priority.id}
                control={
                  <Checkbox
                    checked={filters.priorities.includes(priority.id)}
                    onChange={() => handlePriorityToggle(priority.id)}
                  />
                }
                label={priority.name}
              />
            ))}
          </FormGroup>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box 
        sx={{ 
          p: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleClear}
            startIcon={<ClearIcon />}
            sx={{ flex: 1 }}
          >
            Clear All
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            sx={{ flex: 2 }}
          >
            Apply Filters
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}; 