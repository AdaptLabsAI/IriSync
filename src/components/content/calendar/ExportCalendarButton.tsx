import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { RadioGroup } from '../../ui/radio/RadioGroup';
import { DatePicker } from '../../ui/datepicker';

export type CalendarExportFormat = 'ics' | 'csv' | 'pdf' | 'json';

export interface ExportCalendarButtonProps {
  /**
   * Function to call when export is requested
   */
  onExport: (format: CalendarExportFormat, options: CalendarExportOptions) => Promise<void>;
  /**
   * Available export formats
   */
  availableFormats?: CalendarExportFormat[];
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional classes for the button
   */
  className?: string;
  /**
   * Whether to show the button as icon only
   */
  iconOnly?: boolean;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Default date range start
   */
  defaultStartDate?: Date;
  /**
   * Default date range end
   */
  defaultEndDate?: Date;
}

export interface CalendarExportOptions {
  /**
   * Start date for export range
   */
  startDate?: Date;
  /**
   * End date for export range
   */
  endDate?: Date;
  /**
   * Whether to include draft items
   */
  includeDrafts: boolean;
  /**
   * Whether to include published items
   */
  includePublished: boolean;
  /**
   * Whether to include scheduled items
   */
  includeScheduled: boolean;
  /**
   * Whether to include failed items
   */
  includeFailed: boolean;
  /**
   * Selected platforms to include (empty means all)
   */
  platforms: string[];
}

/**
 * ExportCalendarButton component for exporting calendar data in various formats
 */
const ExportCalendarButton: React.FC<ExportCalendarButtonProps> = ({
  onExport,
  availableFormats = ['ics', 'csv', 'pdf', 'json'],
  variant = 'outline',
  size = 'md',
  className = '',
  iconOnly = false,
  disabled = false,
  defaultStartDate = new Date(),
  defaultEndDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<CalendarExportFormat>('ics');
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [includePublished, setIncludePublished] = useState(true);
  const [includeScheduled, setIncludeScheduled] = useState(true);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  
  // Default end date is 30 days from start if not provided
  if (!defaultEndDate) {
    const thirtyDaysFromStart = new Date(defaultStartDate);
    thirtyDaysFromStart.setDate(thirtyDaysFromStart.getDate() + 30);
    defaultEndDate = thirtyDaysFromStart;
  }

  // Handle opening the dialog
  const handleOpenDialog = () => {
    setIsOpen(true);
    setError(null);
  };

  // Handle closing the dialog
  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  // Handle format change
  const handleFormatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFormat(e.target.value as CalendarExportFormat);
  };

  // Handle start date change
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date || undefined);
    
    // Adjust end date if it's before the new start date
    if (date && endDate && date > endDate) {
      // Set end date to 30 days after start date
      const newEndDate = new Date(date);
      newEndDate.setDate(newEndDate.getDate() + 30);
      setEndDate(newEndDate);
    }
  };

  // Handle end date change
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date || undefined);
  };

  // Handle export button click
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate dates
      if (!startDate) {
        setError('Please select a start date');
        setLoading(false);
        return;
      }
      
      if (!endDate) {
        setError('Please select an end date');
        setLoading(false);
        return;
      }
      
      if (startDate > endDate) {
        setError('Start date must be before end date');
        setLoading(false);
        return;
      }
      
      // Export options
      const exportOptions: CalendarExportOptions = {
        startDate,
        endDate,
        includeDrafts,
        includePublished,
        includeScheduled,
        includeFailed,
        platforms,
      };
      
      await onExport(selectedFormat, exportOptions);
      setIsOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Format options for display
  const formatOptions = [
    { value: 'ics', label: 'Calendar (ICS)', description: 'Compatible with Google Calendar, Apple Calendar, Outlook' },
    { value: 'csv', label: 'Spreadsheet (CSV)', description: 'Compatible with Excel, Google Sheets, and other spreadsheet apps' },
    { value: 'pdf', label: 'Document (PDF)', description: 'Printable calendar view' },
    { value: 'json', label: 'Data (JSON)', description: 'Raw data format for developers' },
  ].filter(format => availableFormats.includes(format.value as CalendarExportFormat));

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpenDialog}
        disabled={disabled}
        leftIcon={!iconOnly && <ExportIcon />}
        aria-label={iconOnly ? 'Export calendar' : undefined}
      >
        {iconOnly ? <ExportIcon /> : 'Export'}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Export Calendar</DialogTitle>
        <DialogContent>
          <div className="p-4 min-w-[350px]">
            <p className="text-sm text-gray-600 mb-4">
              Export your calendar data in your preferred format.
            </p>

            {/* Format Selection */}
            <div className="mb-4">
              <RadioGroup
                label="Export Format"
                value={selectedFormat}
                onChange={handleFormatChange}
                options={formatOptions}
              />
            </div>

            {/* Date Range Selection */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Date Range</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Start Date</span>
                  <DatePicker
                    value={startDate}
                    onChange={handleStartDateChange}
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">End Date</span>
                  <DatePicker
                    value={endDate}
                    onChange={handleEndDateChange}
                    placeholder="Select end date"
                    minDate={startDate}
                  />
                </div>
              </div>
            </div>

            {/* Content Type Filters */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Include Content</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeScheduled}
                    onChange={(e) => setIncludeScheduled(e.target.checked)}
                    className="rounded text-primary-500 focus:ring-primary-500"
                  />
                  <span>Scheduled</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includePublished}
                    onChange={(e) => setIncludePublished(e.target.checked)}
                    className="rounded text-primary-500 focus:ring-primary-500"
                  />
                  <span>Published</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeDrafts}
                    onChange={(e) => setIncludeDrafts(e.target.checked)}
                    className="rounded text-primary-500 focus:ring-primary-500"
                  />
                  <span>Drafts</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeFailed}
                    onChange={(e) => setIncludeFailed(e.target.checked)}
                    className="rounded text-primary-500 focus:ring-primary-500"
                  />
                  <span>Failed</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm mb-4">
                {error}
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCloseDialog}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            loading={loading}
            disabled={loading || !startDate || !endDate}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Export Icon component
const ExportIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

export default ExportCalendarButton; 