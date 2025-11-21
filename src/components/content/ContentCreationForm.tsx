'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Switch,
  Stack,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  FormControlLabel,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { SocialAccount, PlatformType, AttachmentType } from '../../lib/features/platforms/client';
import { SubscriptionData } from '../../lib/subscription/models/subscription';
import Image from 'next/image';
import { BsImage, BsTrash, BsCalendar, BsLink, BsLightning } from 'react-icons/bs';

// Type definitions
type Attachment = {
  type: AttachmentType;
  url: string;
  file?: File;
  altText?: string;
  title?: string;
};

type ContentCreationFormProps = {
  initialAccounts?: SocialAccount[];
  subscription?: SubscriptionData;
  onSubmit?: (contentData: any) => Promise<void>;
  disabled?: boolean;
};

export default function ContentCreationForm({ 
  initialAccounts,
  subscription,
  onSubmit,
  disabled
}: ContentCreationFormProps) {
  const [accounts] = useState<SocialAccount[]>(initialAccounts || []);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isLinkCardOpen, setIsLinkCardOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    setSelectedAccounts(prevSelected => {
      if (prevSelected.includes(accountId)) {
        return prevSelected.filter(id => id !== accountId);
      } else {
        return [...prevSelected, accountId];
      }
    });
  };

  // Handle image/media upload
  const handleAddMedia = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file change from file input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if we're below the limit (most platforms support up to 4 attachments)
    if (attachments.length + files.length > 4) {
      // Would use notification system in real implementation
      alert('You can only add up to 4 media items');
      return;
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = file.type.startsWith('image/')
        ? AttachmentType.IMAGE
        : file.type.startsWith('video/')
        ? AttachmentType.VIDEO
        : AttachmentType.DOCUMENT;

      // Generate a temporary URL for preview
      const url = URL.createObjectURL(file);

      // Add to attachments
      setAttachments(prev => [
        ...prev,
        {
          type: fileType,
          url,
          file,
          altText: '',
          title: file.name
        }
      ]);
    }

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  // Remove an attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      
      // Revoke the object URL to prevent memory leaks
      if (newAttachments[index].url.startsWith('blob:')) {
        URL.revokeObjectURL(newAttachments[index].url);
      }
      
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  // Handle post creation
  const handleCreatePost = async () => {
    if (selectedAccounts.length === 0) {
      alert('Please select at least one platform to post to');
      return;
    }

    if (!content.trim() && attachments.length === 0) {
      alert('Please add some text or media to your post');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the content data
      const contentData = {
        content,
        platform: selectedAccounts.length > 0 ? accounts.find(a => a.id === selectedAccounts[0])?.platformId : 'unknown',
        isScheduled,
        scheduledFor: isScheduled ? new Date(scheduledTime) : undefined,
        attachments,
        hashtags
      };
      
      // If onSubmit prop is provided, call it
      if (onSubmit) {
        await onSubmit(contentData);
      } else {
        // Otherwise use the default behavior
        // In a real implementation, this would call an API endpoint
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate success
        router.push('/dashboard/content/calendar');
      }
      
    } catch (error) {
      console.error('Error creating post:', error);
      setIsSubmitting(false);
      alert('Failed to create post. Please try again.');
    }
  };

  // Handle schedule toggle
  const handleScheduleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsScheduled(e.target.checked);
  };

  // Handle AI content generation
  const handleGenerateContent = async () => {
    setIsAiGenerating(true);
    
    try {
      // Call the updated AI content generation API
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Generate social media content about: ${content || 'general business update'}`,
          contentType: 'social-media',
          platform: selectedAccounts.length > 0 ? 'multi-platform' : 'general',
          tone: 'professional',
          targetAudience: 'general',
          keywords: hashtags.split(' ').filter((tag: string) => tag.trim()),
          maxLength: 280
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const data = await response.json();
      
      if (data.success && data.content) {
        // Extract content and hashtags from AI response
        const aiContent = data.content;
        
        // Split content and hashtags if they're combined
        const parts = aiContent.split('\n\n');
        let mainContent = aiContent;
        let extractedHashtags: string[] = [];
        
        // Check if the last part contains hashtags
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1];
          if (lastPart.includes('#')) {
            // Extract hashtags from the last part
            const hashtagMatches = lastPart.match(/#\w+/g) || [];
            extractedHashtags = hashtagMatches.map((tag: string) => tag.replace('#', ''));
            
            // Remove the hashtag part from main content
            mainContent = parts.slice(0, -1).join('\n\n').trim();
          }
        }
        
        // If no hashtags were found in separated content, extract from main content
        if (extractedHashtags.length === 0) {
          const hashtagRegex = /#\w+/g;
          const hashtagMatches = mainContent.match(hashtagRegex) || [];
          extractedHashtags = hashtagMatches.map((tag: string) => tag.replace('#', ''));
          
          // Remove hashtags from main content
          mainContent = mainContent.replace(hashtagRegex, '').trim();
        }
        
        // Use branding information if available
        if (data.metadata?.branding) {
          const brandingInfo = data.metadata.branding;
          
          if (brandingInfo.hashtags && brandingInfo.hashtags.length > 0) {
            extractedHashtags = brandingInfo.hashtags;
          }
          
          // Log branding information for user awareness
          if (brandingInfo.brandingAdded) {
            console.log('✨ IriSync branding automatically added to your content!');
          }
        }
        
        // Set the generated content
        setContent(mainContent);
        
        // Set hashtags (without # symbols for the hashtags field)
        if (extractedHashtags.length > 0) {
          setHashtags(extractedHashtags.join(' '));
        }
        
        // Show success message with branding info
        const brandingMessage = data.metadata?.branding?.brandingAdded 
          ? ' #IriSync hashtag has been automatically added for branding.'
          : '';
        
        // You could show a toast notification here
        console.log(`Content generated successfully!${brandingMessage}`);
        
      } else {
        throw new Error('No content generated');
      }
      
    } catch (error) {
      console.error('Error generating content:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('token')) {
          alert('Insufficient tokens. Please purchase more tokens or upgrade your subscription.');
        } else if (error.message.includes('subscription')) {
          alert('A paid subscription is required to use AI features. Please upgrade your account.');
        } else {
          alert(`Failed to generate content: ${error.message}`);
        }
      } else {
        alert('Failed to generate content. Please try again.');
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Handle adding a link
  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    
    setAttachments(prev => [
      ...prev,
      {
        type: AttachmentType.LINK,
        url: linkUrl,
        title: 'Link preview'
      }
    ]);
    
    setLinkUrl('');
    setIsLinkCardOpen(false);
  };
  
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 4 }}>
        {/* Platform Selection */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Select Platforms</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {accounts.map(account => (
              <Box key={account.id} sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '200px' }}>
                <Box
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: selectedAccounts.includes(account.id)
                      ? 'primary.main'
                      : 'grey.300',
                    borderRadius: 1,
                    backgroundColor: selectedAccounts.includes(account.id)
                      ? 'primary.50'
                      : 'background.paper',
                    cursor: account.isConnected ? 'pointer' : 'not-allowed',
                    opacity: account.isConnected ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    ':hover': account.isConnected
                      ? {
                          borderColor: 'primary.main',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }
                      : {},
                  }}
                  onClick={() => {
                    if (account.isConnected) {
                      handleAccountSelect(account.id);
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      mr: 2,
                      position: 'relative',
                    }}
                  >
                    {/* In a real implementation, use proper image component */}
                    <Box
                      component="div"
                      sx={{
                        width: '100%',
                        height: '100%',
                        bgcolor: 
                          account.platformType === PlatformType.INSTAGRAM
                            ? '#E1306C'
                            : account.platformType === PlatformType.TWITTER
                            ? '#1DA1F2'
                            : account.platformType === PlatformType.LINKEDIN
                            ? '#0077B5'
                            : account.platformType === PlatformType.FACEBOOK
                            ? '#4267B2'
                            : 'grey.500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem',
                      }}
                    >
                      {account.platformType.substring(0, 2).toUpperCase()}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" noWrap>
                      {account.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {account.username}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Content Editor */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Content</Typography>
          <TextField
            multiline
            rows={6}
            fullWidth
            placeholder="What would you like to share?"
            value={content}
            onChange={handleContentChange}
          />
        </Box>
        
        {/* Hashtags */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Hashtags</Typography>
          <TextField
            fullWidth
            placeholder="Add hashtags separated by spaces (e.g. Marketing Social AI)"
            value={hashtags}
            onChange={(e: any) => setHashtags(e.target.value)}
          />
        </Box>
        
        {/* Media Attachments */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Media</Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button 
              startIcon={<BsImage />} 
              variant="outlined" 
              onClick={handleAddMedia}
            >
              Add Media
            </Button>
            
            <Button 
              startIcon={<BsLink />} 
              variant="outlined" 
              onClick={() => setIsLinkCardOpen(!isLinkCardOpen)}
            >
              Add Link
            </Button>
          </Box>
          
          {/* Link input card */}
          {isLinkCardOpen && (
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Add Link</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e: any) => setLinkUrl(e.target.value)}
                  size="sm"
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddLink}
                  disabled={!linkUrl.trim()}
                >
                  Add
                </Button>
              </Box>
            </Box>
          )}
          
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              {attachments.map((attachment, index) => (
                <Box key={index} sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '200px' }}>
                  <Box
                    sx={{
                      position: 'relative',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    {attachment.type === AttachmentType.IMAGE ? (
                      <Box
                        sx={{
                          height: 200,
                          width: '100%',
                          backgroundColor: 'grey.100',
                          backgroundImage: `url(${attachment.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    ) : attachment.type === AttachmentType.LINK ? (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle2">Link Preview</Typography>
                        <Typography variant="body2" sx={{ 
                          wordBreak: 'break-all', 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {attachment.url}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {attachment.type === AttachmentType.VIDEO ? 'Video' : 'Document'}
                        </Typography>
                        <Typography variant="body2" noWrap>
                          {attachment.title}
                        </Typography>
                      </Box>
                    )}
                    <IconButton
                      size="sm"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.7)',
                        },
                      }}
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <BsTrash size={14} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Box>
        
        {/* Scheduling */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Schedule Post</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isScheduled}
                  onChange={handleScheduleToggle}
                />
              }
              label=""
              sx={{ ml: 1 }}
            />
          </Box>
          
          {isScheduled && (
            <TextField
              type="datetime-local"
              fullWidth
              value={scheduledTime}
              onChange={(e: any) => setScheduledTime(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ maxWidth: 400 }}
            />
          )}
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button 
            variant="outlined" 
            color="primary"
            sx={{ mr: 2 }}
            onClick={() => router.push('/dashboard/content/calendar')}
          >
            Cancel
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            disabled={isSubmitting || (selectedAccounts.length === 0)}
            onClick={handleCreatePost}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting 
              ? 'Creating...' 
              : isScheduled 
              ? 'Schedule Post' 
              : 'Create Post'}
          </Button>
        </Box>
      </Paper>
      
      {/* AI Assistant Card */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Content Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Let our AI suggest content based on your brand voice and goals. You have {subscription?.tier || 'unlimited'} AI credits remaining.
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={isAiGenerating ? <CircularProgress size={20} color="inherit" /> : <BsLightning />}
              onClick={handleGenerateContent}
              disabled={isAiGenerating}
            >
              {isAiGenerating ? 'Generating...' : 'Generate Engaging Content'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 