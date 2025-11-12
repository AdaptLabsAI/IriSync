'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box,
  Paper, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Card,
  CardContent,
  Chip,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Platform options for content generation
interface Platform {
  id: string;
  name: string;
}

interface ContentType {
  id: string;
  name: string;
}

interface Tone {
  id: string;
  name: string;
}

interface Audience {
  id: string;
  name: string;
}

interface GeneratedContent {
  id: string;
  platform: string;
  type: string;
  content: string;
  hashtags: string[];
}

// Default options in case API calls fail
const DEFAULT_PLATFORMS: Platform[] = [
  { id: 'facebook', name: 'Facebook' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'twitter', name: 'Twitter' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'tiktok', name: 'TikTok' }
];

const DEFAULT_CONTENT_TYPES: ContentType[] = [
  { id: 'post', name: 'Regular Post' },
  { id: 'announcement', name: 'Announcement' },
  { id: 'promotion', name: 'Promotion' },
  { id: 'article', name: 'Article' },
  { id: 'story', name: 'Story' }
];

const DEFAULT_TONES: Tone[] = [
  { id: 'professional', name: 'Professional' },
  { id: 'casual', name: 'Casual' },
  { id: 'humorous', name: 'Humorous' },
  { id: 'inspirational', name: 'Inspirational' },
  { id: 'educational', name: 'Educational' }
];

const DEFAULT_AUDIENCES: Audience[] = [
  { id: 'general', name: 'General Audience' },
  { id: 'professionals', name: 'Professionals' },
  { id: 'young-adults', name: 'Young Adults (18-25)' },
  { id: 'parents', name: 'Parents' },
  { id: 'tech-savvy', name: 'Tech-Savvy Users' }
];

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('');
  const [tone, setTone] = useState('');
  const [audience, setAudience] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Dynamic options loaded from API
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS);
  const [contentTypes, setContentTypes] = useState<ContentType[]>(DEFAULT_CONTENT_TYPES);
  const [tones, setTones] = useState<Tone[]>(DEFAULT_TONES);
  const [audiences, setAudiences] = useState<Audience[]>(DEFAULT_AUDIENCES);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load options from API
  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch platforms
        const platformsResponse = await axios.get('/api/ai/platforms');
        setPlatforms(platformsResponse.data.platforms);
        
        // Fetch content types
        const contentTypesResponse = await axios.get('/api/ai/content-types');
        setContentTypes(contentTypesResponse.data.contentTypes);
        
        // Fetch tones
        const tonesResponse = await axios.get('/api/ai/tones');
        setTones(tonesResponse.data.tones);
        
        // Fetch audience segments
        const audiencesResponse = await axios.get('/api/ai/audiences');
        setAudiences(audiencesResponse.data.audiences);
      } catch (err) {
        console.error('Failed to load content generation options:', err);
        setError('Error loading content options. API: /api/ai/platforms, /api/ai/content-types, /api/ai/tones, or /api/ai/audiences');
        
        // Default options already set in state initialization
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOptions();
  }, []);
  
  const handleGenerate = async () => {
    if (!topic) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Real API call to generate content
      const response = await axios.post('/api/ai/generate-content', {
        topic,
        platform,
        contentType,
        tone,
        audience,
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k)
      });
      
      setGeneratedContent(response.data.content);
    } catch (err) {
      console.error('Error generating content:', err);
      setError('Error generating content. API: /api/ai/generate-content');
      setGeneratedContent([]);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClear = () => {
    setTopic('');
    setPlatform('');
    setContentType('');
    setTone('');
    setAudience('');
    setKeywords('');
    setGeneratedContent([]);
    setError(null);
  };
  
  const handleBackToToolkit = () => {
    router.push('/dashboard/ai');
  };
  
  const handleUseContent = async (content: GeneratedContent) => {
    try {
      // Save the selected content to drafts
      await axios.post('/api/content/drafts', {
        platform: content.platform,
        type: content.type,
        content: content.content,
        hashtags: content.hashtags
      });
      
      // Redirect to the content editor
      router.push('/dashboard/content/editor');
    } catch (err) {
      console.error('Error saving content:', err);
      setError('Error saving content. API: /api/content/drafts');
    }
  };
  
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading content generator...</Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Button variant="text" onClick={handleBackToToolkit} sx={{ mr: 2 }}>
          ← Back to AI Toolkit
        </Button>
        <Typography variant="h4">Content Generator</Typography>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Generate engaging social media content for any platform in seconds using AI.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: '300px', maxWidth: '400px' }}>
          {/* Input form */}
          <Paper sx={{ p: 3, mb: { xs: 4, md: 0 } }}>
            <Typography variant="h6" gutterBottom>Content Parameters</Typography>
            
            <Box component="form" sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Topic or Request"
                variant="outlined"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What would you like to post about?"
                sx={{ mb: 3 }}
                multiline
                rows={3}
                required
              />
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="platform-label">Platform</InputLabel>
                <Select
                  labelId="platform-label"
                  value={platform}
                  label="Platform"
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <MenuItem value="">All Platforms</MenuItem>
                  {platforms.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="content-type-label">Content Type</InputLabel>
                <Select
                  labelId="content-type-label"
                  value={contentType}
                  label="Content Type"
                  onChange={(e) => setContentType(e.target.value)}
                >
                  <MenuItem value="">Any type</MenuItem>
                  {contentTypes.map(type => (
                    <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="tone-label">Tone</InputLabel>
                <Select
                  labelId="tone-label"
                  value={tone}
                  label="Tone"
                  onChange={(e) => setTone(e.target.value)}
                >
                  <MenuItem value="">Select tone</MenuItem>
                  {tones.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="audience-label">Target Audience</InputLabel>
                <Select
                  labelId="audience-label"
                  value={audience}
                  label="Target Audience"
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <MenuItem value="">Any audience</MenuItem>
                  {audiences.map(a => (
                    <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Keywords (optional)"
                variant="outlined"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Separate keywords with commas"
                sx={{ mb: 3 }}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleGenerate}
                  disabled={!topic || isGenerating}
                  fullWidth
                >
                  {isGenerating ? 'Generating...' : 'Generate Content'}
                </Button>
                
                <Button 
                  variant="outlined" 
                  onClick={handleClear}
                  disabled={isGenerating}
                >
                  Clear
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
        
        <Box sx={{ flex: '1 1 calc(100% - 400px)', minWidth: '300px' }}>
          {/* Results area */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Generated Content</Typography>
            
            {generatedContent.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">
                  {isGenerating 
                    ? 'Generating your content...' 
                    : 'Enter a topic and click "Generate Content" to see AI-generated suggestions'}
                </Typography>
                {isGenerating && <CircularProgress sx={{ mt: 2 }} />}
              </Box>
            ) : (
              <Box>
                {generatedContent.map((content) => (
                  <Card key={content.id} sx={{ mb: 3, borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Chip 
                          label={platforms.find(p => p.id === content.platform)?.name || content.platform}
                          size="small"
                          color="primary"
                        />
                        <Chip 
                          label={contentTypes.find(t => t.id === content.type)?.name || content.type}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                        {content.content}
                      </Typography>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Typography variant="subtitle2" gutterBottom>Suggested Hashtags:</Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {content.hashtags.map(hashtag => (
                          <Chip key={hashtag} label={hashtag} size="small" />
                        ))}
                      </Stack>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => handleUseContent(content)}
                        >
                          Use This Content
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 