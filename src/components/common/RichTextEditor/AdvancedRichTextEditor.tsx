'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Box, 
  Button, 
  IconButton, 
  Stack, 
  Typography, 
  Tooltip, 
  Menu, 
  MenuItem, 
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Link,
  Image,
  VideoLibrary,
  EmojiEmotions,
  Undo,
  Redo,
  Save,
  AutoAwesome,
  Spellcheck,
  Translate,
  ColorLens,
  FormatSize,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  TableChart,
  InsertDriveFile,
  Psychology
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/components/ui/use-toast';

// Dynamically import React Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <Box sx={{ minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
});

// Import Quill styles
import 'react-quill/dist/quill.snow.css';

export interface AdvancedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
  enableAI?: boolean;
  enableCollaboration?: boolean;
  enableVersioning?: boolean;
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
  onSave?: (content: string) => Promise<void>;
  onAIAssist?: (prompt: string, content: string) => Promise<string>;
  userId?: string;
  documentId?: string;
  brandGuidelines?: {
    tone?: string;
    style?: string;
    keywords?: string[];
    restrictions?: string[];
  };
}

interface AIAssistanceRequest {
  type: 'improve' | 'summarize' | 'expand' | 'translate' | 'tone' | 'grammar';
  prompt?: string;
  targetLanguage?: string;
  targetTone?: string;
}

/**
 * Advanced Rich Text Editor with AI assistance, collaboration, and media support
 */
