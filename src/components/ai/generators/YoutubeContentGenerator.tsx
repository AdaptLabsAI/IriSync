import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface YoutubeContentGeneratorProps {
  onContentGenerated: (title: string, description: string, tags?: string[]) => void;
  initialPrompt?: string;
}

/**
 * YouTube-specific content generator for video titles, descriptions, and SEO optimization
 */
export default function YoutubeContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: YoutubeContentGeneratorProps) {
  const { generateContent, suggestHashtags, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [videoType, setVideoType] = useState<'tutorial' | 'vlog' | 'review' | 'entertainment'>('tutorial');
  const [tone, setTone] = useState<'professional' | 'casual' | 'energetic' | 'educational'>('professional');
  const [descriptionLength, setDescriptionLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeCallToAction, setIncludeCallToAction] = useState(true);
  const [targetAudience, setTargetAudience] = useState<'general' | 'beginners' | 'experts' | 'niche'>('general');
  
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.YOUTUBE, videoType, {
        tone,
        descriptionLength,
        includeTimestamps,
        includeCallToAction,
        targetAudience
      });
      
      if (result.success && result.data) {
        // Handle different response formats
        if (typeof result.data === 'object') {
          if (result.data.title) {
            setGeneratedTitle(result.data.title);
          }
          
          if (result.data.description) {
            setGeneratedDescription(result.data.description);
          } else if (result.data.content) {
            setGeneratedDescription(result.data.content);
          }
          
          if (result.data.tags && Array.isArray(result.data.tags)) {
            setSuggestedTags(result.data.tags);
          } else {
            // Generate tags separately
            handleGenerateTags(prompt);
          }
        } else {
          // If it's just a string, assume it's the description
          setGeneratedDescription(result.data.toString());
          
          // Generate title and tags separately
          handleGenerateTitle();
          handleGenerateTags(result.data.toString());
        }
        
        toast({
          title: "YouTube content generated",
          description: "Your title and description have been created",
        });
      }
    } catch (err) {
      console.error('Error generating YouTube content:', err);
      toast({
        title: "Generation failed",
        description: typeof error === 'string' ? error : error?.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Generate title if not included in initial generation
  const handleGenerateTitle = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.YOUTUBE, 'title', {
        videoType,
        tone
      });
      
      if (result.success && result.data) {
        if (typeof result.data === 'object' && result.data.title) {
          setGeneratedTitle(result.data.title);
        } else {
          setGeneratedTitle(result.data.toString());
        }
      }
    } catch (err) {
      console.error('Error generating title:', err);
    }
  };
  
  // Handle tag generation
  const handleGenerateTags = async (content: string) => {
    if (!content) return;
    
    try {
      const result = await suggestHashtags(content, SocialPlatform.YOUTUBE, 10, {
        isYouTubeTags: true
      });
      
      if (result.success && result.data && result.data.hashtags) {
        setSuggestedTags(result.data.hashtags);
      }
    } catch (err) {
      console.error('Error generating tags:', err);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateContent();
  };
  
  // Handle content selection
  const handleUseContent = () => {
    onContentGenerated(generatedTitle, generatedDescription, suggestedTags);
  };
  
  // Get video type description
  const getVideoTypeDescription = () => {
    switch (videoType) {
      case 'tutorial': return 'How-to or instructional content';
      case 'vlog': return 'Vlog or day-in-the-life content';
      case 'review': return 'Product or service review';
      case 'entertainment': return 'Entertainment or storytelling content';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">YouTube Content Generator</h2>
      
      {/* Token alerts for content generation */}
      <AITokenAlert 
        taskType={AITaskType.GENERATE_POST}
        onTokenValidation={setGenerateEnabled}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value as 'create' | 'advanced')}>
        <TabsList className="mb-4">
          <TabsTrigger value="create">Create Content</TabsTrigger>
          <TabsTrigger 
            value="advanced" 
            disabled={!canUseAdvancedFeatures}
            className="relative"
          >
            Advanced Options
            {!canUseAdvancedFeatures && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                ★
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="videoType">
                  Video Type
                </label>
                <select
                  id="videoType"
                  value={videoType}
                  onChange={(e) => setVideoType(e.target.value as any)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="tutorial">Tutorial</option>
                  <option value="vlog">Vlog</option>
                  <option value="review">Review</option>
                  <option value="entertainment">Entertainment</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getVideoTypeDescription()}</p>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="tone">
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="energetic">Energetic</option>
                  <option value="educational">Educational</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="descriptionLength">
                  Description Length
                </label>
                <select
                  id="descriptionLength"
                  value={descriptionLength}
                  onChange={(e) => setDescriptionLength(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="prompt">
                What is your video about?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Example: How to set up a home studio for podcasting on a budget with equipment recommendations"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeTimestamps}
                    onChange={(e) => setIncludeTimestamps(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Timestamps</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeCallToAction}
                    onChange={(e) => setIncludeCallToAction(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Call to Action</span>
                </label>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="targetAudience">
                  Target Audience
                </label>
                <select
                  id="targetAudience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="general">General Audience</option>
                  <option value="beginners">Beginners</option>
                  <option value="experts">Experts</option>
                  <option value="niche">Niche Audience</option>
                </select>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt}
            >
              {loading ? 'Generating...' : 'Generate YouTube Content'}
            </button>
          </form>
        </TabsContent>
        
        <TabsContent value="advanced">
          {canUseAdvancedFeatures ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                These advanced features are available to Influencer and Enterprise subscribers.
              </p>
              
              {/* Advanced features would go here */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">SEO Optimization</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Optimize your content for YouTube search algorithms.
                </p>
                <button
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedDescription}
                >
                  Optimize for SEO
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Thumbnail Prompt Generator</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Generate prompts for AI image generators to create thumbnails.
                </p>
                <button
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedTitle}
                >
                  Generate Thumbnail Ideas
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Clickthrough Rate Optimizer</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Generate variations of your title to maximize CTR.
                </p>
                <button
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedTitle}
                >
                  Optimize for CTR
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced YouTube content features are available on Influencer and Enterprise plans.
              </p>
              <button
                className="px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600"
                onClick={() => window.location.href = '/dashboard/settings/billing'}
              >
                Upgrade Plan
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {(generatedTitle || generatedDescription) && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Generated YouTube Content</h3>
          
          {generatedTitle && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Video Title</h4>
              <div className="bg-red-50 p-4 rounded mb-4 border-l-4 border-red-400">
                <p className="text-gray-800 font-medium">{generatedTitle}</p>
              </div>
              <button
                onClick={handleGenerateTitle}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled}
              >
                Regenerate Title
              </button>
            </div>
          )}
          
          {generatedDescription && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Video Description</h4>
              <div className="bg-gray-50 p-4 rounded mb-4">
                <pre className="text-gray-700 whitespace-pre-wrap font-sans">
                  {generatedDescription}
                </pre>
              </div>
            </div>
          )}
          
          {suggestedTags.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Suggested Tags</h4>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <button
              onClick={handleGenerateContent}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled}
            >
              {loading ? 'Regenerating...' : 'Regenerate All'}
            </button>
            
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">YouTube Content Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use attention-grabbing titles (40-60 characters)</li>
          <li>Include keywords in your title and description</li>
          <li>Add timestamps to help viewers navigate longer videos</li>
          <li>Include links to related content and call-to-actions</li>
          <li>Use at least 5-7 relevant tags for better discovery</li>
        </ul>
      </div>
    </div>
  );
} 