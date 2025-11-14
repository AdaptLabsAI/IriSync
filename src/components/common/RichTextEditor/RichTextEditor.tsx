'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Box, TextField, CircularProgress } from '@mui/material';

// Dynamically import React Quill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // Import styles for the editor when in client side
    if (typeof window !== 'undefined') {
      await import('react-quill/dist/quill.snow.css');
    }
    return RQ;
  },
  {
    loading: () => (
      <Box sx={{ minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    ),
    ssr: false
  }
);

// Quill modules configuration
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image', 'code-block'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false
  }
};

// Quill formats
const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'link', 'image', 'code-block',
  'align'
];

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}

/**
 * Rich Text Editor component using React Quill
 * Falls back to a simple textarea if React Quill is not available
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write content here...',
  disabled = false,
  minHeight = 400
}) => {
  const [isClient, setIsClient] = useState(false);
  const [fallbackToTextarea, setFallbackToTextarea] = useState(false);
  const quillRef = useRef<any>(null);

  // Check if we're running in client side
  useEffect(() => {
    setIsClient(true);
    
    // Set a timeout to fall back to textarea if ReactQuill takes too long to load
    const timer = setTimeout(() => {
      if (!quillRef.current) {
        setFallbackToTextarea(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle when React Quill fails to load
  const handleError = () => {
    console.error('Failed to load React Quill editor');
    setFallbackToTextarea(true);
  };

  // If in SSR or React Quill fails to load, show a textarea
  if (!isClient || fallbackToTextarea) {
    return (
      <TextField
        multiline
        fullWidth
        minRows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        sx={{ 
          '& .MuiOutlinedInput-root': {
            fontFamily: 'monospace',
            minHeight: minHeight
          }
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        '.ql-editor': {
          minHeight: minHeight,
          fontSize: '1rem',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
        '.ql-container': {
          border: '1px solid #ccc',
          borderRadius: '0 0 4px 4px',
        },
        '.ql-toolbar': {
          border: '1px solid #ccc',
          borderRadius: '4px 4px 0 0',
        }
      }}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={disabled}
        onError={handleError}
      />
    </Box>
  );
};

export default RichTextEditor; 