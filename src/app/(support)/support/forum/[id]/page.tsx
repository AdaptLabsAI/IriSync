'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button,
  TextField,
  Avatar,
  Divider,
  Chip,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  useTheme,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ForumIcon from '@mui/icons-material/Forum';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import SendIcon from '@mui/icons-material/Send';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

// Define forum categories
const FORUM_CATEGORIES = [
  { id: 'general', name: 'General', icon: <ForumIcon />, color: '#00C957' },
  { id: 'help', name: 'Help & Support', icon: <QuestionAnswerIcon />, color: '#6A35D4' },
  { id: 'announcements', name: 'Announcements', icon: <NewReleasesIcon />, color: '#FFA500' },
  { id: 'tips', name: 'Tips & Tricks', icon: <TipsAndUpdatesIcon />, color: '#1E90FF' }
];

// Sample discussions data (simulating database)
const DISCUSSIONS = {
  'disc-1': {
    id: 'disc-1',
    title: 'Best practices for scheduling Instagram posts',
    content: 'I\'ve been trying different scheduling strategies for Instagram and wanted to share what\'s been working best for my business. I\'ve found that posting at 8am, 12pm, and 7pm has given me the best engagement rates. What times work best for you all?',
    category: 'tips',
    author: 'Sarah J.',
    authorAvatar: '/images/avatars/sarah.jpg',
    created: '2025-05-07T10:23:00Z',
    replies: 24,
    views: 328,
    lastActive: '2 hours ago',
    solved: true,
    comments: [
      {
        id: 'comment-1',
        author: 'David R.',
        authorAvatar: '/images/avatars/david.jpg',
        content: 'Great insights! I\'ve found similar success with early morning and evening posts. Have you tried posting on weekends?',
        created: '2025-05-07T11:30:00Z',
        likes: 5,
        isAnswer: false
      },
      {
        id: 'comment-2',
        author: 'Melissa T.',
        authorAvatar: '/images/avatars/melissa.jpg',
        content: 'Thanks for sharing! For my fashion brand, I\'ve noticed Sundays at 9pm work surprisingly well. I think it has to do with people planning their outfits for the week.',
        created: '2025-05-07T12:45:00Z',
        likes: 8,
        isAnswer: false
      },
      {
        id: 'comment-3',
        author: 'Sarah J.',
        authorAvatar: '/images/avatars/sarah.jpg',
        content: 'Great point about weekends! I\'ve been testing Saturday mornings with good results. Melissa\'s idea about Sunday evenings is interesting - will give that a try too.',
        created: '2025-05-07T14:15:00Z',
        likes: 3,
        isAnswer: false
      },
      {
        id: 'comment-4',
        author: 'James K.',
        authorAvatar: '/images/avatars/james.jpg',
        content: 'I\'ve found that using IriSync\'s analytics to determine when your specific audience is most active makes a huge difference. In my case, it was completely different from the "standard" best times - 10pm on weeknights works best for my tech audience.',
        created: '2025-05-08T09:20:00Z',
        likes: 15,
        isAnswer: true
      }
    ]
  },
  'disc-2': {
    id: 'disc-2',
    title: 'How to train the AI to match your brand voice?',
    content: 'I love the AI content generator, but I\'m struggling to get it to really capture my brand\'s unique voice. I\'ve tried uploading some examples of our content, but the results still feel generic. Any tips or tricks for training it better?',
    category: 'help',
    author: 'Michael T.',
    authorAvatar: '/images/avatars/michael.jpg',
    created: '2025-05-08T08:45:00Z',
    replies: 18,
    views: 245,
    lastActive: '4 hours ago',
    solved: false,
    comments: [
      {
        id: 'comment-5',
        author: 'Alex W.',
        authorAvatar: '/images/avatars/alex.jpg',
        content: 'I found that providing the AI with a detailed brand persona helped immensely. Describe your brand as if it were a person - age, personality traits, education level, communication style, etc.',
        created: '2025-05-08T09:30:00Z',
        likes: 12,
        isAnswer: false
      },
      {
        id: 'comment-6',
        author: 'Taylor P.',
        authorAvatar: '/images/avatars/taylor.jpg',
        content: 'Try using the "fine-tuning" feature under AI settings. You can upload 10-15 examples of your best content, tag specific elements of your brand voice, and the AI will learn from that.',
        created: '2025-05-08T10:15:00Z',
        likes: 7,
        isAnswer: false
      }
    ]
  }
};