const AdvancedRichTextEditor: React.FC<AdvancedRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  minHeight = 400,
  maxHeight = 800,
  enableAI = true,
  enableCollaboration = false,
  enableVersioning = false,
  enableAutoSave = true,
  autoSaveInterval = 30000, // 30 seconds
  onSave,
  onAIAssist,
  userId,
  documentId,
  brandGuidelines
}) => {
  const [isClient, setIsClient] = useState(false);
  const [aiMenuAnchor, setAiMenuAnchor] = useState<null | HTMLElement>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIPromptDialog, setShowAIPromptDialog] = useState(false);
  const [currentAIRequest, setCurrentAIRequest] = useState<AIAssistanceRequest | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const quillRef = useRef<any>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!enableAutoSave || !onSave || !value) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onSave(value);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast({ variant: 'destructive',
          title: 'Auto-save failed',
          description: 'Your changes could not be saved automatically.',
        });
      } finally {
        setIsSaving(false);
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [value, enableAutoSave, onSave, autoSaveInterval]);

  // Update statistics when content changes
  useEffect(() => {
    if (value) {
      const text = value.replace(/<[^>]*>/g, ''); // Strip HTML tags
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
      setCharacterCount(text.length);
      setReadingTime(Math.ceil(words.length / 200)); // Average reading speed
    } else {
      setWordCount(0);
      setCharacterCount(0);
      setReadingTime(0);
    }
  }, [value]);

  // File drop zone for media uploads
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        // Create a data URL for the file
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // Insert the media into the editor
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection();
          const index = range ? range.index : quill.getLength();
          
          if (file.type.startsWith('image/')) {
            quill.insertEmbed(index, 'image', dataUrl);
          } else if (file.type.startsWith('video/')) {
            quill.insertEmbed(index, 'video', dataUrl);
          } else {
            // For other files, insert as a link
            quill.insertText(index, file.name, 'link', dataUrl);
          }
        }

        toast({ variant: 'success',
          title: 'Media uploaded',
          description: `${file.name} has been added to your content.`
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({ variant: 'destructive',
          title: 'Upload failed',
          description: `Failed to upload ${file.name}`
        });
      }
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  // AI assistance functions
  const handleAIAssist = async (request: AIAssistanceRequest) => {
    if (!onAIAssist || !enableAI) return;

    setIsAIProcessing(true);
    try {
      let prompt = '';
      
      switch (request.type) {
        case 'improve':
          prompt = request.prompt || 'Improve this content for better clarity and engagement';
          break;
        case 'summarize':
          prompt = 'Create a concise summary of this content';
          break;
        case 'expand':
          prompt = 'Expand this content with more details and examples';
          break;
        case 'translate':
          prompt = `Translate this content to ${request.targetLanguage}`;
          break;
        case 'tone':
          prompt = `Adjust the tone of this content to be more ${request.targetTone}`;
          break;
        case 'grammar':
          prompt = 'Fix grammar and spelling errors in this content';
          break;
      }

      // Add brand guidelines to prompt if available
      if (brandGuidelines) {
        prompt += `\n\nBrand Guidelines:`;
        if (brandGuidelines.tone) prompt += `\n- Tone: ${brandGuidelines.tone}`;
        if (brandGuidelines.style) prompt += `\n- Style: ${brandGuidelines.style}`;
        if (brandGuidelines.keywords?.length) prompt += `\n- Keywords to include: ${brandGuidelines.keywords.join(', ')}`;
        if (brandGuidelines.restrictions?.length) prompt += `\n- Restrictions: ${brandGuidelines.restrictions.join(', ')}`;
      }

      const improvedContent = await onAIAssist(prompt, value);
      onChange(improvedContent);
      
      toast({ variant: 'success',
        title: 'AI assistance applied',
        description: 'Your content has been improved using AI.'
      });
    } catch (error) {
      console.error('AI assistance failed:', error);
      toast({ variant: 'destructive',
        title: 'AI assistance failed',
        description: 'Unable to process your request. Please try again.'
      });
    } finally {
      setIsAIProcessing(false);
      setAiMenuAnchor(null);
      setShowAIPromptDialog(false);
    }
  };

  const handleCustomAIPrompt = () => {
    setCurrentAIRequest({ type: 'improve', prompt: aiPrompt });
    setShowAIPromptDialog(true);
  };

  const handleInsertLink = () => {
    const quill = quillRef.current?.getEditor();
    if (quill && linkUrl) {
      const range = quill.getSelection();
      if (range) {
        if (linkText) {
          quill.insertText(range.index, linkText, 'link', linkUrl);
        } else {
          quill.format('link', linkUrl);
        }
      }
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleManualSave = async () => {
    if (!onSave) return;
    
    try {
      setIsSaving(true);
      await onSave(value);
      setLastSaved(new Date());
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Save failed:', error);
      toast({ variant: 'destructive',
        title: 'Save failed',
        description: 'Your changes could not be saved.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Quill modules configuration
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image', 'video', 'formula'],
        ['code-block'],
        ['clean']
      ]
    },
    clipboard: {
      matchVisual: false
    },
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video', 'formula',
    'code-block'
  ];

  if (!isClient) {
    return (
      <Box sx={{ minHeight, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Custom Toolbar */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: '4px 4px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {/* AI Assistance */}
          {enableAI && (
            <>
              <Tooltip title="AI Assistance">
                <IconButton
                  size="small"
                  onClick={(e) => setAiMenuAnchor(e.currentTarget)}
                  disabled={isAIProcessing}
                  color="primary"
                >
                  {isAIProcessing ? <CircularProgress size={20} /> : <Psychology />}
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={aiMenuAnchor}
                open={Boolean(aiMenuAnchor)}
                onClose={() => setAiMenuAnchor(null)}
              >
                <MenuItem onClick={() => handleAIAssist({ type: 'improve' })}>
                  <AutoAwesome sx={{ mr: 1 }} /> Improve Content
                </MenuItem>
                <MenuItem onClick={() => handleAIAssist({ type: 'grammar' })}>
                  <Spellcheck sx={{ mr: 1 }} /> Fix Grammar
                </MenuItem>
                <MenuItem onClick={() => handleAIAssist({ type: 'summarize' })}>
                  <FormatQuote sx={{ mr: 1 }} /> Summarize
                </MenuItem>
                <MenuItem onClick={() => handleAIAssist({ type: 'expand' })}>
                  <FormatSize sx={{ mr: 1 }} /> Expand
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleCustomAIPrompt}>
                  <Psychology sx={{ mr: 1 }} /> Custom Prompt
                </MenuItem>
              </Menu>
            </>
          )}

          {/* Save Button */}
          {onSave && (
            <Tooltip title="Save">
              <IconButton
                size="small"
                onClick={handleManualSave}
                disabled={isSaving}
                color="primary"
              >
                {isSaving ? <CircularProgress size={20} /> : <Save />}
              </IconButton>
            </Tooltip>
          )}

          <Divider orientation="vertical" flexItem />

          {/* Quick Actions */}
          <Tooltip title="Insert Link">
            <IconButton size="small" onClick={() => setLinkDialogOpen(true)}>
              <Link />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Statistics */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {wordCount} words • {characterCount} characters • {readingTime} min read
          </Typography>
          
          {lastSaved && (
            <Typography variant="caption" color="text.secondary">
              Last saved: {lastSaved.toLocaleTimeString()}
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Editor Container with Drop Zone */}
      <Box
        {...getRootProps()}
        sx={{
          position: 'relative',
          border: isDragActive ? 2 : 1,
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderTop: 0,
          borderRadius: '0 0 4px 4px',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          minHeight,
          maxHeight
        }}
      >
        <input {...getInputProps()} />
        
        {isDragActive && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: '0 0 4px 4px'
            }}
          >
            <Typography variant="h6" color="primary">
              Drop files here to upload
            </Typography>
          </Box>
        )}

        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={disabled}
        />
      </Box>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)}>
        <DialogTitle>Insert Link</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL"
            type="url"
            fullWidth
            variant="outlined"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Link Text (optional)"
            fullWidth
            variant="outlined"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInsertLink} variant="primary">Insert</Button>
        </DialogActions>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog open={showAIPromptDialog} onClose={() => setShowAIPromptDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Custom AI Prompt</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Describe what you want the AI to do with your content"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g., Make this more professional, add examples, change tone to casual..."
          />
          
          {brandGuidelines && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Brand Guidelines (will be applied automatically):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {brandGuidelines.tone && <Chip label={`Tone: ${brandGuidelines.tone}`} size="small" />}
                {brandGuidelines.style && <Chip label={`Style: ${brandGuidelines.style}`} size="small" />}
                {brandGuidelines.keywords?.map((keyword, index) => (
                  <Chip key={index} label={keyword} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAIPromptDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => currentAIRequest && handleAIAssist({ ...currentAIRequest, prompt: aiPrompt })}
            variant="primary"
            disabled={!aiPrompt.trim() || isAIProcessing}
          >
            {isAIProcessing ? <CircularProgress size={20} /> : 'Apply AI'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Message */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowSuccessMessage(false)} severity="success">
          Content saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvancedRichTextEditor; 