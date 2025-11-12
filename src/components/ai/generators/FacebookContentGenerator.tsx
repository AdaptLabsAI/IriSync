import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import Tabs, { Tab, TabPanel } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface FacebookContentGeneratorProps {
  onContentGenerated: (content: string, callToAction?: string) => void;
  initialPrompt?: string;
}

/**
 * Facebook-specific content generator with engagement features
 */
export default function FacebookContentGenerator({ 
  onContentGenerated,
  initialPrompt = ''
}: FacebookContentGeneratorProps) {
  const { generateContent, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState<'post' | 'event' | 'group' | 'offer'>('post');
  const [tone, setTone] = useState<'casual' | 'professional' | 'friendly' | 'promotional'>('casual');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [targetAudience, setTargetAudience] = useState<'general' | 'customers' | 'leads' | 'community'>('general');
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!prompt) return;
    
    try {
      const result = await generateContent(prompt, SocialPlatform.FACEBOOK, contentType, {
        tone,
        length,
        includeEmojis,
        includeCTA,
        targetAudience,
        includeCallToAction: includeCTA
      });
      
      if (result.success && result.data) {
        // Handle potential structure with separate call to action
        if (typeof result.data === 'object' && result.data.content) {
          setGeneratedContent(result.data.content);
          if (result.data.callToAction) {
            setCallToAction(result.data.callToAction);
          }
        } else {
          setGeneratedContent(result.data.toString());
        }
        
        toast({
          title: "Content generated",
          description: "Your Facebook content has been created",
        });
      }
    } catch (err) {
      console.error('Error generating Facebook content:', err);
      toast({
        title: "Generation failed",
        description: typeof error === 'object' && error?.message ? error.message : String(error) || "Failed to generate content. Please try again."
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
    onContentGenerated(generatedContent, includeCTA ? callToAction : undefined);
  };
  
  // Get length description for Facebook
  const getLengthDescription = () => {
    switch (length) {
      case 'short': return 'Brief message (1-2 paragraphs)';
      case 'medium': return 'Standard post (3-4 paragraphs)';
      case 'long': return 'Detailed content (5+ paragraphs)';
      default: return '';
    }
  };
  
  // Get content type description
  const getContentTypeDescription = () => {
    switch (contentType) {
      case 'post': return 'Regular Facebook post';
      case 'event': return 'Event announcement or update';
      case 'group': return 'Content for Facebook group';
      case 'offer': return 'Special offer or promotion';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Facebook Content Generator</h2>
      
      {/* Token alerts for content generation */}
      <AITokenAlert 
        taskType={AITaskType.GENERATE_POST}
        onTokenValidation={setGenerateEnabled}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {typeof error === 'object' && error.message ? error.message : String(error)}
        </div>
      )}
      
      <Tabs 
        value={activeTab === 'create' ? 0 : 1}
        onChange={(_, value) => setActiveTab(value === 0 ? 'create' : 'advanced')}
      >
        <Tab label="Create Content" />
        <Tab label="Advanced Options" disabled={!canUseAdvancedFeatures} />
        
        <TabPanel value={activeTab === 'create' ? 0 : 1} index={0}>
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
                  <option value="event">Event Post</option>
                  <option value="group">Group Post</option>
                  <option value="offer">Offer/Promotion</option>
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
                  <option value="friendly">Friendly</option>
                  <option value="promotional">Promotional</option>
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
              <label className="block text-gray-700 mb-2" htmlFor="prompt">
                What would you like to post about?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Example: Announcing our summer sale with special discounts on all products this weekend"
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
                    checked={includeCTA}
                    onChange={(e) => setIncludeCTA(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Call to Action</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
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
                <option value="customers">Existing Customers</option>
                <option value="leads">Potential Customers</option>
                <option value="community">Community Members</option>
              </select>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !prompt}
            >
              {loading ? 'Generating...' : 'Generate Facebook Content'}
            </button>
          </form>
        </TabPanel>
        
        <TabPanel value={activeTab === 'create' ? 0 : 1} index={1}>
          {canUseAdvancedFeatures ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                These advanced features are available to Influencer and Enterprise subscribers.
              </p>
              
              {/* Advanced features would go here */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Engagement Optimizer</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Analyze your content for maximum engagement potential.
                </p>
                <button
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedContent}
                >
                  Optimize for Engagement
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Audience Targeting</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Customize content for specific demographic groups.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select className="p-2 border rounded text-sm">
                    <option value="">Select age group</option>
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-44">35-44</option>
                    <option value="45+">45+</option>
                  </select>
                  <select className="p-2 border rounded text-sm">
                    <option value="">Select interest</option>
                    <option value="technology">Technology</option>
                    <option value="health">Health & Fitness</option>
                    <option value="education">Education</option>
                    <option value="shopping">Shopping</option>
                  </select>
                </div>
                <button
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded mt-2 disabled:bg-gray-400"
                  disabled={loading || !generatedContent}
                >
                  Target Content
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced Facebook content features are available on Influencer and Enterprise plans.
              </p>
              <button
                className="px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600"
                onClick={() => window.location.href = '/dashboard/settings/billing'}
              >
                Upgrade Plan
              </button>
            </div>
          )}
        </TabPanel>
      </Tabs>
      
      {generatedContent && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Generated Facebook Content</h3>
          <div className="bg-gray-50 p-4 rounded mb-4">
            <p className="text-gray-700 whitespace-pre-line">{generatedContent}</p>
          </div>
          
          {includeCTA && callToAction && (
            <div className="bg-blue-50 p-4 rounded mb-4 border-l-4 border-blue-500">
              <h4 className="font-medium text-blue-800 mb-1">Call to Action</h4>
              <p className="text-blue-700">{callToAction}</p>
            </div>
          )}
          
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
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 