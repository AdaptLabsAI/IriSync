'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Chip, 
  Alert, 
  CircularProgress,
  Paper,
  Stack,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid as MuiGrid,
  LinearProgress
} from '@mui/material';
import { 
  AutoAwesome as AIIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Science as ScienceIcon,
  Replay as RepurposeIcon,
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { PlatformType, SocialAccount } from '../../lib/features/platforms/client';
import { SubscriptionData } from '../../lib/subscription/models/subscription';

// Enhanced interfaces
interface SmartContentCreatorProps {
  accounts: SocialAccount[];
  subscription?: SubscriptionData;
  onSubmit: (contentData: any) => Promise<void>;
  disabled?: boolean;
}

interface SmartSuggestion {
  platforms: PlatformType[];
  tone: string;
  audience: string;
  contentType: string;
  content: string;
  hashtags: string[];
  confidence: number;
  reasoning: string;
  metadata?: {
    modelUsed: string;
    totalTokens: number;
  };
}

interface PerformancePrediction {
  predictedEngagementRate: number;
  predictedLikes: number;
  predictedComments: number;
  predictedShares: number;
  confidenceScore: number;
  performanceCategory: string;
  improvementSuggestions: string[];
  riskFactors: string[];
  bestTimeToPost: string;
  viralPotential: string;
}

interface ABTestVariation {
  id: string;
  content: string;
  testFocus: string;
  description: string;
  expectedImpact: string;
  hashtags: string[];
  keyDifference: string;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

const SmartContentCreator: React.FC<SmartContentCreatorProps> = ({
  accounts,
  subscription,
  onSubmit,
  disabled = false
}) => {
  // Authentication
  const { user, loading: authLoading } = useAuth();

  // Core state
  const [activeTab, setActiveTab] = useState(0);
  const [intent, setIntent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<SmartSuggestion | null>(null);
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformType[]>([
    PlatformType.TWITTER,
    PlatformType.LINKEDIN,
    PlatformType.INSTAGRAM
  ]);

  // New feature states
  const [performancePrediction, setPerformancePrediction] = useState<PerformancePrediction | null>(null);
  const [abTestVariations, setAbTestVariations] = useState<ABTestVariation[]>([]);
  const [repurposedContent, setRepurposedContent] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('twitter');
  const [enablePerformancePrediction, setEnablePerformancePrediction] = useState(true);
  const [enableABTesting, setEnableABTesting] = useState(false);
  const [enableRepurposing, setEnableRepurposing] = useState(false);

  // Get auth token
  const getAuthToken = useCallback(async () => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }, [user]);

  // Generate smart suggestions with enhanced features
  const generateSuggestions = useCallback(async () => {
    if (!intent.trim() || intent.length < 10) {
      setNotification({ type: 'error', message: 'Please describe your content idea (at least 10 characters)' });
      return;
    }

    setIsGenerating(true);
    setNotification(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setNotification({ type: 'error', message: 'Authentication required' });
        return;
      }

      // Step 1: Generate base suggestions
      const response = await fetch('/api/ai/smart-content-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          intent: intent.trim(),
          availablePlatforms: connectedPlatforms,
          userContext: {
            industry: 'general',
            brandVoice: 'professional'
          }
        })
      });

      const data = await response.json();

      if (data.success && data.suggestion) {
        setSuggestion(data.suggestion);
        setContent(data.suggestion.content);
        setHashtags(data.suggestion.hashtags);

        // Step 2: Get performance prediction if enabled
        if (enablePerformancePrediction) {
          await predictPerformance(data.suggestion.content, selectedPlatform, data.suggestion.hashtags, data.suggestion.contentType, data.suggestion.tone, token);
        }

        // Step 3: Generate A/B test variations if enabled
        if (enableABTesting) {
          await generateABTestVariations(data.suggestion.content, selectedPlatform, token);
        }

        // Step 4: Generate repurposed content if enabled
        if (enableRepurposing) {
          await repurposeContent(data.suggestion.content, selectedPlatform, token);
        }

        setNotification({ 
          type: 'success', 
          message: `Smart content package generated with ${data.suggestion.confidence}% confidence!` 
        });
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to generate suggestions' });
      }
    } catch (error) {
      console.error('Content generation error:', error);
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  }, [intent, connectedPlatforms, selectedPlatform, enablePerformancePrediction, enableABTesting, enableRepurposing, getAuthToken]);

  // Predict content performance
  const predictPerformance = useCallback(async (contentText: string, platform: string, hashtagList: string[], contentType: string, tone: string, token: string) => {
    try {
      const response = await fetch('/api/ai/content-performance-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: contentText,
          platform,
          hashtags: hashtagList,
          contentType,
          tone,
          scheduledTime: 'optimal'
        })
      });

      const data = await response.json();
      if (data.success) {
        setPerformancePrediction(data.prediction);
      }
    } catch (error) {
      console.error('Performance prediction error:', error);
    }
  }, []);

  // Generate A/B test variations
  const generateABTestVariations = useCallback(async (contentText: string, platform: string, token: string) => {
    try {
      const response = await fetch('/api/ai/ab-test-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: contentText,
          platform,
          testTypes: ['hook_optimization', 'tone_variation', 'cta_testing'],
          variationCount: 3
        })
      });

      const data = await response.json();
      if (data.success) {
        setAbTestVariations(data.data.variations || []);
      } else if (data.error?.includes('subscription') || data.error?.includes('premium')) {
        setNotification({ 
          type: 'info', 
          message: 'A/B Testing is available for Pro subscribers. Upgrade to test multiple content variations!' 
        });
      }
    } catch (error) {
      console.error('A/B test generation error:', error);
    }
  }, []);

  // Repurpose content
  const repurposeContent = useCallback(async (contentText: string, originalPlatform: string, token: string) => {
    try {
      const response = await fetch('/api/ai/content-repurposing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'repurpose',
          content: contentText,
          originalPlatform,
          targetFormats: ['linkedin', 'twitter', 'instagram', 'facebook'],
          contentTheme: 'general'
        })
      });

      const data = await response.json();
      if (data.success) {
        setRepurposedContent(data.data.repurposedContent || []);
      }
    } catch (error) {
      console.error('Content repurposing error:', error);
    }
  }, []);

  // Create content (enhanced)
  const createContent = useCallback(async () => {
    if (!content.trim()) {
      setNotification({ type: 'error', message: 'Content cannot be empty' });
      return;
    }

    setIsGenerating(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        setNotification({ type: 'error', message: 'Authentication required' });
        return;
      }

      const contentData = {
        content: content.trim(),
        hashtags,
        platforms: suggestion?.platforms || connectedPlatforms,
        tone: suggestion?.tone || 'professional',
        audience: suggestion?.audience || 'general',
        contentType: suggestion?.contentType || 'general',
        confidence: suggestion?.confidence || 100,
        metadata: {
          ...suggestion?.metadata,
          performancePrediction: performancePrediction || null,
          abTestVariations: abTestVariations.length > 0 ? abTestVariations : null,
          repurposedContent: repurposedContent.length > 0 ? repurposedContent : null
        }
      };

      const response = await fetch('/api/content/smart-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contentData })
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ type: 'success', message: 'Enhanced content package created successfully!' });
        
        // Reset form
        setIntent('');
        setContent('');
        setHashtags([]);
        setSuggestion(null);
        setPerformancePrediction(null);
        setAbTestVariations([]);
        setRepurposedContent([]);
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to create content' });
      }
    } catch (error) {
      console.error('Content creation error:', error);
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  }, [content, hashtags, suggestion, connectedPlatforms, performancePrediction, abTestVariations, repurposedContent, getAuthToken]);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Loading state
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            Please sign in to use the Smart Content Creator
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Enhanced Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          <AIIcon sx={{ mr: 1, fontSize: 32, color: '#667eea' }} />
          Smart Content Creator Pro
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered content creation with performance prediction, A/B testing, and repurposing
        </Typography>
      </Box>

      {/* Notification */}
      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }}>
          {notification.message}
        </Alert>
      )}

      {/* Feature Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Features Configuration
          </Typography>
          
          <MuiGrid container spacing={2}>
            <MuiGrid item xs={12} sm={6} md={3} {...({} as any)}>
              <FormControl fullWidth size="small">
                <InputLabel>Primary Platform</InputLabel>
                <Select
                  value={selectedPlatform}
                  onChange={(e: any) => setSelectedPlatform(e.target.value)}
                  label="Primary Platform"
                >
                  <MenuItem value="twitter">Twitter</MenuItem>
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="facebook">Facebook</MenuItem>
                </Select>
              </FormControl>
            </MuiGrid>
            
            <MuiGrid item xs={12} sm={6} md={3} {...({} as any)}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enablePerformancePrediction}
                    onChange={(e: any) => setEnablePerformancePrediction(e.target.checked)}
                  />
                }
                label="Performance Prediction"
              />
            </MuiGrid>
            
            <MuiGrid item xs={12} sm={6} md={3} {...({} as any)}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableABTesting}
                    onChange={(e: any) => setEnableABTesting(e.target.checked)}
                  />
                }
                label="A/B Test Variations"
              />
            </MuiGrid>
            
            <MuiGrid item xs={12} sm={6} md={3} {...({} as any)}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableRepurposing}
                    onChange={(e: any) => setEnableRepurposing(e.target.checked)}
                  />
                }
                label="Content Repurposing"
              />
            </MuiGrid>
          </MuiGrid>
        </CardContent>
      </Card>

      {/* Intent Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            What do you want to share?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={intent}
            onChange={(e: any) => setIntent(e.target.value)}
            placeholder="E.g., I want to announce our new product launch that helps small businesses manage their social media more effectively..."
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={generateSuggestions}
            disabled={isGenerating || intent.trim().length < 10}
            startIcon={isGenerating ? <CircularProgress size={20} /> : <AIIcon />}
            size="large"
            sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
            {isGenerating ? 'Generating AI Package...' : 'Generate Smart Content Package'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      {(suggestion || performancePrediction || abTestVariations.length > 0 || repurposedContent.length > 0) && (
        <Card sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Content & Analysis" />
              {performancePrediction && <Tab label="Performance Prediction" />}
              {abTestVariations.length > 0 && <Tab label="A/B Test Variations" />}
              {repurposedContent.length > 0 && <Tab label="Repurposed Content" />}
            </Tabs>
          </Box>

          {/* Main Content Tab */}
          {activeTab === 0 && (
            <CardContent>
              {/* AI Analysis Results */}
              {suggestion && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    AI Analysis & Suggestions
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={`${suggestion.confidence}% Confidence`} color="primary" size="small" />
                    <Chip label={suggestion.tone} variant="outlined" size="small" />
                    <Chip label={suggestion.audience} variant="outlined" size="small" />
                    <Chip label={suggestion.contentType} variant="outlined" size="small" />
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {suggestion.reasoning}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Platforms:
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    {suggestion.platforms.map((platform) => (
                      <Chip key={platform} label={platform} color="secondary" size="small" />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Content Editor */}
              {content && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Edit Your Content
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={content}
                    onChange={(e: any) => setContent(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Hashtags:
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                    {hashtags.map((tag, index) => (
                      <Chip 
                        key={index} 
                        label={`#${tag}`} 
                        size="small" 
                        onDelete={() => {
                          setHashtags(prev => prev.filter((_, i) => i !== index));
                        }}
                      />
                    ))}
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    {content.length} characters
                  </Typography>

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      onClick={createContent}
                      disabled={isGenerating || !content.trim()}
                      startIcon={isGenerating ? <CircularProgress size={20} /> : <SendIcon />}
                      size="large"
                      sx={{ 
                        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #0f8a80 0%, #32d96a 100%)'
                        }
                      }}
                    >
                      {isGenerating ? 'Creating...' : 'Create Enhanced Content Package'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setContent('');
                        setHashtags([]);
                        setSuggestion(null);
                        setPerformancePrediction(null);
                        setAbTestVariations([]);
                        setRepurposedContent([]);
                      }}
                      startIcon={<RefreshIcon />}
                    >
                      Clear All
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          )}

          {/* Performance Prediction Tab */}
          {activeTab === 1 && performancePrediction && (
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Performance Prediction
              </Typography>
              
              <MuiGrid container spacing={3}>
                <MuiGrid item xs={12} md={6} {...({} as any)}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Predicted Metrics
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Engagement Rate
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={performancePrediction.predictedEngagementRate * 10} 
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="h6" color="primary">
                            {performancePrediction.predictedEngagementRate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Stack direction="row" spacing={2}>
                        <Chip 
                          label={`👍 ${performancePrediction.predictedLikes} likes`} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`💬 ${performancePrediction.predictedComments} comments`} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`🔄 ${performancePrediction.predictedShares} shares`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Stack>
                      
                      <Box>
                        <Chip 
                          label={`${performancePrediction.performanceCategory.replace('_', ' ').toUpperCase()}`}
                          color={
                            performancePrediction.performanceCategory.includes('high') ? 'success' :
                            performancePrediction.performanceCategory.includes('above') ? 'primary' :
                            'warning'
                          }
                        />
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          Viral Potential: {performancePrediction.viralPotential}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </MuiGrid>
                
                <MuiGrid item xs={12} md={6} {...({} as any)}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Optimization Suggestions
                    </Typography>
                    <Stack spacing={1}>
                      {performancePrediction.improvementSuggestions.map((suggestion, index) => (
                        <Typography key={index} variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                          <SpeedIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                          {suggestion}
                        </Typography>
                      ))}
                    </Stack>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" color="primary">
                      <TimelineIcon sx={{ mr: 1, fontSize: 16, verticalAlign: 'middle' }} />
                      Best time to post: {performancePrediction.bestTimeToPost}
                    </Typography>
                  </Paper>
                </MuiGrid>
              </MuiGrid>
            </CardContent>
          )}

          {/* A/B Test Variations Tab */}
          {activeTab === 2 && abTestVariations.length > 0 && (
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                A/B Test Variations
              </Typography>
              
              <Stack spacing={2}>
                {abTestVariations.map((variation, index) => (
                  <Accordion key={variation.id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="subtitle1">
                          Variation {index + 1}: {variation.testFocus.replace('_', ' ')}
                        </Typography>
                        <Chip label={variation.expectedImpact} size="small" color="primary" />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {variation.description}
                      </Typography>
                      
                      <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                        <Typography variant="body1">
                          {variation.content}
                        </Typography>
                      </Paper>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        {variation.hashtags.map((tag, tagIndex) => (
                          <Chip key={tagIndex} label={`#${tag}`} size="small" variant="outlined" />
                        ))}
                      </Stack>
                      
                      <Typography variant="caption" color="text.secondary">
                        Key Difference: {variation.keyDifference}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </CardContent>
          )}

          {/* Repurposed Content Tab */}
          {activeTab === 3 && repurposedContent.length > 0 && (
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <RepurposeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Repurposed Content
              </Typography>
              
              <Stack spacing={2}>
                {repurposedContent.map((item, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                          {item.platform} - {item.format?.replace('_', ' ') || 'Post'}
                        </Typography>
                        <Chip label={item.estimatedReach || 'High reach'} size="small" color="secondary" />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                        <Typography variant="body1">
                          {item.content}
                        </Typography>
                      </Paper>
                      
                      {item.hashtags && (
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                          {item.hashtags.map((tag: string, tagIndex: number) => (
                            <Chip key={tagIndex} label={`#${tag}`} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                      
                      {item.keyAdaptations && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key Adaptations:
                          </Typography>
                          <Stack spacing={1}>
                            {item.keyAdaptations.map((adaptation: string, adaptIndex: number) => (
                              <Typography key={adaptIndex} variant="body2" color="text.secondary">
                                • {adaptation}
                              </Typography>
                            ))}
                          </Stack>
                        </Box>
                      )}
                      
                      {item.optimalPostTime && (
                        <Typography variant="caption" color="primary">
                          <TimelineIcon sx={{ mr: 1, fontSize: 14, verticalAlign: 'middle' }} />
                          Optimal posting time: {item.optimalPostTime}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </CardContent>
          )}
        </Card>
      )}

      {/* Connected Platforms Info */}
      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" gutterBottom>
          Connected Platforms:
        </Typography>
        <Stack direction="row" spacing={1}>
          {connectedPlatforms.map((platform) => (
            <Chip key={platform} label={platform} size="small" variant="outlined" />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

export default SmartContentCreator; 