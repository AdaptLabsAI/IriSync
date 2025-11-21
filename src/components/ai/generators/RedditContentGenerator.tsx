import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface RedditContentGeneratorProps {
  onContentGenerated: (title: string, text: string) => void;
  initialPrompt?: string;
}

/**
 * Reddit-specific content generator for posts, comments, and AMAs
 * Includes subreddit-specific formatting and content styles
 */
export default function RedditContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: RedditContentGeneratorProps) {
  const { generateContent, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState<'post' | 'comment' | 'ama' | 'eli5'>('post');
  const [tone, setTone] = useState<'casual' | 'informative' | 'humorous' | 'debate'>('casual');
  const [subreddit, setSubreddit] = useState('');
  const [subredditCategory, setSubredditCategory] = useState<'tech' | 'science' | 'news' | 'entertainment' | 'other'>('tech');
  const [includeLinks, setIncludeLinks] = useState(true);
  const [includeFormatting, setIncludeFormatting] = useState(true);
  
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.REDDIT, contentType, {
        tone,
        subreddit: subreddit || undefined,
        subredditCategory,
        includeLinks,
        includeFormatting
      });
      
      if (result.success && result.data) {
        // Handle different response formats
        if (typeof result.data === 'object') {
          if (result.data.title) {
            setGeneratedTitle(result.data.title);
          }
          
          if (result.data.text || result.data.content) {
            setGeneratedText(result.data.text || result.data.content);
          }
        } else {
          // If it's just a string, try to split into title and content
          const content = result.data.toString();
          const lines = content.split('\n');
          
          if (lines.length > 1) {
            setGeneratedTitle(lines[0]);
            setGeneratedText(lines.slice(1).join('\n').trim());
          } else {
            setGeneratedText(content);
            // Generate title separately
            handleGenerateTitle(content);
          }
        }
        
        toast({
          title: "Reddit content generated",
          description: `Generated ${contentType} content`,
        });
      }
    } catch (err) {
      console.error('Error generating Reddit content:', err);
      toast({
        title: "Generation failed",
        description: typeof error === 'string' ? error : error?.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Generate title if not included in initial generation
  const handleGenerateTitle = async (text?: string) => {
    if (!prompt && !text) return;
    
    try {
      const result = await generateContent(text || prompt, SocialPlatform.REDDIT, 'title', {
        contentType,
        subredditCategory,
        subreddit: subreddit || undefined
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
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateContent();
  };
  
  // Handle content selection
  const handleUseContent = () => {
    onContentGenerated(generatedTitle, generatedText);
  };
  
  // Get content type description
  const getContentTypeDescription = () => {
    switch (contentType) {
      case 'post': return 'Standard Reddit post';
      case 'comment': return 'Comment or reply';
      case 'ama': return 'Ask Me Anything format';
      case 'eli5': return 'Explain Like I\'m 5 format';
      default: return '';
    }
  };
  
  // Get popular subreddits by category
  const getPopularSubreddits = () => {
    switch (subredditCategory) {
      case 'tech':
        return ['programming', 'webdev', 'technology', 'cscareerquestions', 'AskEngineers'];
      case 'science':
        return ['science', 'askscience', 'space', 'biology', 'physics'];
      case 'news':
        return ['news', 'worldnews', 'politics', 'UpliftingNews', 'nottheonion'];
      case 'entertainment':
        return ['movies', 'television', 'music', 'gaming', 'books'];
      default:
        return ['AskReddit', 'IAmA', 'explainlikeimfive', 'LifeProTips', 'todayilearned'];
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Reddit Content Generator</h2>
      
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
                  <option value="post">Post</option>
                  <option value="comment">Comment</option>
                  <option value="ama">AMA</option>
                  <option value="eli5">ELI5</option>
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
                  <option value="informative">Informative</option>
                  <option value="humorous">Humorous</option>
                  <option value="debate">Debate/Discussion</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Subreddit Category
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['tech', 'science', 'news', 'entertainment', 'other'].map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`p-2 text-center border rounded ${
                      subredditCategory === category 
                        ? 'bg-orange-100 border-orange-300' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => setSubredditCategory(category as any)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="subreddit">
                Subreddit (Optional)
              </label>
              <div className="flex">
                <span className="bg-gray-100 p-2 border border-r-0 rounded-l">r/</span>
                <input
                  type="text"
                  id="subreddit"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  className="w-full p-2 border rounded-r"
                  placeholder="Enter subreddit name"
                />
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Popular {subredditCategory} subreddits:</p>
                <div className="flex flex-wrap gap-1">
                  {getPopularSubreddits().map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                      onClick={() => setSubreddit(sub)}
                    >
                      r/{sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="prompt">
                What would you like to post about?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Example: Share insights about the latest tech developments or ask a specific question"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeLinks}
                    onChange={(e) => setIncludeLinks(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Links</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeFormatting}
                    onChange={(e) => setIncludeFormatting(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Markdown Formatting</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt}
            >
              {loading ? 'Generating...' : 'Generate Reddit Content'}
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
                <h3 className="font-medium mb-2">Subreddit Analysis</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Analyze subreddit-specific patterns to optimize your content.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-grow p-2 border rounded"
                    placeholder="Enter subreddit to analyze"
                    defaultValue={subreddit}
                  />
                  <button
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded disabled:bg-gray-400"
                    disabled={loading}
                  >
                    Analyze
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">FAQ Generator</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Create a comprehensive FAQ section for your post.
                </p>
                <button
                  className="px-3 py-1 bg-orange-600 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedText}
                >
                  Generate FAQ
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">TL;DR Generator</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Create a concise summary of your longer post.
                </p>
                <button
                  className="px-3 py-1 bg-orange-600 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedText || generatedText.length < 200}
                >
                  Generate TL;DR
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced Reddit content features are available on Influencer and Enterprise plans.
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
      
      {(generatedTitle || generatedText) && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Generated Reddit Content</h3>
          
          {generatedTitle && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Post Title</h4>
              <div className="bg-orange-50 p-4 rounded mb-4 border-l-4 border-orange-400">
                <p className="text-gray-800 font-medium">{generatedTitle}</p>
              </div>
              <button
                onClick={() => handleGenerateTitle()}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled}
              >
                Regenerate Title
              </button>
            </div>
          )}
          
          {generatedText && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Post Content</h4>
              <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans">{generatedText}</pre>
                </div>
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
              className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Reddit Content Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use clear, descriptive titles that summarize your content</li>
          <li>Format your post with headers, bullets, and paragraphs for readability</li>
          <li>Link to sources when making factual claims</li>
          <li>Be mindful of subreddit rules and culture</li>
          <li>Engage with comments to increase visibility</li>
        </ul>
      </div>
    </div>
  );
} 