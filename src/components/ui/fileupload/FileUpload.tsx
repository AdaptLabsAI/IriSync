import React, { useState, useRef } from 'react';
import cn from 'classnames';

export interface FileUploadProps {
  /**
   * Called when files are selected
   */
  onFileSelect?: (files: File[]) => void;
  /**
   * Allowed file types (e.g., '.jpg,.png,.pdf')
   */
  accept?: string;
  /**
   * Allow multiple file selection
   */
  multiple?: boolean;
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;
  /**
   * Custom validation function
   */
  validate?: (file: File) => boolean | string;
  /**
   * Whether to show a preview of selected files
   */
  showPreview?: boolean;
  /**
   * Whether to enable drag and drop
   */
  dragAndDrop?: boolean;
  /**
   * Text to show when no file is selected
   */
  placeholder?: string;
  /**
   * Text to show for the button
   */
  buttonText?: string;
  /**
   * Whether the uploader is disabled
   */
  disabled?: boolean;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Label text
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Help text to display
   */
  helperText?: string;
  /**
   * Maximum number of files that can be selected
   */
  maxFiles?: number;
}

/**
 * FileUpload component for selecting and uploading files
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  multiple = false,
  maxSize,
  validate,
  showPreview = true,
  dragAndDrop = true,
  placeholder = 'Drag files here or click to select',
  buttonText = 'Select Files',
  disabled = false,
  required = false,
  label,
  error: propError,
  className,
  helperText,
  maxFiles,
}) => {
  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for selected files
  const [files, setFiles] = useState<File[]>([]);
  
  // State for drag over status
  const [isDragOver, setIsDragOver] = useState(false);
  
  // State for errors
  const [error, setError] = useState<string | null>(propError || null);
  
  // Handle file selection
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    // Convert FileList to array
    const fileArray = Array.from(selectedFiles);
    
    // Check max files limit
    if (maxFiles && fileArray.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    fileArray.forEach(file => {
      let isValid = true;
      
      // Check file size
      if (maxSize && file.size > maxSize) {
        errors.push(`${file.name} exceeds the maximum file size of ${formatFileSize(maxSize)}`);
        isValid = false;
      }
      
      // Run custom validation
      if (validate && isValid) {
        const validationResult = validate(file);
        if (typeof validationResult === 'string') {
          errors.push(validationResult);
          isValid = false;
        } else if (validationResult === false) {
          errors.push(`${file.name} failed validation`);
          isValid = false;
        }
      }
      
      if (isValid) {
        validFiles.push(file);
      }
    });
    
    // Update state
    if (errors.length > 0) {
      setError(errors.join('. '));
    } else {
      setError(null);
    }
    
    if (validFiles.length > 0) {
      const newFiles = multiple ? [...files, ...validFiles] : validFiles;
      setFiles(newFiles);
      onFileSelect?.(newFiles);
    }
  };
  
  // Handle button click
  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };
  
  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || !dragAndDrop) return;
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || !dragAndDrop) return;
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || !dragAndDrop) return;
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };
  
  // Handle file removal
  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFileSelect?.(newFiles);
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Generate a unique ID for accessibility
  const id = `file-upload-${Math.random().toString(36).substring(2, 11)}`;
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-900"
        >
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      
      {/* File input area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary",
          isDragOver ? "border-primary bg-primary/5" : "border-gray-300",
          disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : "hover:border-primary",
          error ? "border-destructive focus-within:ring-destructive" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-disabled={disabled}
        aria-required={required}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleButtonClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          required={required}
          className="sr-only"
          onChange={(e) => handleFileSelect(e.target.files)}
          aria-describedby={`${id}-error ${id}-helper`}
        />
        
        <div className="space-y-2 flex flex-col items-center">
          {/* Upload icon */}
          <div className="mx-auto h-12 w-12 text-gray-400">
            <UploadIcon />
          </div>
          
          {/* Upload text */}
          <div className="text-sm text-gray-700">
            {placeholder}
          </div>
          
          {/* Button */}
          <button
            type="button"
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleButtonClick();
            }}
          >
            {buttonText}
          </button>
          
          {/* Helper text */}
          {helperText && (
            <p 
              id={`${id}-helper`}
              className="text-xs text-gray-500"
            >
              {helperText}
            </p>
          )}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <p 
          id={`${id}-error`}
          className="mt-1 text-xs text-destructive"
        >
          {error}
        </p>
      )}
      
      {/* File previews */}
      {showPreview && files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200"
              >
                <div className="flex items-center">
                  <FileIcon className="mr-2 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 truncate" style={{ maxWidth: '200px' }}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  className="text-gray-400 hover:text-destructive focus:outline-none"
                  aria-label={`Remove ${file.name}`}
                >
                  <DeleteIcon />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Upload icon
const UploadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className="w-full h-full"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

// File icon
const FileIcon = ({ className }: { className?: string }) => (
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
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// Delete icon
const DeleteIcon = () => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export default FileUpload;