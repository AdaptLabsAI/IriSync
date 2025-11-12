import React, { useState } from 'react';
import { Button } from '@mui/material';
import { FolderPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@mui/material';
import TextField from '@mui/material/TextField';

interface CreateFolderButtonProps {
  /**
   * Callback function when a new folder is created
   */
  onFolderCreate?: (folderName: string) => void;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Option to override default button size
   */
  size?: 'sm' | 'md' | 'lg';
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

// Map size to ButtonSize
const mapSize = (s: 'sm' | 'md' | 'lg'): 'small' | 'medium' | 'large' => {
  if (s === 'sm') return 'small';
  if (s === 'md') return 'medium';
  if (s === 'lg') return 'large';
  return 'medium';
};

/**
 * CreateFolderButton - Button to create a new folder in the media library
 */
export const CreateFolderButton: React.FC<CreateFolderButtonProps> = ({
  onFolderCreate,
  className = '',
  size = 'sm',
  disabled = false,
  isLoading = false,
  tooltip = 'Create new folder'
}) => {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }
    
    if (folderName.length > 50) {
      setError('Folder name must be less than 50 characters');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (onFolderCreate) {
        onFolderCreate(folderName);
      }
      
      setFolderName('');
      setOpen(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size={mapSize(size)}
        className={`flex items-center gap-2 ${className}`}
        disabled={disabled || isLoading}
        title={tooltip}
        aria-label="Create new folder"
        onClick={() => setOpen(true)}
      >
        {isLoading ? (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <FolderPlus className="h-4 w-4" />
        )}
        <span>New Folder</span>
      </Button>
      
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2 mt-2">
              <TextField
                id="folderName"
                label="Folder Name"
                placeholder="Enter folder name"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setError('');
                }}
                autoFocus
                required
                fullWidth
                error={!!error}
                helperText={error}
                inputProps={{ maxLength: 50 }}
              />
            </div>
            
            <DialogActions className="mt-4">
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setFolderName('');
                  setError('');
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || !folderName.trim()}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Creating...
                  </>
                ) : (
                  'Create Folder'
                )}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateFolderButton; 