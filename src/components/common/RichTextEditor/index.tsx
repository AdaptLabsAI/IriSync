'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, IconButton, Stack, Typography, Tooltip } from '@mui/material';
import { 
  CodeIcon, 
  LinkIcon, 
  PhotographIcon, 
  EmojiHappyIcon,
  DocumentTextIcon
} from '@heroicons/react/outline';

interface RichTextEditorProps {
  initialValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  height?: string | number;
  maxHeight?: string | number;
  isDisabled?: boolean;
  id?: string;
  name?: string;
}

/**
 * A simple rich text editor component
 * For a production app, you would use a proper rich text editor library
 * like TipTap, Slate.js, or Draft.js
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue = '',
  placeholder = 'Start typing...',
  onChange,
  height = '200px',
  maxHeight = '500px',
  isDisabled = false,
  id,
  name,
}) => {
  const [content, setContent] = useState(initialValue);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update content when initialValue changes
  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);
  
  // Handle content change
  const handleChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.innerHTML;
    setContent(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };
  
  const handleImageUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  
  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = `<img src='${ev.target?.result}' alt='uploaded' style='max-width:100%;' />`;
        setContent((prev) => prev + img);
        if (onChange) onChange(content + img);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Colors for editor
  const bgColor = 'background.paper';
  const textColor = 'text.primary';
  
  // Toolbar button handlers (placeholders for a real implementation)
  const handleBold = () => {
    document.execCommand('bold', false);
  };
  
  const handleItalic = () => {
    document.execCommand('italic', false);
  };
  
  const handleUnderline = () => {
    document.execCommand('underline', false);
  };
  
  const handleLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  };
  
  const handleCode = () => {
    document.execCommand('formatBlock', false, '<pre>');
  };
  
  // Create a simple toolbar
  const Toolbar = () => (
    <Box 
      sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'grey.100',
        borderRadius: '4px 4px 0 0'
      }}
    >
      <Stack direction="row" spacing={2}>
        <Stack direction="row">
          <Button size="small" onClick={handleBold} sx={{ fontWeight: 'bold' }}>B</Button>
          <Button size="small" onClick={handleItalic} sx={{ fontStyle: 'italic' }}>I</Button>
          <Button size="small" onClick={handleUnderline} sx={{ textDecoration: 'underline' }}>U</Button>
        </Stack>

        <Stack direction="row">
          <Tooltip title="Insert link">
            <IconButton
              size="small"
              aria-label="Insert link"
              onClick={handleLink}
            >
              <LinkIcon className="w-4 h-4" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Insert code">
            <IconButton
              size="small"
              aria-label="Insert code"
              onClick={handleCode}
            >
              <CodeIcon className="w-4 h-4" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Insert image">
            <Box>
              <IconButton
                size="small"
                aria-label="Insert image"
                onClick={handleImageUpload}
              >
                <PhotographIcon className="w-4 h-4" />
              </IconButton>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={onImageSelected}
              />
            </Box>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
  
  return (
    <Box 
      sx={{ 
        border: 1, 
        borderColor: 'divider', 
        borderRadius: 1, 
        overflow: 'hidden'
      }}
    >
      <Toolbar />
      
      <Box
        contentEditable={!isDisabled}
        dangerouslySetInnerHTML={{ __html: content }}
        onInput={handleChange}
        sx={{
          height,
          maxHeight,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'background.paper',
          color: 'text.primary',
          '&:focus': {
            outline: 'none',
            boxShadow: 1
          },
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: 'text.disabled',
            pointerEvents: 'none'
          }
        }}
        id={id}
        data-name={name}
        data-placeholder={placeholder}
      />
    </Box>
  );
};

export default RichTextEditor; 