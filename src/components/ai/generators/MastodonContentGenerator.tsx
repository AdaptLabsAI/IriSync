import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface MastodonContentGeneratorProps {
  onContentGenerated: (content: string, hashtags: string[]) => void;
  initialPrompt?: string;
}

/**
 * Mastodon-specific content generator for federated social networking
 * Creates toots with appropriate community-specific content and hashtags
 */
export default function MastodonContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: MastodonContentGeneratorProps) {
  const { generateContent, suggestHashtags, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState<'standard' | 'announcement' | 'discussion' | 'share'>('standard');
  const [tone, setTone] = useState<'casual' | 'academic' | 'technical' | 'community'>('casual');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeContentWarning, setIncludeContentWarning] = useState(false);
  const [contentWarningText, setContentWarningText] = useState('');
  const [community, setCommunity] = useState<'tech' | 'academic' | 'creative' | 'general' | 'fediverse'>('general');
  
  const [generatedContent, setGeneratedContent] = useState('');
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
      const result = await generateContent(prompt, SocialPlatform.MASTODON, contentType, {
        tone,
        length,
        includeEmojis,
        community,
        includeContentWarning,
        contentWarningText: includeContentWarning ? contentWarningText : undefined
      });
      
      if (result.success && result.data) {
        // Handle different response formats
        if (typeof result.data === 'object') {
          if (result.data.content) {
            setGeneratedContent(result.data.content);
          } else {
            setGeneratedContent(result.data.toString());
          }
          
          if (result.data.hashtags && Array.isArray(result.data.hashtags)) {
            setSuggestedHashtags(result.data.hashtags);
          } else {
            // Generate hashtags separately
            handleGenerateHashtags(result.data.content || result.data.toString());
          }
        } else {
          setGeneratedContent(result.data.toString());
          // Generate hashtags separately
          handleGenerateHashtags(result.data.toString());
        }
        
        toast({
          title: "Toot generated",
          description: "Your Mastodon content has been created",
        });
      }
    } catch (err) {
      console.error('Error generating Mastodon content:', err);
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
      const result = await suggestHashtags(content, SocialPlatform.MASTODON, 5, {
        community
      });
      
      if (result.success && result.data && result.data.hashtags) {
        setSuggestedHashtags(result.data.hashtags);
      }
    } catch (err) {
      console.error('Error generating hashtags:', err);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateContent();
  };
  
  // Handle content selection
  const handleUseContent = () => {
    onContentGenerated(generatedContent, suggestedHashtags);
  };
  
  // Calculate character count for UI feedback
  const getCharacterCount = (text: string) => {
    return text.length;
  };
  
  // Get character limit class
  const getCharacterLimitClass = (count: number) => {
    if (count > 500) return 'text-red-500';
    if (count > 400) return 'text-amber-500';
    return 'text-[#00CC44]';
  };
  
  // Get community description
  const getCommunityDescription = () => {
    switch (community) {
      case 'tech': return 'Tech and open-source community';
      case 'academic': return 'Academic and research community';
      case 'creative': return 'Creative, arts, and culture community';
      case 'fediverse': return 'Broader Fediverse communities';
      case 'general': return 'General audience';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Mastodon Content Generator</h2>
      
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
          {error.message}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value as 'create' | 'advanced')}>
        <TabsList className="mb-4">
          <TabsTrigger value="create">Create Toot</TabsTrigger>
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
                  <option value="standard">Standard Toot</option>
                  <option value="announcement">Announcement</option>
                  <option value="discussion">Discussion Starter</option>
                  <option value="share">Link/Resource Share</option>
                </select>
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
                  <option value="academic">Academic</option>
                  <option value="technical">Technical</option>
                  <option value="community">Community-Focused</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="community">
                  Community Focus
                </label>
                <select
                  id="community"
                  value={community}
                  onChange={(e) => setCommunity(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="general">General</option>
                  <option value="tech">Tech & Open Source</option>
                  <option value="academic">Academic & Research</option>
                  <option value="creative">Creative & Arts</option>
                  <option value="fediverse">Fediverse Culture</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getCommunityDescription()}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="prompt">
                What would you like to toot about?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Example: Sharing my thoughts on the latest developments in decentralized social networks"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                    checked={includeContentWarning}
                    onChange={(e) => setIncludeContentWarning(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Content Warning</span>
                </label>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="length">
                  Length
                </label>
                <select
                  id="length"
                  value={length}
                  onChange={(e) => setLength(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
            
            {includeContentWarning && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="contentWarningText">
                  Content Warning Text
                </label>
                <input
                  type="text"
                  id="contentWarningText"
                  value={contentWarningText}
                  onChange={(e) => setContentWarningText(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Specify the content warning..."
                />
              </div>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt || (includeContentWarning && !contentWarningText)}
            >
              {loading ? 'Generating...' : 'Generate Toot'}
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
                <h3 className="font-medium mb-2">Instance-Specific Optimization</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Optimize your toot for specific Mastodon instances.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-grow p-2 border rounded"
                    placeholder="Instance domain (e.g., mastodon.social)"
                  />
                  <button
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded disabled:bg-gray-400"
                    disabled={loading || !generatedContent}
                  >
                    Optimize
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Thread Generator</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Break your content into a thread of connected toots.
                </p>
                <div className="flex gap-2 items-center mb-2">
                  <span className="text-sm">Number of toots:</span>
                  <select className="p-2 border rounded">
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                  </select>
                  <button
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded disabled:bg-gray-400 ml-auto"
                    disabled={loading || !generatedContent}
                  >
                    Create Thread
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Translation</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Translate your toot to reach international communities.
                </p>
                <div className="flex gap-2 mb-2">
                  <select className="flex-grow p-2 border rounded">
                    <option value="">Select language</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                    <option value="es">Spanish</option>
                  </select>
                  <button
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded disabled:bg-gray-400"
                    disabled={loading || !generatedContent}
                  >
                    Translate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced Mastodon features are available on Influencer and Enterprise plans.
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
      
      {generatedContent && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Generated Toot</h3>
          
          {includeContentWarning && contentWarningText && (
            <div className="bg-amber-50 p-3 rounded border border-amber-200 mb-3">
              <span className="text-sm font-medium text-amber-800">CW: {contentWarningText}</span>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-md mb-4 relative">
            <p className="text-gray-700 whitespace-pre-line">
              {generatedContent}
            </p>
            <span className={`absolute bottom-2 right-3 text-xs font-medium ${getCharacterLimitClass(getCharacterCount(generatedContent))}`}>
              {getCharacterCount(generatedContent)}/500
            </span>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">Suggested Hashtags</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => handleGenerateHashtags(generatedContent)}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !hashtagsEnabled}
            >
              {loading ? 'Generating...' : 'Regenerate Hashtags'}
            </button>
            
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Use This Toot
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Mastodon Best Practices:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use content warnings (CWs) appropriately for sensitive topics</li>
          <li>Include descriptive alt text for any images you attach</li>
          <li>Tag posts with relevant hashtags for discoverability</li>
          <li>Keep in mind the federated nature of Mastodon communities</li>
          <li>Respect local instance culture and rules</li>
        </ul>
      </div>
    </div>
  );
} 