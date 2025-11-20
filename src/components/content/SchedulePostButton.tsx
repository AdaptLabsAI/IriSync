// Schedule Post Button Component
import * as React from 'react';
import { Button } from '../ui/Button';

export interface SchedulePostButtonProps {
  onSchedule?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SchedulePostButton({ onSchedule, disabled, className }: SchedulePostButtonProps) {
  return (
    <Button
      onClick={onSchedule}
      disabled={disabled}
      className={className}
    >
      Schedule Post
    </Button>
  );
}

export default SchedulePostButton;
