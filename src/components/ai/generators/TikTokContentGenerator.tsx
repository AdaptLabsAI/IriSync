import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface TikTokContentGeneratorProps {
  onContentGenerated: (caption: string, videoIdea: string, hashtags: string[]) => void;
  initialPrompt?: string;
}

/**
 * TikTok-specific content generator with focus on short-form content
 */
export default function TikTokContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: TikTokContentGeneratorProps) {
  const { generateContent, suggestHashtags, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState<'entertainment' | 'educational' | 'product' | 'trend'>('entertainment');
  const [tone, setTone] = useState<'casual' | 'humorous' | 'energetic' | 'informative'>('casual');
  const [audienceAge, setAudienceAge] = useState<'gen-z' | 'millennial' | 'general'>('gen-z');
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [generateVideoIdea, setGenerateVideoIdea] = useState(true);
  
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedVideoIdea, setGeneratedVideoIdea] = useState('');
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [hashtagsEnabled, setHashtagsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.TIKTOK, contentType, {
        tone,
        audienceAge,
        includeEmojis,
        generateVideoIdea
      });
      
      if (result.success && result.data) {
        // Handle different response formats
        if (typeof result.data === 'object') {
          if (result.data.caption) {
            setGeneratedCaption(result.data.caption);
          } else {
            setGeneratedCaption(result.data.content || result.data.toString());
          }
          
          if (result.data.videoIdea) {
            setGeneratedVideoIdea(result.data.videoIdea);
          }
          
          if (result.data.hashtags && Array.isArray(result.data.hashtags)) {
            setSuggestedHashtags(result.data.hashtags);
          } else {
            // Generate hashtags separately
            handleGenerateHashtags(result.data.caption || result.data.content || result.data.toString());
          }
        } else {
          setGeneratedCaption(result.data.toString());
          // Generate hashtags separately
          handleGenerateHashtags(result.data.toString());
        }
        
        toast({
          title: "TikTok content generated",
          description: "Your caption and video idea have been created",
        });
      }
    } catch (err) {
      console.error('Error generating TikTok content:', err);
      toast({
        title: "Generation failed",
        description: typeof error === 'string' ? error : error?.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle hashtag generation
  const handleGenerateHashtags = async (content: string) => {
    if (!content) return;
    
    try {
      const result = await suggestHashtags(content, SocialPlatform.TIKTOK, 10);
      
      if (result.success && result.data && result.data.hashtags) {
        setSuggestedHashtags(result.data.hashtags);
      }
    } catch (err) {
      console.error('Error generating hashtags:', err);
    }
  };
  
  // Generate video idea separately if not included in the initial generation
  const handleGenerateVideoIdea = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.TIKTOK, 'video-idea', {
        contentType,
        tone,
        audienceAge
      });
      
      if (result.success && result.data) {
        if (typeof result.data === 'object' && result.data.videoIdea) {
          setGeneratedVideoIdea(result.data.videoIdea);
        } else {
          setGeneratedVideoIdea(result.data.toString());
        }
        
        toast({
          title: "Video idea generated",
          description: "Your TikTok video concept has been created",
        });
      }
    } catch (err) {
      console.error('Error generating video idea:', err);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateContent();
  };
  
  // Handle content selection
  const handleUseContent = () => {
    onContentGenerated(generatedCaption, generatedVideoIdea, suggestedHashtags);
  };
  
  // Get content type description
  const getContentTypeDescription = () => {
    switch (contentType) {
      case 'entertainment': return 'Fun, engaging videos for entertainment';
      case 'educational': return 'Informative or tutorial-style content';
      case 'product': return 'Product showcase or promotion';
      case 'trend': return 'Content based on current TikTok trends';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">TikTok Content Generator</h2>
      
      {/* Token alerts for content generation */}
      <AITokenAlert 
        taskType={AITaskType.GENERATE_POST}
        onTokenValidation={setGenerateEnabled}
      />
      
      {/* Token alerts for hashtag generation */}
      <AITokenAlert 
        taskType={AITaskType.GENERATE_HASHTAGS}
        onTokenValidation={setHashtagsEnabled}
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
                <label className="block text-gray-700 mb-2" htmlFor="contentType">
                  Content Type
                </label>
                <select
                  id="contentType"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="entertainment">Entertainment</option>
                  <option value="educational">Educational</option>
                  <option value="product">Product Showcase</option>
                  <option value="trend">Trending Content</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getContentTypeDescription()}</p>
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
                  <option value="casual">Casual</option>
                  <option value="humorous">Humorous</option>
                  <option value="energetic">Energetic</option>
                  <option value="informative">Informative</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="audienceAge">
                  Target Audience
                </label>
                <select
                  id="audienceAge"
                  value={audienceAge}
                  onChange={(e) => setAudienceAge(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="gen-z">Gen Z</option>
                  <option value="millennial">Millennial</option>
                  <option value="general">General Audience</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="prompt">
                What would you like to create a TikTok about?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Example: A day in the life of a graphic designer or 5 tips for better smartphone photography"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeEmojis}
                    onChange={(e) => setIncludeEmojis(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Emojis</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateVideoIdea}
                    onChange={(e) => setGenerateVideoIdea(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Generate Video Idea</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt}
            >
              {loading ? 'Generating...' : 'Generate TikTok Content'}
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
                <h3 className="font-medium mb-2">Trending Sound Suggestions</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Get suggestions for trending sounds that match your content.
                </p>
                <button
                  className="px-3 py-1 bg-pink-500 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedCaption}
                >
                  Find Trending Sounds
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Content Series Planner</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Generate ideas for a series of related TikToks on this topic.
                </p>
                <button
                  className="px-3 py-1 bg-pink-500 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !prompt}
                >
                  Plan Content Series
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Script Generator</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Generate a detailed video script based on your content.
                </p>
                <button
                  className="px-3 py-1 bg-pink-500 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedCaption}
                >
                  Generate Script
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced TikTok content features are available on Influencer and Enterprise plans.
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
      
      {generatedCaption && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Generated TikTok Content</h3>
          
          <div className="bg-gray-50 p-4 rounded mb-4">
            <h4 className="font-medium text-sm mb-2">Caption</h4>
            <p className="text-gray-700 whitespace-pre-line">{generatedCaption}</p>
          </div>
          
          {generatedVideoIdea && (
            <div className="bg-pink-50 p-4 rounded mb-4 border-l-4 border-pink-400">
              <h4 className="font-medium text-pink-800 mb-1">Video Idea</h4>
              <p className="text-pink-700">{generatedVideoIdea}</p>
            </div>
          )}
          
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">Suggested Hashtags</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <div className="flex gap-2">
              <button
                onClick={handleGenerateContent}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled}
              >
                {loading ? 'Regenerating...' : 'Regenerate All'}
              </button>
              
              {!generatedVideoIdea && (
                <button
                  onClick={handleGenerateVideoIdea}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  disabled={loading || !generateEnabled}
                >
                  Generate Video Idea
                </button>
              )}
            </div>
            
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-pink-500 text-white rounded hover:bg-pink-600"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">TikTok Content Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Keep captions brief and engaging</li>
          <li>Hook viewers in the first 3 seconds</li>
          <li>Use 3-5 trending hashtags</li>
          <li>Follow current trends and challenges</li>
          <li>Add a call-to-action (comment, follow, share)</li>
        </ul>
      </div>
    </div>
  );
} 