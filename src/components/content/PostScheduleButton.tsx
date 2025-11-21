import React, { useState } from 'react';
import { Button } from '../../ui/button/Button';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DateTimePicker } from '../../ui/datepicker';
import { Select } from '../../ui/select/Select';
import { SocialPlatform } from '../platform/PlatformConnectButton';

export interface ScheduledPost {
  id: string;
  content: string;
  scheduledTime: Date;
  platforms: SocialPlatform[];
  status: 'scheduled' | 'posted' | 'failed';
}

export interface PostScheduleButtonProps {
  /**
   * Post content or ID to schedule
   */
  postId?: string;
  /**
   * Post content (if not using an existing post)
   */
  content?: string;
  /**
   * Available platforms to choose from
   */
  availablePlatforms: Array<{
    id: SocialPlatform;
    name: string;
    isConnected: boolean;
  }>;
  /**
   * Function to call when a post is scheduled
   */
  onSchedule?: (scheduledTime: Date, platforms: SocialPlatform[]) => Promise<void>;
  /**
   * Button size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Additional classes to apply to the button
   */
  className?: string;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether to show the button as icon only
   */
  iconOnly?: boolean;
  /**
   * Pre-selected platforms
   */
  selectedPlatforms?: SocialPlatform[];
  /**
   * Pre-selected date to schedule
   */
  initialScheduleDate?: Date;
  /**
   * Custom button text
   */
  children?: React.ReactNode;
  /**
   * Whether to show the dialog automatically
   */
  autoOpen?: boolean;
}

/**
 * PostScheduleButton component for scheduling social media posts
 */
export const PostScheduleButton: React.FC<PostScheduleButtonProps> = ({
  postId,
  content,
  availablePlatforms,
  onSchedule,
  size = 'md',
  variant = 'primary',
  className,
  disabled = false,
  iconOnly = false,
  selectedPlatforms = [],
  initialScheduleDate,
  children = 'Schedule',
  autoOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(initialScheduleDate);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(selectedPlatforms);
  
  // Generate platform options for select
  const platformOptions = availablePlatforms.map(platform => ({
    value: platform.id,
    label: platform.name,
    disabled: !platform.isConnected,
  }));

  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  const handleSchedule = async () => {
    if (!scheduleDate) {
      setError('Please select a date and time');
      return;
    }

    if (platforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (onSchedule) {
        await onSchedule(scheduleDate, platforms);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to schedule post:', error);
      setError(error instanceof Error ? error.message : 'Failed to schedule post');
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value as SocialPlatform);
    setPlatforms(selectedOptions);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpenDialog}
        disabled={disabled}
        loading={loading}
        leftIcon={!iconOnly && <CalendarIcon />}
        aria-label={iconOnly ? 'Schedule post' : undefined}
      >
        {iconOnly ? <CalendarIcon /> : children}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Schedule Post</DialogTitle>
        <DialogContent>
          <div className="p-4 flex flex-col gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select when you'd like this post to be published and which platforms to post to.
              </p>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-900 mb-1">Schedule Date & Time</span>
              <DateTimePicker
                value={scheduleDate}
                onChange={(date) => setScheduleDate(date)}
                placeholder="Select date and time"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-900 mb-1">Select Platforms</span>
              <Select
                multiple
                options={platformOptions}
                value={platforms}
                onChange={handlePlatformChange}
                placeholder="Select platforms"
              />
              {platformOptions.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  You don't have any connected platforms. Please connect at least one platform in Settings.
                </p>
              )}
            </div>

            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outline"
            size="md"
            onClick={handleCloseDialog}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSchedule}
            loading={loading}
            disabled={loading || !scheduleDate || platforms.length === 0}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="2" />
    <line x1="2" y1="7" x2="14" y2="7" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
  </svg>
);

export default PostScheduleButton; 