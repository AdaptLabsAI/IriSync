'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Card,
  CardContent,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  InputAdornment,
  Alert
} from '@mui/material';
import Grid from '@/components/ui/grid';
import {
  Psychology as AIIcon,
  Send as SendIcon,
  Mic as MicIcon,
  AttachFile as AttachFileIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Lightbulb as LightbulbIcon,
  BarChart as BarChartIcon,
  CompareArrows as CompareIcon,
  AutoAwesome as SparkleIcon
} from '@mui/icons-material';
import { tokens } from '@/styles/tokens';

/**
 * AI Toolkit Page
 *
 * AI-powered assistant for social media management with:
 * - Conversational AI interface
 * - Quick prompt suggestions
 * - Best time to post recommendations
 * - Content ideas and analysis
 * - Competitive insights
 * - Performance predictions
 */
export default function AIToolkitPage() {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Quick prompt suggestions
  const quickPrompts = [
    {
      icon: <ScheduleIcon />,
      text: 'What could be the best time to post on Instagram?',
      category: 'Timing'
    },
    {
      icon: <TrendingUpIcon />,
      text: 'Highlight my most trending post across all platforms',
      category: 'Analytics'
    },
    {
      icon: <CompareIcon />,
      text: 'Analyze my competitor on Facebook',
      category: 'Competitive'
    },
    {
      icon: <SparkleIcon />,
      text: 'Predict upcoming post performance',
      category: 'Insights'
    },
    {
      icon: <LightbulbIcon />,
      text: 'Generate content ideas for this week',
      category: 'Content'
    },
    {
      icon: <BarChartIcon />,
      text: 'Summarize my engagement metrics',
      category: 'Analytics'
    }
  ];

  // Best time to post recommendations
  const bestTimePosts = [
    {
      platform: 'Instagram',
      time: '09:00 AM - 12:00 PM',
      icon: '📷',
      color: '#E4405F',
      engagement: '+45%'
    },
    {
      platform: 'Facebook',
      time: '01:00 PM - 04:00 PM',
      icon: '👥',
      color: '#1877F2',
      engagement: '+32%'
    },
    {
      platform: 'Twitter',
      time: '06:00 PM - 09:00 PM',
      icon: '🐦',
      color: '#1DA1F2',
      engagement: '+28%'
    },
    {
      platform: 'LinkedIn',
      time: '07:00 AM - 09:00 AM',
      icon: '💼',
      color: '#0A66C2',
      engagement: '+38%'
    }
  ];

  // AI features showcase
  const aiFeatures = [
    {
      title: 'Content Generation',
      description: 'Create engaging posts with AI-powered copywriting',
      icon: <LightbulbIcon sx={{ fontSize: 40 }} />
    },
    {
      title: 'Performance Prediction',
      description: 'Forecast post engagement before publishing',
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />
    },
    {
      title: 'Competitive Analysis',
      description: 'Compare your metrics with industry leaders',
      icon: <CompareIcon sx={{ fontSize: 40 }} />
    }
  ];

  // Handle sending message
  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage;
    if (!messageToSend.trim()) return;

    // Add user message
    setMessages([...messages, { role: 'user', content: messageToSend }]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I understand you're interested in "${messageToSend}". Based on your analytics, I can help you with that. Let me analyze your data...`
        }
      ]);
      setIsLoading(false);
    }, 1500);
  };

  // Handle quick prompt click
  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: tokens.colors.primary.main,
                  width: 48,
                  height: 48
                }}
              >
                <AIIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 600,
                    fontSize: tokens.typography.fontSize.h1,
                    color: tokens.colors.text.primary
                  }}
                >
                  AI Toolkit
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.colors.text.secondary,
                    fontSize: tokens.typography.fontSize.body
                  }}
                >
                  Your intelligent social media assistant
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>

        <Alert severity="info" icon={<SparkleIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Pro Tip:</strong> Ask me anything about your social media performance, content ideas, or best practices!
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - AI Chat Interface */}
        <Grid item xs={12} lg={8}>
          {/* Chat Interface */}
          <Paper sx={{
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            mb: 3,
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            {/* Chat Header */}
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'white' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
                  <AIIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    IriSync AI Assistant
                  </Typography>
                  <Typography variant="caption">
                    Powered by advanced analytics
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Messages Area */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: 'grey.50' }}>
              {messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: tokens.colors.primary.main,
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <AIIcon sx={{ fontSize: 48 }} />
                  </Avatar>
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Hello! 👋
                  </Typography>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    How may <span style={{ color: tokens.colors.primary.main }}>I assist you today?</span>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Try asking about your analytics, content ideas, or best posting times
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {messages.map((message, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '75%',
                          bgcolor: message.role === 'user' ? tokens.colors.primary.main : 'white',
                          color: message.role === 'user' ? 'white' : 'text.primary',
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                      </Paper>
                    </Box>
                  ))}
                  {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Paper sx={{ p: 2, bgcolor: 'white' }}>
                        <Typography variant="body2" color="text.secondary">
                          Analyzing...
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </Stack>
              )}
            </Box>

            {/* Message Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  placeholder="Ask IriSync AI anything..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
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
                          <MicIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <IconButton
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
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
          </Paper>

          {/* Quick Prompts */}
          <Paper sx={{
            p: 3,
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Quick Prompts
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
              {quickPrompts.map((prompt, index) => (
                <Chip
                  key={index}
                  icon={prompt.icon}
                  label={prompt.text}
                  onClick={() => handleQuickPrompt(prompt.text)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: tokens.colors.primary.main,
                      color: 'white',
                      '& .MuiChip-icon': {
                        color: 'white'
                      }
                    }
                  }}
                />
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column - Insights & Recommendations */}
        <Grid item xs={12} lg={4}>
          {/* Best Time to Post */}
          <Paper sx={{
            p: 3,
            mb: 3,
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScheduleIcon color="primary" />
                <span>Best Time to Post</span>
              </Stack>
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              {bestTimePosts.map((item, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{ bgcolor: item.color, width: 40, height: 40 }}>
                          <Typography fontSize="20px">{item.icon}</Typography>
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {item.platform}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {item.time}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <Chip
                        label={item.engagement}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>

          {/* AI Features */}
          <Paper sx={{
            p: 3,
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              AI-Powered Features
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              {aiFeatures.map((feature, index) => (
                <Box key={index}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                        width: 56,
                        height: 56
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="bold" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Box>
                  </Stack>
                  {index < aiFeatures.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
