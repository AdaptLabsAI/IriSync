'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  TextField,
  Badge,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment
} from '@mui/material';
import Grid from '@/components/ui/grid';
import {
  Add as AddIcon,
  Message as MessageIcon,
  Send as SendIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { tokens } from '@/styles/tokens';

// Define interfaces
interface Message {
  id: string;
  text: string;
  time: string;
  sender: 'user' | 'contact';
  platform?: string;
}

interface Conversation {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar?: string;
  unreadCount: number;
  isActive?: boolean;
  platform: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * Inbox Page (Unified Social Inbox)
 *
 * Hootsuite-inspired unified inbox for managing all social media messages and comments.
 *
 * Features:
 * - Unified inbox from all connected platforms
 * - Message filtering by platform, status, and sentiment
 * - Real-time conversation view
 * - Team collaboration features
 * - Quick response templates
 * - Sentiment analysis indicators
 */
export default function InboxPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch conversations from API
  useEffect(() => {
    const fetchInboxData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/inbox/conversations', {
          next: { revalidate: 60 },
          headers: {
            'Cache-Control': 'max-age=60'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.statusText}`);
        }

        const data = await response.json();

        // Mock data for demonstration
        const mockConversations: Conversation[] = [
          {
            id: '1',
            name: 'Marvin McKinney',
            message: 'Good Afternoon! Tell me how can I help you?',
            time: '2:15 PM',
            avatar: '',
            unreadCount: 0,
            isActive: true,
            platform: 'instagram',
            sentiment: 'positive'
          },
          {
            id: '2',
            name: 'Micky Williams',
            message: 'Hello, Hope you are doing well.',
            time: '1:45 PM',
            avatar: '',
            unreadCount: 0,
            platform: 'facebook',
            sentiment: 'neutral'
          },
          {
            id: '3',
            name: 'Jerome Bell',
            message: 'When will you ship my order?',
            time: '12:30 PM',
            avatar: '',
            unreadCount: 1,
            platform: 'twitter',
            sentiment: 'neutral'
          },
          {
            id: '4',
            name: 'Wade Warren',
            message: 'I have an issue with my recent purchase',
            time: '11:20 AM',
            avatar: '',
            unreadCount: 2,
            platform: 'linkedin',
            sentiment: 'negative'
          },
          {
            id: '5',
            name: 'Brigette Simmons',
            message: 'Thank you for the amazing service!',
            time: 'Yesterday',
            avatar: '',
            unreadCount: 0,
            platform: 'instagram',
            sentiment: 'positive'
          },
        ];

        setConversations(data.conversations || mockConversations);
        if ((data.conversations || mockConversations).length > 0) {
          setSelectedConversation((data.conversations || mockConversations)[0]);
        }
      } catch (err) {
        console.error('Error fetching inbox data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inbox');
      } finally {
        setLoading(false);
      }
    };

    fetchInboxData();
  }, [session?.user?.id]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      // Mock messages for demonstration
      const mockMessages: Message[] = [
        {
          id: '1',
          text: 'Hello, Good Afternoon',
          time: '3:45 PM',
          sender: 'contact',
          platform: selectedConversation.platform
        },
        {
          id: '2',
          text: "Hope you're doing well!",
          time: '3:45 PM',
          sender: 'contact',
          platform: selectedConversation.platform
        },
        {
          id: '3',
          text: 'Good Afternoon! Yes I am good. Thanks for asking. How can I help you?',
          time: '3:55 PM',
          sender: 'user',
          platform: selectedConversation.platform
        }
      ];

      setMessages(mockMessages);
    }
  }, [selectedConversation]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageInput,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      sender: 'user'
    };

    setMessages([...messages, newMessage]);
    setMessageInput('');

    // TODO: Send message to API
  };

  // Platform filter options
  const platformFilters = [
    { value: 'all', label: 'All Platforms', icon: '🌐' },
    { value: 'instagram', label: 'Instagram', icon: '📷' },
    { value: 'facebook', label: 'Facebook', icon: '👥' },
    { value: 'twitter', label: 'Twitter', icon: '🐦' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  ];

  // Calculate stats
  const totalMessages = conversations.length;
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const positiveCount = conversations.filter(c => c.sentiment === 'positive').length;
  const avgResponseTime = '2.5 hrs'; // Mock data

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 600,
                fontSize: tokens.typography.fontSize.h1,
                color: tokens.colors.text.primary
              }}
            >
              Inbox
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: tokens.colors.text.secondary,
                fontSize: tokens.typography.fontSize.body
              }}
            >
              Manage all your social media conversations in one place
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ArchiveIcon />}
              sx={{ textTransform: 'none' }}
            >
              Archived
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: tokens.colors.primary.main,
                '&:hover': { bgcolor: tokens.colors.primary.dark },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: tokens.borderRadius.md,
                boxShadow: tokens.shadows.md,
              }}
            >
              New Message
            </Button>
          </Stack>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Messages
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {totalMessages}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
                    <MessageIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Unread
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {unreadCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}>
                    <Badge badgeContent={unreadCount} color="error">
                      <MessageIcon />
                    </Badge>
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Avg Response Time
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {avgResponseTime}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.light', color: 'info.dark' }}>
                    <ScheduleIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Positive Sentiment
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {positiveCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.light', color: 'success.dark' }}>
                    <TrendingUpIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Platform Filters */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {platformFilters.map((filter) => (
            <Chip
              key={filter.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                </Box>
              }
              onClick={() => setPlatformFilter(filter.value)}
              color={platformFilter === filter.value ? 'primary' : 'default'}
              sx={{
                bgcolor: platformFilter === filter.value ? tokens.colors.primary.main : 'default',
                color: platformFilter === filter.value ? 'white' : 'default',
                '&:hover': {
                  bgcolor: platformFilter === filter.value ? tokens.colors.primary.dark : 'default',
                }
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Main Inbox Layout */}
      <Grid container spacing={2}>
        {/* Conversations List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            {/* Search */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search conversations..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Conversation List */}
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {conversations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Conversations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your messages will appear here
                  </Typography>
                </Box>
              ) : (
                conversations.map((conversation) => (
                  <React.Fragment key={conversation.id}>
                    <ListItem
                      button
                      selected={selectedConversation?.id === conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          badgeContent={conversation.unreadCount}
                          color="error"
                          overlap="circular"
                        >
                          <Avatar
                            src={conversation.avatar}
                            alt={conversation.name}
                            sx={{
                              border: conversation.isActive ? 2 : 0,
                              borderColor: tokens.colors.primary.main
                            }}
                          >
                            {conversation.name.charAt(0)}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" fontWeight={conversation.unreadCount > 0 ? 'bold' : 'regular'}>
                              {conversation.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {conversation.time}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}
                            >
                              {conversation.message}
                            </Typography>
                            <Chip
                              label={conversation.platform}
                              size="small"
                              sx={{ textTransform: 'capitalize', fontSize: '0.65rem', height: '20px' }}
                            />
                          </Stack>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* Chat View */}
        <Grid item xs={12} md={8}>
          <Paper sx={{
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        src={selectedConversation.avatar}
                        alt={selectedConversation.name}
                      >
                        {selectedConversation.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedConversation.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={selectedConversation.platform}
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                          />
                          {selectedConversation.isActive && (
                            <Typography variant="caption" color="success.main">
                              ● Active now
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                    <IconButton>
                      <MoreVertIcon />
                    </IconButton>
                  </Stack>
                </Box>

                {/* Messages Area */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: 'grey.50' }}>
                  {/* Date Separator */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Chip label="Today" size="small" />
                  </Box>

                  {/* Messages */}
                  <Stack spacing={2}>
                    {messages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Box sx={{ maxWidth: '70%' }}>
                          <Paper
                            sx={{
                              p: 2,
                              bgcolor: message.sender === 'user' ? tokens.colors.primary.main : 'white',
                              color: message.sender === 'user' ? 'white' : 'text.primary',
                              borderRadius: 2,
                              borderBottomRightRadius: message.sender === 'user' ? 0 : 2,
                              borderBottomLeftRadius: message.sender === 'contact' ? 0 : 2,
                            }}
                          >
                            <Typography variant="body1">{message.text}</Typography>
                          </Paper>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              textAlign: message.sender === 'user' ? 'right' : 'left'
                            }}
                          >
                            {message.time}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      fullWidth
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      multiline
                      maxRows={3}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small">
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small">
                              <EmojiIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <IconButton
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      sx={{
                        bgcolor: tokens.colors.primary.main,
                        color: 'white',
                        '&:hover': { bgcolor: tokens.colors.primary.dark },
                        '&.Mui-disabled': {
                          bgcolor: 'grey.300',
                          color: 'grey.500'
                        }
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </Stack>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <MessageIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select a conversation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a conversation from the list to start messaging
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Response Templates */}
      <Paper sx={{
        p: 3,
        mt: 3,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
      }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Quick Response Templates
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="Thank you for your message"
            onClick={() => setMessageInput('Thank you for your message! How can I help you today?')}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="We'll get back to you"
            onClick={() => setMessageInput("We've received your message and will get back to you shortly.")}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="Check our FAQ"
            onClick={() => setMessageInput('Please check our FAQ page for more information.')}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="Schedule a call"
            onClick={() => setMessageInput("Would you like to schedule a call to discuss this further?")}
            sx={{ cursor: 'pointer' }}
          />
        </Stack>
      </Paper>
    </Container>
  );
}
