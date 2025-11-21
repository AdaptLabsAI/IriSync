import React, { useRef } from 'react';
import { Button, ButtonProps } from '../../ui/button';

export interface UploadMediaButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * The accepted file types (e.g., "image/*, video/*")
   */
  accept?: string;
  /**
   * Whether to allow multiple file selection
   */
  multiple?: boolean;
  /**
   * Called when files are selected
   */
  onUpload?: (files: FileList) => void;
  /**
   * Whether to use an icon-only button
   */
  iconOnly?: boolean;
}

/**
 * A button that opens the file picker dialog for media uploads.
 */
export const UploadMediaButton: React.FC<UploadMediaButtonProps> = ({
  accept = "image/*,video/*",
  multiple = true,
  onUpload,
  iconOnly = false,
  variant = 'primary',
  size = iconOnly ? 'icon' : 'md',
  children = iconOnly ? <UploadIcon /> : 'Upload Media',
  tooltipText = iconOnly ? 'Upload Media' : undefined,
  ...buttonProps
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    // Programmatically click the hidden file input
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onUpload) {
      onUpload(files);
    }
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleButtonClick}
        tooltipText={tooltipText}
        aria-label={iconOnly ? 'Upload Media' : undefined}
        {...buttonProps}
      >
        {children}
      </Button>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </>
  );
};

// Upload icon component
const UploadIcon = () => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default UploadMediaButton; 