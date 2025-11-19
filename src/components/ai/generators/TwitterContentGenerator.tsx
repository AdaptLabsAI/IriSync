import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface TwitterContentGeneratorProps {
  onContentGenerated: (content: string | string[], hashtags: string[]) => void;
  initialPrompt?: string;
}

/**
 * Twitter-specific content generator with character limits and thread options
 */
export default function TwitterContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: TwitterContentGeneratorProps) {
  const { generateContent, suggestHashtags, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState<'tweet' | 'thread' | 'quote' | 'poll'>('tweet');
  const [tone, setTone] = useState<'casual' | 'professional' | 'controversial' | 'viral'>('casual');
  const [threadLength, setThreadLength] = useState(3);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedThread, setGeneratedThread] = useState<string[]>([]);
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
      // Special handling for thread vs single tweet
      if (contentType === 'thread') {
        const result = await generateContent(prompt, SocialPlatform.TWITTER, contentType, {
          tone,
          threadLength: canUseAdvancedFeatures ? threadLength : 3,
          includeEmojis,
          includeHashtags
        });
        
        if (result.success && result.data) {
          // Handle thread content
          if (Array.isArray(result.data.content)) {
            setGeneratedThread(result.data.content);
            setGeneratedContent(''); // Clear single content
          } else {
            // Fallback if returned as a single string
            const tweets = result.data.content.split('\n---\n');
            setGeneratedThread(tweets);
            setGeneratedContent('');
          }
          
          if (result.data.suggestedHashtags && result.data.suggestedHashtags.length > 0) {
            setSuggestedHashtags(result.data.suggestedHashtags);
          } else {
            // Generate hashtags separately
            handleGenerateHashtags(result.data.content.toString());
          }
          
          toast({
            title: "Thread generated",
            description: `Generated a thread with ${generatedThread.length} tweets`,
          });
        }
      } else {
        // Regular tweet
        const result = await generateContent(prompt, SocialPlatform.TWITTER, contentType, {
          tone,
          includeEmojis,
          includeHashtags
        });
        
        if (result.success && result.data) {
          setGeneratedContent(result.data.content);
          setGeneratedThread([]); // Clear thread content
          
          if (result.data.suggestedHashtags && result.data.suggestedHashtags.length > 0) {
            setSuggestedHashtags(result.data.suggestedHashtags);
          } else {
            // Generate hashtags separately
            handleGenerateHashtags(result.data.content);
          }
          
          toast({
            title: "Tweet generated",
            description: "Your tweet content has been created",
          });
        }
      }
    } catch (err) {
      console.error('Error generating Twitter content:', err);
      toast({
        title: "Generation failed",
        description: error || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle hashtag generation
  const handleGenerateHashtags = async (content: string) => {
    if (!content) return;
    
    try {
      const result = await suggestHashtags(content, SocialPlatform.TWITTER, 5);
      
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
    if (contentType === 'thread' && generatedThread.length > 0) {
      onContentGenerated(generatedThread, suggestedHashtags);
    } else {
      onContentGenerated(generatedContent, suggestedHashtags);
    }
  };
  
  // Calculate character count for UI feedback
  const getCharacterCount = (text: string) => {
    return text.length;
  };
  
  // Get character limit class
  const getCharacterLimitClass = (count: number) => {
    if (count > 280) return 'text-red-500';
    if (count > 240) return 'text-amber-500';
    return 'text-[#00CC44]';
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Twitter Content Generator</h2>
      
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
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'advanced')}>
        <TabsList className="mb-4">
          <TabsTrigger value="create">Create Tweet</TabsTrigger>
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
                  Type
                </label>
                <select
                  id="contentType"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="tweet">Single Tweet</option>
                  <option value="thread">Thread</option>
                  <option value="quote">Quote Tweet</option>
                  <option value="poll">Poll</option>
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
                  <option value="professional">Professional</option>
                  <option value="controversial">Controversial</option>
                  <option value="viral">Viral</option>
                </select>
              </div>
              
              {contentType === 'thread' && (
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="threadLength">
                    Thread Length
                  </label>
                  <select
                    id="threadLength"
                    value={threadLength}
                    onChange={(e) => setThreadLength(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="2">2 Tweets</option>
                    <option value="3">3 Tweets</option>
                    <option value="4">4 Tweets</option>
                    <option value="5">5 Tweets</option>
                    {canUseAdvancedFeatures && (
                      <>
                        <option value="7">7 Tweets</option>
                        <option value="10">10 Tweets</option>
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="prompt">
                What would you like to tweet about?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Example: Sharing my thoughts on the latest tech developments in AI"
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
                    checked={includeHashtags}
                    onChange={(e) => setIncludeHashtags(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Hashtags</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt}
            >
              {loading ? 'Generating...' : `Generate ${contentType === 'thread' ? 'Thread' : 'Tweet'}`}
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
                <h3 className="font-medium mb-2">Tweet Thread Optimization</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Optimize your thread structure for maximum engagement.
                </p>
                <button
                  className="px-3 py-1 bg-blue-400 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedThread.length}
                >
                  Optimize Thread Structure
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Viral Tweet Analysis</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Analyze and improve your tweet's viral potential.
                </p>
                <button
                  className="px-3 py-1 bg-blue-400 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || (!generatedContent && !generatedThread.length)}
                >
                  Analyze Viral Potential
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced Twitter features are available on Influencer and Enterprise plans.
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
          <h3 className="font-semibold text-gray-800 mb-2">Generated Tweet</h3>
          <div className="bg-gray-50 p-4 rounded-md mb-4 relative">
            <p className="text-gray-700 whitespace-pre-line">
              {generatedContent}
            </p>
            <span className={`absolute bottom-2 right-3 text-xs font-medium ${getCharacterLimitClass(getCharacterCount(generatedContent))}`}>
              {getCharacterCount(generatedContent)}/280
            </span>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">Suggested Hashtags</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
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
              className="px-3 py-1 bg-blue-400 text-white rounded hover:bg-blue-500"
            >
              Use This Tweet
            </button>
          </div>
        </div>
      )}
      
      {contentType === 'thread' && generatedThread.length > 0 && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-3">Generated Thread</h3>
          
          <div className="space-y-4 mb-4">
            {generatedThread.map((tweet, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-md relative border-l-4 border-blue-300">
                <span className="absolute top-1 left-1 bg-blue-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {index + 1}/{generatedThread.length}
                </span>
                <p className="text-gray-700 whitespace-pre-line mt-3">
                  {tweet}
                </p>
                <span className={`absolute bottom-2 right-3 text-xs font-medium ${getCharacterLimitClass(getCharacterCount(tweet))}`}>
                  {getCharacterCount(tweet)}/280
                </span>
              </div>
            ))}
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">Suggested Hashtags</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Only include hashtags in the last tweet of your thread for best results.
            </p>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => handleGenerateHashtags(generatedThread.join(' '))}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !hashtagsEnabled}
            >
              {loading ? 'Generating...' : 'Regenerate Hashtags'}
            </button>
            
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-blue-400 text-white rounded hover:bg-blue-500"
            >
              Use This Thread
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 