import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Button,
  Autocomplete,
  useTheme,
  useMediaQuery,
  Collapse,
  IconButton,
  Typography
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { DateRangePicker } from '@mui/x-date-pickers-pro';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { InboxFilters as InboxFiltersType } from '@/lib/core/api/content';

export interface InboxFiltersProps {
  filters: InboxFiltersType;
  onFiltersChange: (filters: InboxFiltersType) => void;
  onClearFilters: () => void;
  teamMembers: Array<{ userId: string; name: string; email: string; role: string }>;
  labels: string[];
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
  dateRange: [Date | null, Date | null];
  onDateRangeChange: (range: [Date | null, Date | null]) => void;
  compact?: boolean;
}

const PLATFORMS = [
  { value: '', label: 'All Platforms' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

const MESSAGE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'direct', label: 'Direct Messages' },
  { value: 'mention', label: 'Mentions' },
  { value: 'comment', label: 'Comments' },
  { value: 'review', label: 'Reviews' },
  { value: 'support', label: 'Support' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'pending', label: 'Pending' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
  { value: 'flagged', label: 'Flagged' },
];

const SENTIMENTS = [
  { value: '', label: 'All Sentiments' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const PRIORITIES = [
  { value: '', label: 'All Priorities' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' },
];

export const InboxFilters: React.FC<InboxFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  teamMembers,
  labels,
  selectedLabels,
  onLabelsChange,
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  compact = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = useState(!compact);

  const handleFilterChange = (field: keyof InboxFiltersType) => (event: any) => {
    onFiltersChange({ ...filters, [field]: event.target.value });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.platform) count++;
    if (filters.messageType) count++;
    if (filters.status) count++;
    if (filters.sentiment) count++;
    if (filters.assignedTo) count++;
    if (selectedLabels.length > 0) count++;
    if (search) count++;
    if (dateRange[0] || dateRange[1]) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  if (isMobile) {
    // Mobile filters are handled by MobileFilterDrawer
    return (
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search messages..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          variant="outlined"
          size="small"
        />
        {activeFilterCount > 0 && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </Typography>
            <Button size="small" onClick={onClearFilters} startIcon={<ClearIcon />}>
              Clear
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ mb: 2 }}>
        {compact && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <IconButton
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              <ExpandMoreIcon
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </IconButton>
            <FilterListIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle2">
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Typography>
            {activeFilterCount > 0 && (
              <Button
                size="small"
                onClick={onClearFilters}
                startIcon={<ClearIcon />}
                sx={{ ml: 'auto' }}
              >
                Clear All
              </Button>
            )}
          </Box>
        )}

        <Collapse in={expanded}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            {/* Search */}
            <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search messages..."
              />
            </Box>

            {/* Platform Filter */}
            <Box sx={{ flex: '1 1 calc(16.67% - 12px)', minWidth: '150px' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Platform</InputLabel>
                <Select
                  value={filters.platform || ''}
                  label="Platform"
                  onChange={handleFilterChange('platform')}
                >
                  {PLATFORMS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Message Type Filter */}
            <Box sx={{ flex: '1 1 calc(16.67% - 12px)', minWidth: '150px' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.messageType || ''}
                  label="Type"
                  onChange={handleFilterChange('messageType')}
                >
                  {MESSAGE_TYPES.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Status Filter */}
            <Box sx={{ flex: '1 1 calc(16.67% - 12px)', minWidth: '150px' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Status"
                  onChange={handleFilterChange('status')}
                >
                  {STATUSES.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Sentiment Filter */}
            <Box sx={{ flex: '1 1 calc(16.67% - 12px)', minWidth: '150px' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Sentiment</InputLabel>
                <Select
                  value={filters.sentiment || ''}
                  label="Sentiment"
                  onChange={handleFilterChange('sentiment')}
                >
                  {SENTIMENTS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Assigned User Filter */}
            <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Assigned To</InputLabel>
                <Select
                  value={filters.assignedTo || ''}
                  label="Assigned To"
                  onChange={handleFilterChange('assignedTo')}
                >
                  <MenuItem value="">All Users</MenuItem>
                  <MenuItem value="unassigned">Unassigned</MenuItem>
                  {teamMembers.map(member => (
                    <MenuItem key={member.userId} value={member.userId}>
                      {member.name || member.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Labels Filter */}
            <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
              <Autocomplete
                multiple
                size="small"
                options={labels}
                value={selectedLabels}
                onChange={(_, value) => onLabelsChange(value)}
                renderTags={(value: string[], getTagProps) =>
                  value.map((option: string, index: number) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      size="small"
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Labels" placeholder="Select labels" />
                )}
              />
            </Box>

            {/* Date Range Filter */}
            <Box sx={{ flex: '1 1 calc(33.33% - 12px)', minWidth: '250px' }}>
              <DateRangePicker
                localeText={{ start: 'From', end: 'To' }}
                value={dateRange}
                onChange={(newValue) => onDateRangeChange(newValue)}
                slotProps={{
                  textField: (props: any) => ({
                    size: 'small',
                    fullWidth: true,
                    ...props
                  })
                }}
              />
            </Box>

            {/* Clear Filters Button */}
            {!compact && activeFilterCount > 0 && (
              <Box sx={{ flex: '1 1 calc(16.67% - 12px)', minWidth: '150px' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={onClearFilters}
                  startIcon={<ClearIcon />}
                >
                  Clear Filters
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
    </LocalizationProvider>
  );
};

export default InboxFilters; 