import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface InstagramContentGeneratorProps {
  onContentGenerated: (caption: string, hashtags: string[]) => void;
  initialPrompt?: string;
}

/**
 * Instagram-specific content generator focused on visual engagement
 * Creates captions, hashtags, and visual content suggestions
 */
export default function InstagramContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: InstagramContentGeneratorProps) {
  const { generateContent, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState<'feed' | 'story' | 'reel' | 'carousel'>('feed');
  const [tone, setTone] = useState<'casual' | 'professional' | 'inspirational' | 'playful'>('casual');
  const [imageDescription, setImageDescription] = useState('');
  const [hashtagCount, setHashtagCount] = useState(15);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeCallToAction, setIncludeCallToAction] = useState(true);
  
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [generatedVisualIdea, setGeneratedVisualIdea] = useState('');
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.INSTAGRAM, contentType, {
        tone,
        imageDescription: imageDescription || undefined,
        hashtagCount,
        includeEmojis,
        includeCallToAction
      });
      
      if (result) {
        // Handle different response formats
        if (typeof result === 'object') {
          if (result.caption) {
            setGeneratedCaption(result.caption);
          } else if (result.content) {
            setGeneratedCaption(result.content);
          } else if (typeof result.text === 'string') {
            setGeneratedCaption(result.text);
          }
          
          if (result.hashtags && Array.isArray(result.hashtags)) {
            setGeneratedHashtags(result.hashtags);
          } else if (result.hashtags && typeof result.hashtags === 'string') {
            // Parse hashtags string into array
            const hashtags = result.hashtags
              .split(/[#\s]+/)
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
              .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
            
            setGeneratedHashtags(hashtags);
          }
          
          if (result.visualIdea) {
            setGeneratedVisualIdea(result.visualIdea);
          } else if (result.imagePrompt) {
            setGeneratedVisualIdea(result.imagePrompt);
          }
        } else if (typeof result === 'string') {
          // If it's just a string, try to separate caption and hashtags
          const content = result;
          const hashtagMatch = content.match(/(#[a-zA-Z0-9]+\s*)+$/);
          
          if (hashtagMatch) {
            const hashtagPart = hashtagMatch[0];
            const caption = content.replace(hashtagPart, '').trim();
            
            setGeneratedCaption(caption);
            
            // Parse hashtags
            const hashtags = hashtagPart
              .split(/[#\s]+/)
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
              .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
            
            setGeneratedHashtags(hashtags);
          } else {
            setGeneratedCaption(content);
            
            // Generate hashtags separately
            handleGenerateHashtags(content);
          }
        }
        
        // If we didn't get visual ideas but need them, generate them separately
        if (!generatedVisualIdea && imageDescription) {
          handleGenerateVisualIdea();
        }
        
        toast({
          title: "Instagram content generated",
          description: `Generated ${contentType} content`
        });
      }
    } catch (err) {
      console.error('Error generating Instagram content:', err);
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate content. Please try again."
      });
    }
  };
  
  // Generate hashtags separately if not included in initial generation
  const handleGenerateHashtags = async (caption?: string) => {
    if (!prompt && !caption) return;
    
    try {
      const result = await generateContent(caption || prompt, SocialPlatform.INSTAGRAM, 'hashtags', {
        count: hashtagCount
      });
      
      if (result) {
        if (Array.isArray(result)) {
          setGeneratedHashtags(result);
        } else if (typeof result === 'object' && result.hashtags) {
          if (Array.isArray(result.hashtags)) {
            setGeneratedHashtags(result.hashtags);
          } else {
            // Parse hashtags string into array
            const hashtags = result.hashtags
              .toString()
              .split(/[#\s]+/)
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
              .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
            
            setGeneratedHashtags(hashtags);
          }
        } else if (typeof result === 'string') {
          // Parse hashtags string into array
          const hashtags = result
            .split(/[#\s]+/)
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
          
          setGeneratedHashtags(hashtags);
        }
      }
    } catch (err) {
      console.error('Error generating hashtags:', err);
    }
  };
  
  // Generate visual idea if not included
  const handleGenerateVisualIdea = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.INSTAGRAM, 'visualIdea', {
        contentType,
        imageDescription: imageDescription || undefined
      });
      
      if (result) {
        if (typeof result === 'object' && result.visualIdea) {
          setGeneratedVisualIdea(result.visualIdea);
        } else if (typeof result === 'object' && result.imagePrompt) {
          setGeneratedVisualIdea(result.imagePrompt);
        } else if (typeof result === 'string') {
          setGeneratedVisualIdea(result);
        }
      }
    } catch (err) {
      console.error('Error generating visual idea:', err);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateContent();
  };
  
  // Handle content selection
  const handleUseContent = () => {
    onContentGenerated(generatedCaption, generatedHashtags);
  };
  
  // Get content type description
  const getContentTypeDescription = () => {
    switch (contentType) {
      case 'feed': return 'Regular post for your feed';
      case 'story': return '24-hour story content';
      case 'reel': return 'Short-form video content';
      case 'carousel': return 'Multiple slides in a single post';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Instagram Content Generator</h2>
      
      {/* Token alerts for content generation */}
      <AITokenAlert 
        taskType={AITaskType.GENERATE_POST}
        onTokenValidation={setGenerateEnabled}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error.message}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'advanced')}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  <option value="feed">Feed Post</option>
                  <option value="story">Story</option>
                  <option value="reel">Reel</option>
                  <option value="carousel">Carousel</option>
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
                  <option value="professional">Professional</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="playful">Playful</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="prompt">
                What is your content about?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Share what your post will be about (e.g., new product launch, behind-the-scenes, lifestyle content)"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="imageDescription">
                Image/Visual Description (Optional)
              </label>
              <textarea
                id="imageDescription"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                className="w-full p-2 border rounded"
                rows={2}
                placeholder="Describe the image or visual content (e.g., product on white background, person in nature, close-up of food)"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="hashtagCount">
                  Number of Hashtags
                </label>
                <select
                  id="hashtagCount"
                  value={hashtagCount}
                  onChange={(e) => setHashtagCount(parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  <option value={5}>Few (5)</option>
                  <option value={10}>Some (10)</option>
                  <option value={15}>Many (15)</option>
                  <option value={30}>Maximum (30)</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center h-full pt-8">
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
                <label className="flex items-center h-full pt-8">
                  <input
                    type="checkbox"
                    checked={includeCallToAction}
                    onChange={(e) => setIncludeCallToAction(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Call to Action</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded hover:from-pink-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt}
            >
              {loading ? 'Generating...' : 'Generate Instagram Content'}
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
                <h3 className="font-medium mb-2">Audience Analysis</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Analyze your audience to optimize content engagement.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <select className="p-2 border rounded">
                    <option value="engagement">By Engagement</option>
                    <option value="growth">By Growth</option>
                    <option value="demographics">By Demographics</option>
                  </select>
                  <button
                    className="px-3 py-1 bg-pink-500 text-white text-sm rounded disabled:bg-gray-400"
                    disabled={loading}
                  >
                    Analyze
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Content Calendar Integration</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Schedule this content for optimal posting time.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select className="p-2 border rounded col-span-2">
                    <option value="">Select optimal time...</option>
                    <option value="tomorrow-morning">Tomorrow Morning</option>
                    <option value="tomorrow-evening">Tomorrow Evening</option>
                    <option value="weekend">Weekend</option>
                    <option value="custom">Custom Date/Time</option>
                  </select>
                  <button
                    className="px-3 py-1 bg-pink-500 text-white text-sm rounded disabled:bg-gray-400"
                    disabled={loading || !generatedCaption}
                  >
                    Schedule
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Hashtag Performance</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Analyze hashtag performance metrics.
                </p>
                <button
                  className="px-3 py-1 bg-pink-500 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || generatedHashtags.length === 0}
                >
                  Analyze Hashtags
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced Instagram content features are available on Influencer and Enterprise plans.
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
      
      {(generatedCaption || generatedHashtags.length > 0 || generatedVisualIdea) && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Generated Instagram Content</h3>
          
          {generatedCaption && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Caption</h4>
              <div className="bg-gradient-to-r from-pink-50 to-orange-50 p-4 rounded mb-4 border border-pink-100">
                <p className="text-gray-800 whitespace-pre-line">{generatedCaption}</p>
              </div>
              <button
                onClick={handleGenerateContent}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled}
              >
                Regenerate Caption
              </button>
            </div>
          )}
          
          {generatedHashtags.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Hashtags</h4>
              <div className="bg-gray-50 p-3 rounded mb-3 border border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {generatedHashtags.map((tag, index) => (
                    <span key={index} className="inline-block bg-white px-2 py-1 rounded border border-gray-200 text-gray-800">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleGenerateHashtags()}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled}
              >
                Regenerate Hashtags
              </button>
            </div>
          )}
          
          {generatedVisualIdea ? (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Visual Content Idea</h4>
              <div className="bg-gray-50 p-4 rounded mb-3 border border-gray-200">
                <p className="text-gray-700 italic">{generatedVisualIdea}</p>
              </div>
              <button
                onClick={handleGenerateVisualIdea}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled}
              >
                Regenerate Visual Idea
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <button
                onClick={handleGenerateVisualIdea}
                className="px-3 py-1 border border-dashed border-gray-300 text-gray-600 rounded hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed w-full py-2"
                disabled={loading || !generateEnabled}
              >
                Generate Visual Content Idea
              </button>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded hover:from-pink-600 hover:to-orange-600"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Instagram Best Practices:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Keep captions clear and concise, with important info at the beginning</li>
          <li>Use line breaks to improve readability</li>
          <li>Include a mix of popular and niche hashtags for better discovery</li>
          <li>Match your caption tone to your brand voice and visual content</li>
          <li>Include a call-to-action to increase engagement</li>
        </ul>
      </div>
    </div>
  );
} 