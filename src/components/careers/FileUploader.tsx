import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  LinearProgress, 
  Paper, 
  IconButton,
  Link,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface FileUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  onClear: () => void;
  type: 'resume' | 'coverLetter' | 'other';
  required?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  helperText?: string;
}

export default function FileUploader({
  label,
  value,
  onChange,
  onClear,
  type,
  required = false,
  accept = '.pdf,.doc,.docx',
  maxSize = 10 * 1024 * 1024, // 10MB default
  helperText
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size exceeds the maximum limit of ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    // Start upload
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setFileName(file.name);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // Simulate upload progress (in a real app, you'd use upload API with progress events)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // Upload file
      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData
      });

      // Clear progress interval
      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Complete progress
      setUploadProgress(100);

      // Get response data
      const data = await response.json();
      
      // Call onChange with the file URL
      onChange(data.url);
      setFileName(file.name);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  // Handle clear button click
  const handleClear = () => {
    onClear();
    setFileName(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Extract filename from URL if we have a value but no filename
  React.useEffect(() => {
    if (value && !fileName) {
      const urlParts = value.split('/');
      const possibleFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
      setFileName(decodeURIComponent(possibleFileName));
    }
  }, [value, fileName]);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label} {required && <span style={{ color: 'error.main' }}>*</span>}
      </Typography>
      
      {!value ? (
        // Upload state
        <Paper
          variant="outline"
          sx={{
            p: 2,
            border: '1px dashed',
            borderColor: error ? 'error.main' : 'divider',
            bgcolor: 'background.default',
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover'
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          
          <CloudUploadIcon 
            color={error ? "error" : "primary"} 
            sx={{ fontSize: 40, mb: 1 }} 
          />
          
          <Typography variant="body1" component="div" gutterBottom>
            {uploading 
              ? `Uploading ${fileName || 'file'}...` 
              : `Drag & drop your ${type} or click to browse`
            }
          </Typography>
          
          {uploading && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                color="primary"
              />
              <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                {uploadProgress}%
              </Typography>
            </Box>
          )}
          
          {error && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, color: 'error.main' }}>
              <ErrorIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            </Box>
          )}
          
          {!uploading && !error && (
            <Typography variant="caption" color="text.secondary">
              {helperText || `Supported formats: PDF, Word (.doc, .docx). Max size: ${Math.round(maxSize / (1024 * 1024))}MB.`}
            </Typography>
          )}
        </Paper>
      ) : (
        // File uploaded state
        <Paper
          variant="outline"
          sx={{ 
            p: 2, 
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InsertDriveFileIcon color="primary" sx={{ mr: 1 }} />
            <Box>
              <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                {fileName || 'File uploaded'}
              </Typography>
              <Link href={value} target="_blank" variant="caption" sx={{ display: 'block' }}>
                View file
              </Link>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            <Tooltip title="Remove file">
              <IconButton onClick={handleClear} size="sm">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}
    </Box>
  );
}