export default function DiscussionPage({ params }: { params: { id: string } }) {
  const theme = useTheme();
  const { data: session } = useSession();
  const [discussion, setDiscussion] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  useEffect(() => {
    // Simulate API fetch
    const fetchDiscussion = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real application, this would be an API call
        // await fetch(`/api/forum/discussions/${params.id}`)
        
        // For now, use our mock data
        setTimeout(() => {
          const discussionData = DISCUSSIONS[params.id as keyof typeof DISCUSSIONS];
          
          if (!discussionData) {
            setError('Discussion not found');
          } else {
            setDiscussion(discussionData);
          }
          
          setIsLoading(false);
        }, 500); // Simulate network delay
      } catch (error) {
        console.error(`Error fetching discussion ${params.id}:`, error);
        setError('Failed to load discussion');
        setIsLoading(false);
      }
    };
    
    fetchDiscussion();
  }, [params.id]);
  
  // Get category color
  const getCategoryColor = (categoryId: string) => {
    const category = FORUM_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.color : theme.palette.primary.main;
  };
  
  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = FORUM_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle comment submission
  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    
    // In a real application, this would be an API call to save the comment
    // For now, just log it
    console.log('Submitting comment:', commentText);
    
    // Simulate successful comment
    const newComment = {
      id: `comment-${Date.now()}`,
      author: session?.user?.name || 'Anonymous User',
      authorAvatar: '/images/avatars/default.jpg',
      content: commentText,
      created: new Date().toISOString(),
      likes: 0,
      isAnswer: false
    };
    
    // Update discussion with new comment
    setDiscussion((prev: any) => ({
      ...prev,
      comments: [...prev.comments, newComment],
      replies: prev.replies + 1
    }));
    
    // Clear comment text
    setCommentText('');
  };
  
  // Handle marking as solution
  const handleMarkAsSolution = (commentId: string) => {
    setDiscussion((prev: any) => {
      const updatedComments = prev.comments.map((comment: any) => ({
        ...comment,
        isAnswer: comment.id === commentId
      }));
      
      return {
        ...prev,
        solved: true,
        comments: updatedComments
      };
    });
  };
  
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">
            Loading discussion...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  if (error || !discussion) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error || 'Discussion not found. It may have been removed or is no longer available.'}
        </Alert>
        <Button 
          component={Link} 
          href="/support/forum" 
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Back to Forum
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/support" color="inherit">
            Support
          </MuiLink>
          <MuiLink component={Link} href="/support/forum" color="inherit">
            Forum
          </MuiLink>
          <MuiLink 
            component={Link} 
            href={`/support/forum/category/${discussion.category}`} 
            color="inherit"
          >
            {getCategoryName(discussion.category)}
          </MuiLink>
          <Typography color="text.primary">
            {/* Truncate title if too long */}
            {discussion.title.length > 40 
              ? `${discussion.title.substring(0, 40)}...` 
              : discussion.title}
          </Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Discussion Header */}
      <Paper elevation={0} sx={{ mb: 4, p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
              <Chip 
                label={getCategoryName(discussion.category)} 
                size="small"
                sx={{ 
                  bgcolor: `${getCategoryColor(discussion.category)}20`,
                  color: getCategoryColor(discussion.category)
                }}
              />
              {discussion.solved && (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                  label="Solved"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {discussion.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Avatar
                alt={discussion.author}
                src={discussion.authorAvatar}
                sx={{ width: 40, height: 40 }}
              >
                {discussion.author.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">
                  {discussion.author}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Posted {formatDate(discussion.created)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Button 
            component={Link} 
            href="/support/forum" 
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size="small"
          >
            Back to Forum
          </Button>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
          {discussion.content}
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mt: 3
        }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Replies: <b>{discussion.replies}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Views: <b>{discussion.views}</b>
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Comments Section */}
      <Typography variant="h5" gutterBottom>
        Replies
      </Typography>
      {discussion.comments.length > 0 ? (
        <Box sx={{ mb: 4 }}>
          {discussion.comments.map((comment: any, index: number) => (
            <Paper 
              key={comment.id} 
              elevation={0} 
              sx={{ 
                p: 3, 
                mb: 2, 
                border: '1px solid', 
                borderColor: comment.isAnswer ? 'success.main' : 'divider',
                borderLeft: comment.isAnswer ? '4px solid' : '1px solid',
                borderLeftColor: comment.isAnswer ? 'success.main' : 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    alt={comment.author}
                    src={comment.authorAvatar}
                    sx={{ width: 40, height: 40 }}
                  >
                    {comment.author.charAt(0)}
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {comment.author}
                      </Typography>
                      {comment.isAnswer && (
                        <Chip
                          label="Solution"
                          size="small"
                          color="success"
                          icon={<CheckCircleIcon />}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(comment.created)}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
                {comment.content}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 2 }}>
                <Button 
                  size="small" 
                  startIcon={<ThumbUpIcon />}
                  variant="text"
                >
                  Like ({comment.likes})
                </Button>
                
                {/* Show mark as solution button for question author */}
                {!discussion.solved && 
                  session?.user?.name === discussion.author &&
                  comment.author !== discussion.author && (
                  <Button 
                    size="small" 
                    startIcon={<CheckCircleIcon />}
                    variant="text"
                    color="success"
                    onClick={() => handleMarkAsSolution(comment.id)}
                  >
                    Mark as Solution
                  </Button>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4, mb: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No replies yet. Be the first to respond!
          </Typography>
        </Box>
      )}
      
      {/* Comment Form */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Add Your Reply
        </Typography>
        {session?.user ? (
          <>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Type your reply here..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                Post Reply
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              You need to be logged in to reply to discussions.
            </Typography>
            <Button 
              variant="contained" 
              component={Link} 
              href="/auth/login?callbackUrl=/support/forum"
            >
              Log In to Reply
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
} 