import React from 'react';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/router';

interface CreatePostButtonProps {
  /**
   * Optional callback function to execute when button is clicked
   */
  onClick?: () => void;
  /**
   * Option to override default button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Optional custom label for the button
   */
  label?: string;
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
  /**
   * Whether to show the button in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional tooltip text
   */
  tooltip?: string;
}

/**
 * CreatePostButton - Button to create a new social media post
 */
export const CreatePostButton: React.FC<CreatePostButtonProps> = ({
  onClick,
  size = 'md',
  className = '',
  label = 'Create Post',
  disabled = false,
  isLoading = false,
  tooltip
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior - navigate to post creation page
      router.push('/dashboard/content/create');
    }
  };

  return (
    <Button
      size={size}
      className={`flex items-center gap-2 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
      title={tooltip}
      aria-label={label}
      variant="primary"
    >
      {isLoading ? (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
};

export default CreatePostButton; 