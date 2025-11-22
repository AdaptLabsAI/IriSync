import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  TextField,
  Button,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Slide,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AttachFile as AttachIcon,
  EmojiEmotions as EmojiIcon,
  SmartToy as AIIcon
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { InboxMessage } from '@/lib/features/content/SocialInboxService';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface MobileReplyModalProps {
  open: boolean;
  message: InboxMessage | null;
  onClose: () => void;
  onSend: (messageId: string, reply: string) => Promise<void>;
  onAIAssist?: (messageId: string, context: string) => Promise<string>;
  loading?: boolean;
}

export const MobileReplyModal: React.FC<MobileReplyModalProps> = ({
  open,
  message,
  onClose,
  onSend,
  onAIAssist,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [replyText, setReplyText] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textFieldRef.current) {
      // Focus the text field when modal opens
      setTimeout(() => {
        textFieldRef.current?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setReplyText('');
      setError(null);
    }
  }, [open]);

  const handleSend = async () => {
    if (!message || !replyText.trim()) return;

    try {
      setError(null);
      await onSend(message.id, replyText.trim());
      setReplyText('');
      onClose();
    } catch (err) {
      setError('Failed to send reply. Please try again.');
    }
  };

  const handleAIAssist = async () => {
    if (!message || !onAIAssist) return;

    try {
      setIsAILoading(true);
      setError(null);
      const suggestion = await onAIAssist(message.id, message.content);
      setReplyText(suggestion);
    } catch (err) {
      setError('Failed to generate AI suggestion. Please try again.');
    } finally {
      setIsAILoading(false);
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: '#1877F2',
      instagram: '#E4405F',
      twitter: '#1DA1F2',
      linkedin: '#0A66C2',
      tiktok: '#000000',
      youtube: '#FF0000',
      pinterest: '#BD081C'
    };
    return colors[platform.toLowerCase()] || theme.palette.primary.main;
  };

  if (!isMobile) {
    return null; // Only render on mobile
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: theme.palette.background.default
        }
      }}
    >
      {/* Header */}
      <AppBar 
        position="static" 
        elevation={1}
        sx={{ 
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={onClose}
            aria-label="close"
            disabled={loading}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, ml: 2 }}>
            Reply
          </Typography>
          <Button
            onClick={handleSend}
            disabled={!replyText.trim() || loading}
            variant="primary"
            size="sm"
            startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </Toolbar>
      </AppBar>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Original Message */}
        {message && (
          <Box sx={{ p: 2, backgroundColor: theme.palette.grey[50], borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar
                src={message.sender.profilePicture}
                sx={{ 
                  width: 32, 
                  height: 32, 
                  mr: 1,
                  border: `2px solid ${getPlatformColor(message.platformType)}`
                }}
              >
                {message.sender.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {message.sender.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Chip
                    label={message.platformType}
                    size="sm"
                    sx={{
                      backgroundColor: getPlatformColor(message.platformType),
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 18
                    }}
                  />
                  <Chip
                    label={message.type}
                    size="sm"
                    variant="outline"
                    sx={{ fontSize: '0.7rem', height: 18 }}
                  />
                </Box>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {message.content}
            </Typography>
          </Box>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {/* Reply Input */}
        <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
          <TextField
            inputRef={textFieldRef}
            multiline
            rows={8}
            fullWidth
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            variant="outline"
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                alignItems: 'flex-start',
                '& textarea': {
                  height: '100% !important',
                  overflow: 'auto !important'
                }
              }
            }}
            disabled={loading}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="sm" disabled={loading}>
                <AttachIcon />
              </IconButton>
              <IconButton size="sm" disabled={loading}>
                <EmojiIcon />
              </IconButton>
              {onAIAssist && (
                <IconButton 
                  size="sm" 
                  onClick={handleAIAssist}
                  disabled={loading || isAILoading}
                  sx={{ 
                    color: isAILoading ? 'primary.main' : 'inherit',
                    '&:hover': { backgroundColor: 'primary.light' }
                  }}
                >
                  {isAILoading ? <CircularProgress size={20} /> : <AIIcon />}
                </IconButton>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary">
              {replyText.length}/280
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}; 