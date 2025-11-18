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
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SentimentSatisfied as PositiveIcon,
  SentimentDissatisfied as NegativeIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`listening-tabpanel-${index}`}
      aria-labelledby={`listening-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Listening Page (Social Listening & Brand Monitoring)
 *
 * Monitor brand mentions, keywords, and competitors across social media platforms.
 *
 * Features:
 * - Keyword tracking
 * - Brand mention monitoring
 * - Sentiment analysis
 * - Trending topics
 * - Competitor tracking
 * - Real-time alerts
 *
 * Note: This is a NEW feature inspired by Hootsuite's social listening.
 * Full implementation requires platform API integrations and backend processing.
 */
export default function ListeningPage() {
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Mock data for demonstration
  const mockKeywords = [
    { id: 1, keyword: 'IriSync', mentions: 145, sentiment: 'positive', trend: 'up' },
    { id: 2, keyword: 'social media management', mentions: 89, sentiment: 'neutral', trend: 'up' },
    { id: 3, keyword: '@IriSync', mentions: 67, sentiment: 'positive', trend: 'down' },
  ];

  const mockMentions = [
    {
      id: 1,
      author: 'Sarah Johnson',
      username: '@sarahj',
      platform: 'twitter',
      content: 'Just started using IriSync for managing our social media. Loving the AI features! 🚀',
      sentiment: 'positive',
      timestamp: '2 hours ago',
      avatar: 'https://i.pravatar.cc/150?img=1'
    },
    {
      id: 2,
      author: 'Mike Chen',
      username: '@mikechen',
      platform: 'linkedin',
      content: 'Has anyone tried IriSync? Looking for recommendations on social media management tools.',
      sentiment: 'neutral',
      timestamp: '5 hours ago',
      avatar: 'https://i.pravatar.cc/150?img=2'
    },
    {
      id: 3,
      author: 'Emma Williams',
      username: '@emmaw',
      platform: 'twitter',
      content: 'The analytics dashboard in IriSync is incredible! Finally have clarity on our performance.',
      sentiment: 'positive',
      timestamp: '1 day ago',
      avatar: 'https://i.pravatar.cc/150?img=3'
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              👂 Social Listening
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor brand mentions, keywords, and conversations across social media
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              bgcolor: '#00C853',
              '&:hover': { bgcolor: '#00A046' },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Add Keyword
          </Button>
        </Stack>

        {/* Feature Coming Soon Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Feature Preview</AlertTitle>
          Social Listening is currently in beta. Full platform integration coming soon!
        </Alert>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Mentions
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h4" fontWeight="bold">
                    301
                  </Typography>
                  <Chip
                    icon={<TrendingUpIcon fontSize="small" />}
                    label="+12%"
                    size="small"
                    color="success"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Positive Sentiment
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  73%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Active Keywords
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  8
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Reach
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  45.2K
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content */}
      <Paper sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="listening tabs">
            <Tab label="Mentions" />
            <Tab label="Keywords" />
            <Tab label="Sentiment" />
            <Tab label="Trending" />
          </Tabs>
        </Box>

        {/* Mentions Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3 }}>
            <TextField
              fullWidth
              placeholder="Search mentions..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <List>
              {mockMentions.map((mention, index) => (
                <React.Fragment key={mention.id}>
                  <ListItem
                    alignItems="flex-start"
                    secondaryAction={
                      <IconButton edge="end" onClick={handleMenuOpen}>
                        <MoreIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={mention.avatar} alt={mention.author} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight="bold">{mention.author}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {mention.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            · {mention.timestamp}
                          </Typography>
                          <Chip
                            label={mention.platform}
                            size="small"
                            sx={{ textTransform: 'uppercase' }}
                          />
                        </Stack>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {mention.content}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {mention.sentiment === 'positive' && (
                              <Chip
                                icon={<PositiveIcon />}
                                label="Positive"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            )}
                            {mention.sentiment === 'neutral' && (
                              <Chip label="Neutral" size="small" variant="outlined" />
                            )}
                          </Box>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < mockMentions.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </TabPanel>

        {/* Keywords Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tracked Keywords
            </Typography>
            <List>
              {mockKeywords.map((keyword) => (
                <ListItem key={keyword.id}>
                  <ListItemText
                    primary={keyword.keyword}
                    secondary={`${keyword.mentions} mentions`}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={
                        keyword.trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />
                      }
                      label={keyword.trend === 'up' ? 'Trending' : 'Declining'}
                      size="small"
                      color={keyword.trend === 'up' ? 'success' : 'warning'}
                    />
                    <IconButton onClick={handleMenuOpen}>
                      <MoreIcon />
                    </IconButton>
                  </Stack>
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>

        {/* Sentiment Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sentiment Analysis
            </Typography>
            <Alert severity="info">
              Sentiment analysis visualization and detailed breakdown coming soon.
            </Alert>
          </Box>
        </TabPanel>

        {/* Trending Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h6" gutterBottom>
              Trending Topics
            </Typography>
            <Alert severity="info">
              Trending topics and hashtag analysis coming soon.
            </Alert>
          </Box>
        </TabPanel>
      </Paper>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleMenuClose}>Reply</MenuItem>
        <MenuItem onClick={handleMenuClose}>Share</MenuItem>
        <MenuItem onClick={handleMenuClose}>Add to Report</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Mark as Read</MenuItem>
      </Menu>
    </Container>
  );
}
