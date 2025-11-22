import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface LinkedInContentGeneratorProps {
  onContentGenerated: (content: string) => void;
  initialPrompt?: string;
}

/**
 * LinkedIn-specific content generator with professional options
 */
export default function LinkedInContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: LinkedInContentGeneratorProps) {
  const { generateContent, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState<'post' | 'article' | 'job' | 'company'>('post');
  const [tone, setTone] = useState<'professional' | 'thought-leadership' | 'conversational' | 'storytelling'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [industry, setIndustry] = useState<'technology' | 'finance' | 'healthcare' | 'marketing' | 'education' | 'general'>('general');
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.LINKEDIN, contentType, {
        tone,
        length,
        includeHashtags,
        includeCTA,
        industry
      });
      
      if (result.success && result.data) {
        // Handle different response formats
        if (typeof result.data === 'object' && result.data.content) {
          setGeneratedContent(result.data.content);
        } else {
          setGeneratedContent(result.data.toString());
        }
        
        toast({
          title: "Content generated",
          description: "Your LinkedIn content has been created",
        });
      }
    } catch (err) {
      console.error('Error generating LinkedIn content:', err);
      toast({
        title: "Generation failed",
        description: typeof error === 'string' ? error : error?.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateContent();
  };
  
  // Handle content selection
  const handleUseContent = () => {
    onContentGenerated(generatedContent);
  };
  
  // Get length description for LinkedIn
  const getLengthDescription = () => {
    switch (length) {
      case 'short': return 'Brief update (1-2 paragraphs)';
      case 'medium': return 'Standard post (3-4 paragraphs)';
      case 'long': return 'Detailed post (5+ paragraphs)';
      default: return '';
    }
  };
  
  // Get content type description
  const getContentTypeDescription = () => {
    switch (contentType) {
      case 'post': return 'Regular LinkedIn post';
      case 'article': return 'LinkedIn article with depth';
      case 'job': return 'Job posting or career opportunity';
      case 'company': return 'Company update or announcement';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">LinkedIn Content Generator</h2>
      
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
                  <option value="post">Standard Post</option>
                  <option value="article">Article</option>
                  <option value="job">Job Posting</option>
                  <option value="company">Company Update</option>
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
                  <option value="professional">Professional</option>
                  <option value="thought-leadership">Thought Leadership</option>
                  <option value="conversational">Conversational</option>
                  <option value="storytelling">Storytelling</option>
                </select>
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
                <p className="text-xs text-gray-500 mt-1">{getLengthDescription()}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="industry">
                Industry
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="general">General</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="marketing">Marketing</option>
                <option value="education">Education</option>
              </select>
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
                placeholder="Example: Announcing our new product launch with improved features to enhance productivity"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeCTA}
                    onChange={(e) => setIncludeCTA(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Call to Action</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt}
            >
              {loading ? 'Generating...' : 'Generate LinkedIn Content'}
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
                <h3 className="font-medium mb-2">Engagement Analysis</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Analyze your content for potential engagement metrics on LinkedIn.
                </p>
                <button
                  className="px-3 py-1 bg-blue-700 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedContent}
                >
                  Analyze Engagement Potential
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Industry-Specific Insights</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Add industry statistics and insights to enhance credibility.
                </p>
                <button
                  className="px-3 py-1 bg-blue-700 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedContent}
                >
                  Add Industry Insights
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Executive Perspective</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Rewrite content from an executive or thought leader perspective.
                </p>
                <button
                  className="px-3 py-1 bg-blue-700 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedContent}
                >
                  Add Executive Perspective
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced LinkedIn content features are available on Influencer and Enterprise plans.
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
          <h3 className="font-semibold text-gray-800 mb-2">Generated LinkedIn Content</h3>
          <div className="bg-gray-50 p-4 rounded mb-4">
            <p className="text-gray-700 whitespace-pre-line">{generatedContent}</p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <button
              onClick={handleGenerateContent}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled}
            >
              {loading ? 'Regenerating...' : 'Regenerate Content'}
            </button>
            
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">LinkedIn Best Practices:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Start with a compelling hook in the first few lines</li>
          <li>Break up text into easy-to-read paragraphs</li>
          <li>Use 3-5 relevant hashtags to increase discoverability</li>
          <li>Include a clear call-to-action to drive engagement</li>
          <li>Keep your audience and professional network in mind</li>
        </ul>
      </div>
    </div>
  );
} 