'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Grid,
  FormControlLabel,
  Switch,
  MenuItem,
  Paper,
  Typography,
  Divider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';

interface ContentPost {
  id: string;
  title: string;
  content: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: Date;
  authorId: string;
  authorName: string;
  createdAt: any;
  updatedAt: any;
  [key: string]: any; // Allow additional fields
}

interface ContentEditorFormProps {
  post: ContentPost;
  onSave: (updatedData: Partial<ContentPost>) => Promise<boolean>;
  isSaving: boolean;
}

export default function ContentEditorForm({ post, onSave, isSaving }: ContentEditorFormProps) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [platform, setPlatform] = useState(post.platform);
  const [status, setStatus] = useState(post.status);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(post.scheduledFor || null);
  const [isScheduling, setIsScheduling] = useState(post.status === 'scheduled');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setError(null);
      
      // Basic validation
      if (!title.trim()) {
        setError('Title is required');
        return;
      }
      
      if (!content.trim()) {
        setError('Content is required');
        return;
      }
      
      if (!platform) {
        setError('Platform is required');
        return;
      }
      
      // Prepare updated data
      const updatedData: Partial<ContentPost> = {
        title,
        content,
        platform,
        status
      };
      
      // Add scheduled date if scheduling
      if (status === 'scheduled' && scheduledFor) {
        updatedData.scheduledFor = scheduledFor;
      } else {
        // Remove scheduledFor if not scheduling
        updatedData.scheduledFor = undefined;
      }
      
      // Save changes
      const success = await onSave(updatedData);
      
      if (!success) {
        setError('Failed to save changes. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleScheduleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isScheduled = event.target.checked;
    setIsScheduling(isScheduled);
    setStatus(isScheduled ? 'scheduled' : 'draft');
  };

  // List of supported platforms
  const platforms = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'tiktok', label: 'TikTok' }
  ];

  return (
    <Box component="form" noValidate autoComplete="off">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Stack spacing={3}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          disabled={isSaving}
          required
        />
        
        <TextField
          label="Platform"
          select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          fullWidth
          disabled={isSaving}
          required
        >
          {platforms.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        
        <TextField
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          fullWidth
          multiline
          rows={6}
          disabled={isSaving}
          required
        />
        
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={isScheduling}
                onChange={handleScheduleToggle}
                disabled={isSaving}
              />
            }
            label="Schedule post"
          />
          
          {isScheduling && (
            <Paper sx={{ p: 2, mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Schedule publication date and time
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  value={scheduledFor}
                  onChange={(date) => setScheduledFor(date)}
                  slotProps={{ textField: { fullWidth: true } }}
                  disabled={isSaving}
                />
              </LocalizationProvider>
            </Paper>
          )}
        </Box>
        
        <Divider />
        
        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button 
            variant="outlined" 
            disabled={isSaving}
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : null}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
} 