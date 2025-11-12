import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { InboxMessage, MessageStatus as InboxMessageStatus, MessagePriority as InboxMessagePriority } from '@/lib/features/content/SocialInboxService';
import MessageCard, { MessagePriority as MessageCardPriority } from './MessageCard';

export interface MessageListProps {
  messages: InboxMessage[];
  selectedMessages: string[];
  onSelectMessage: (messageId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onMessageClick: (message: InboxMessage) => void;
  loading?: boolean;
  height?: number;
  itemHeight?: number;
}

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: InboxMessage[];
    selectedMessages: string[];
    onSelectMessage: (messageId: string, selected: boolean) => void;
    onMessageClick: (message: InboxMessage) => void;
  };
}

// Helper function to get platform colors
function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    facebook: '#1877F2',
    instagram: '#E4405F',
    twitter: '#1DA1F2',
    linkedin: '#0A66C2',
    youtube: '#FF0000',
    tiktok: '#000000',
    pinterest: '#BD081C'
  };
  return colors[platform] || '#666666';
}

// Helper function to map InboxMessageStatus to MessageCard status
function mapMessageStatus(status: InboxMessageStatus): InboxMessageStatus {
  // MessageCard expects the same MessageStatus enum, so just return it directly
  return status;
}

// Helper function to map priority enum to string literal
function mapPriority(priority: InboxMessagePriority): MessageCardPriority | undefined {
  switch (priority) {
    case InboxMessagePriority.LOW:
      return 'low';
    case InboxMessagePriority.MEDIUM:
      return 'normal';
    case InboxMessagePriority.HIGH:
      return 'high';
    case InboxMessagePriority.URGENT:
      return 'urgent';
    default:
      return undefined;
  }
}

const MessageItem: React.FC<MessageItemProps> = ({ index, style, data }) => {
  const { messages, selectedMessages, onSelectMessage, onMessageClick } = data;
  const message = messages[index];

  if (!message) return null;

  // Convert InboxMessage to MessageCard format
  const messageCardData = {
    ...message,
    platformName: message.platformType,
    platformIcon: message.platformType,
    platformColor: getPlatformColor(message.platformType),
    createdAt: message.receivedAt || message.sentAt,
    author: message.sender,
    // Use the MessageStatus enum directly
    status: message.status,
    // Map assignedTo from string to object format
    assignedTo: message.assignedTo ? {
      id: message.assignedTo,
      name: message.assignedTo, // Use ID as name for now
      avatarUrl: undefined
    } : undefined,
    // Map priority enum to string literal
    priority: mapPriority(message.priority),
    // Map attachments to MessageCard format
    attachments: message.attachments?.map((att, index) => ({
      id: `${message.id}_${index}`,
      name: att.url?.split('/').pop() || 'attachment',
      type: att.type as 'image' | 'video' | 'document' | 'link',
      url: att.url || '',
      thumbnailUrl: att.thumbnailUrl,
      size: undefined
    }))
  };

  return (
    <div style={style}>
      <Box sx={{ px: 1, py: 0.5 }}>
        <MessageCard
          message={messageCardData}
          isSelected={selectedMessages.includes(message.id)}
          onSelect={(messageId, selected) => onSelectMessage(messageId, selected)}
        />
      </Box>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  selectedMessages,
  onSelectMessage,
  onSelectAll,
  onMessageClick,
  loading = false,
  height = 600,
  itemHeight = 120
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const listData = useMemo(() => ({
    messages,
    selectedMessages,
    onSelectMessage,
    onMessageClick
  }), [messages, selectedMessages, onSelectMessage, onMessageClick]);

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading messages...</Typography>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No messages found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your inbox is empty or no messages match the current filters.
        </Typography>
      </Box>
    );
  }

  // Use virtualization for large lists on desktop
  if (!isMobile && messages.length > 50) {
    return (
      <Box sx={{ height, width: '100%' }}>
        <List
          height={height}
          width="100%"
          itemCount={messages.length}
          itemSize={itemHeight}
          itemData={listData}
          overscanCount={5}
        >
          {MessageItem}
        </List>
      </Box>
    );
  }

  // Simple list for mobile or small lists
  return (
    <Box sx={{ maxHeight: height, overflow: 'auto' }}>
      {messages.map((message) => {
        // Convert InboxMessage to MessageCard format
        const messageCardData = {
          ...message,
          platformName: message.platformType,
          platformIcon: message.platformType,
          platformColor: getPlatformColor(message.platformType),
          createdAt: message.receivedAt || message.sentAt,
          author: message.sender,
          // Use the MessageStatus enum directly
          status: message.status,
          // Map assignedTo from string to object format
          assignedTo: message.assignedTo ? {
            id: message.assignedTo,
            name: message.assignedTo, // Use ID as name for now
            avatarUrl: undefined
          } : undefined,
          // Map priority enum to string literal
          priority: mapPriority(message.priority),
          // Map attachments to MessageCard format
          attachments: message.attachments?.map((att, index) => ({
            id: `${message.id}_${index}`,
            name: att.url?.split('/').pop() || 'attachment',
            type: att.type as 'image' | 'video' | 'document' | 'link',
            url: att.url || '',
            thumbnailUrl: att.thumbnailUrl,
            size: undefined
          }))
        };

        return (
          <Box key={message.id} sx={{ px: 1, py: 0.5 }}>
            <MessageCard
              message={messageCardData}
              isSelected={selectedMessages.includes(message.id)}
              onSelect={(messageId, selected) => onSelectMessage(messageId, selected)}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default MessageList; 