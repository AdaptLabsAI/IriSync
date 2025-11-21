import React from 'react';
import { Button, ButtonProps } from '../../ui/button';
import { useRouter } from 'next/navigation';

export interface BulkScheduleButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Custom handler for the bulk schedule action
   */
  onBulkSchedule?: () => void;
}

/**
 * A button for bulk scheduling posts.
 * This feature is only available for Influencer and Enterprise tier users.
 */
export const BulkScheduleButton: React.FC<BulkScheduleButtonProps> = ({
  onBulkSchedule,
  variant = 'primary',
  size = 'md',
  children = 'Bulk Schedule',
  ...buttonProps
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (onBulkSchedule) {
      onBulkSchedule();
    } else {
      router.push('/dashboard/content/bulk-schedule');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      // This feature is only available for Influencer and Enterprise tier users
      featureTier="influencer"
      tooltipText="Schedule multiple posts at once"
      {...buttonProps}
    >
      {children}
    </Button>
  );
};

export default BulkScheduleButton; 