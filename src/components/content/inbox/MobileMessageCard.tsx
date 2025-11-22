import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Slide,
  Fade
} from '@mui/material';
import {
  Reply as ReplyIcon,
  Archive as ArchiveIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { InboxMessage } from '@/lib/features/content/SocialInboxService';

interface MobileMessageCardProps {
  message: InboxMessage;
  isSelected?: boolean;
  onSelect?: (messageId: string, selected: boolean) => void;
  onReply?: (messageId: string) => void;
  onArchive?: (messageId: string) => void;
  onStar?: (messageId: string, starred: boolean) => void;
  onSwipeLeft?: (messageId: string) => void;
  onSwipeRight?: (messageId: string) => void;
}

export const MobileMessageCard: React.FC<MobileMessageCardProps> = ({
  message,
  isSelected = false,
  onSelect,
  onReply,
  onArchive,
  onStar,
  onSwipeLeft,
  onSwipeRight
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  if (!isMobile) {
    return null; // Only render on mobile
  }

  // Touch event handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipeActive) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 120;
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setSwipeOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsSwipeActive(false);
    const threshold = 60;
    
    if (Math.abs(swipeOffset) > threshold) {
      if (swipeOffset > 0) {
        // Swipe right - Reply
        onSwipeRight?.(message.id);
        onReply?.(message.id);
      } else {
        // Swipe left - Archive
        onSwipeLeft?.(message.id);
        onArchive?.(message.id);
      }
    }
    
    // Reset swipe
    setSwipeOffset(0);
  };

  const handleCardClick = () => {
    if (Math.abs(swipeOffset) < 10) { // Only select if not swiping
      onSelect?.(message.id, !isSelected);
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

  const formatTime = (date: Date | string) => {
    const messageDate = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(messageDate, { addSuffix: true });
  };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        mb: 1
      }}
    >
      {/* Swipe Action Backgrounds */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          backgroundColor: swipeOffset > 0 ? theme.palette.success.light : theme.palette.warning.light,
          opacity: Math.abs(swipeOffset) / 120,
          zIndex: 0
        }}
      >
        {swipeOffset > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
            <ReplyIcon sx={{ mr: 1 }} />
            <Typography variant="body2" fontWeight="bold">Reply</Typography>
          </Box>
        )}
        {swipeOffset < 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'white', ml: 'auto' }}>
            <Typography variant="body2" fontWeight="bold">Archive</Typography>
            <ArchiveIcon sx={{ ml: 1 }} />
          </Box>
        )}
      </Box>

      {/* Message Card */}
      <Card
        ref={cardRef}
        sx={{
          position: 'relative',
          zIndex: 1,
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipeActive ? 'none' : 'transform 0.2s ease-out',
          backgroundColor: isSelected ? theme.palette.action.selected : 'inherit',
          border: isSelected ? `2px solid ${theme.palette.primary.main}` : 'none',
          cursor: 'pointer',
          '&:active': {
            backgroundColor: theme.palette.action.hover
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <Avatar
              src={message.sender.profilePicture}
              sx={{ 
                width: 40, 
                height: 40, 
                mr: 2,
                border: `2px solid ${getPlatformColor(message.platformType)}`
              }}
            >
              {message.sender.name.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}
                >
                  {message.sender.name}
                </Typography>
                {message.sender.verified && (
                  <CircleIcon sx={{ fontSize: 12, color: 'primary.main', ml: 0.5 }} />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={message.platformType}
                  size="sm"
                  sx={{
                    backgroundColor: getPlatformColor(message.platformType),
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
                <Chip
                  label={message.type}
                  size="sm"
                  variant="outline"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
                {message.status === 'unread' && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main'
                    }}
                  />
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStar?.(message.id, !(message as any).starred);
                }}
              >
                {(message as any).starred ? (
                  <StarIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                ) : (
                  <StarBorderIcon sx={{ fontSize: 20 }} />
                )}
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Typography
            variant="body2"
            sx={{
              mb: 1,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {message.content}
          </Typography>

          {/* Footer */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {formatTime(message.receivedAt)}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.(message.id);
                }}
              >
                <ReplyIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive?.(message.id);
                }}
              >
                <ArchiveIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}; 