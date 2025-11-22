import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, AlertCircle, X, Loader2 } from 'lucide-react';
import { Dialog as MuiDialog, DialogContent, DialogTitle, DialogActions } from '@mui/material';

export interface DeleteMediaButtonProps {
  /**
   * IDs of media items to delete
   */
  mediaIds: string[];
  /**
   * Function to call to delete media items
   */
  onDelete: (mediaIds: string[]) => Promise<{ success: boolean; message?: string }>;
  /**
   * Whether the button should be visible as a danger variant
   */
  isDanger?: boolean;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional text to display instead of "Delete"
   */
  label?: string;
  /**
   * Whether to show the button as icon-only
   */
  iconOnly?: boolean;
  /**
   * Optional tooltip text
   */
  tooltip?: string;
  /**
   * Variant of the button
   */
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  /**
   * Whether the button is used for bulk deletion
   */
  isBulkAction?: boolean;
}

/**
 * DeleteMediaButton - Button for deleting media items
 */
export const DeleteMediaButton: React.FC<DeleteMediaButtonProps> = ({
  mediaIds,
  onDelete,
  isDanger = true,
  className = '',
  size = 'sm',
  disabled = false,
  isLoading = false,
  label = 'Delete',
  iconOnly = false,
  tooltip = 'Delete selected media',
  variant: propVariant,
  isBulkAction = false,
}) => {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);
  
  // Determine the button variant based on props
  const variant = propVariant || (isDanger ? 'contained' : 'outlined');
  const color = isDanger ? 'error' : 'primary';
  
  // Calculate media count label
  const getCountLabel = () => {
    const count = mediaIds.length;
    if (count === 0) return '';
    return count === 1 ? '1 item' : `${count} items`;
  };
  
  // Map the size prop to ButtonSize
  const mapSize = (s: 'sm' | 'md' | 'lg'): 'small' | 'medium' | 'large' => {
    if (s === 'sm') return 'small';
    if (s === 'md') return 'medium';
    if (s === 'lg') return 'large';
    return 'medium';
  };
  
  // Handle delete action
  const handleDelete = async () => {
    if (mediaIds.length === 0) return;
    
    setIsDeleting(true);
    setResult(null);
    
    try {
      const deleteResult = await onDelete(mediaIds);
      setResult(deleteResult);
      
      // Auto-close dialog on success after a delay
      if (deleteResult.success) {
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred while deleting media. Please try again.'
      });
      console.error('Error deleting media:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <Button
        variant={variant as any}
        color={color as any}
        size={mapSize(size)}
        className={`${iconOnly ? 'p-0 h-8 w-8' : ''} ${className}`}
        disabled={disabled || isLoading || mediaIds.length === 0}
        aria-label={tooltip}
        title={mediaIds.length === 0 ? 'No media selected' : tooltip}
        onClick={() => setOpen(true)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Trash2 className={`h-4 w-4 ${!iconOnly ? 'mr-2' : ''}`} />
            {!iconOnly && (label || 'Delete')}
            {isBulkAction && mediaIds.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                {mediaIds.length}
              </span>
            )}
          </>
        )}
      </Button>
      
      <MuiDialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {result 
            ? (result.success ? 'Media Deleted' : 'Delete Failed')
            : `Delete ${getCountLabel()}`
          }
        </DialogTitle>
        
        <DialogContent>
          {result ? (
            <div className={`text-center ${result.success ? 'text-[#00CC44]' : 'text-red-600'}`}>
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-gray-100">
                {result.success ? (
                  <Trash2 className="h-6 w-6 text-[#00CC44]" />
                ) : (
                  <X className="h-6 w-6 text-red-600" />
                )}
              </div>
              <p className="font-medium">
                {result.message || (result.success 
                  ? `Successfully deleted ${getCountLabel()}.` 
                  : `Failed to delete ${getCountLabel()}.`
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                {mediaIds.length > 0 ? (
                  <>
                    <h3 className="font-medium text-lg mb-2">
                      Are you sure you want to delete {getCountLabel()}?
                    </h3>
                    <p className="text-gray-500 text-sm">
                      This action cannot be undone, and the media will be permanently removed from your library.
                    </p>
                  </>
                ) : (
                  <h3 className="font-medium text-lg mb-2">
                    No media selected to delete.
                  </h3>
                )}
              </div>
              
              {mediaIds.length > 0 && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 mb-4">
                  <p className="flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      If these media files are used in published or scheduled posts, 
                      the posts will still reference them but the media will not be available.
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          {!result ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="mr-2"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                color="error"
                onClick={handleDelete}
                disabled={isDeleting || mediaIds.length === 0}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {getCountLabel()}
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpen(false)}>
              Close
            </Button>
          )}
        </DialogActions>
      </MuiDialog>
    </>
  );
};

export default DeleteMediaButton; 