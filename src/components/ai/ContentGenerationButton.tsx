import React, { useState, ReactNode } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { PenTool, X, Sparkles, Loader, Copy, Check, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select } from '../ui/select/Select';
import { TextArea } from '../ui/textarea/TextArea';
import { Input } from '../ui/input/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from '../ui/use-toast';

import { SocialPlatform } from '../../lib/models/SocialAccount';
import { useAIToolkit } from '../../hooks/useAIToolkit';
import InstagramContentGenerator from './generators/InstagramContentGenerator';
import TwitterContentGenerator from './generators/TwitterContentGenerator';
import LinkedInContentGenerator from './generators/LinkedInContentGenerator';
import FacebookContentGenerator from './generators/FacebookContentGenerator';
import TikTokContentGenerator from './generators/TikTokContentGenerator';
import YoutubeContentGenerator from './generators/YoutubeContentGenerator';
import MastodonContentGenerator from './generators/MastodonContentGenerator';
import RedditContentGenerator from './generators/RedditContentGenerator';
import CaptionGenerator from './generators/CaptionGenerator';
import VideoDescriptionGenerator from './generators/VideoDescriptionGenerator';
import HashtagOptimizerComponent from './generators/HashtagOptimizerComponent';
import ContentRepurposingTool from './generators/ContentRepurposingTool';
import SEOContentGenerator from './generators/SEOContentGenerator';
import MultiPlatformCampaignGenerator from './generators/MultiPlatformCampaignGenerator';
import ContentCalendarGenerator from './generators/ContentCalendarGenerator';
import BrandVoiceConsistencyTool from './generators/BrandVoiceConsistencyTool';
import { useSubscription } from '../../hooks/useSubscription';

export interface Platform {
  id: string;
  name: string;
  icon?: ReactNode;
  contentLengthOptions?: string[];
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  prompt: string;
}

export interface GeneratedContent {
  id: string;
  content: string;
  platform: string;
  prompt: string;
  timestamp: Date;
}

export interface ContentGenerationButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Available social media platforms
   */
  platforms?: Platform[];
  /**
   * Predefined content templates
   */
  templates?: ContentTemplate[];
  /**
   * Callback when content is generated
   */
  onGenerateContent?: (prompt: string, platform: string, tone: string, length: string) => Promise<string>;
  /**
   * Callback when generated content is saved
   */
  onSaveContent?: (content: string, platform: string, prompt: string) => Promise<void>;
  /**
   * Callback when the user wants to apply generated content directly to a post
   */
  onApplyContent?: (content: string) => void;
  /**
   * Previously generated content
   */
  previouslyGenerated?: GeneratedContent[];
  /**
   * Content to pre-fill the editor with
   */
  initialContent?: string;
  /**
   * Whether the AI feature is available on the current plan
   */
  isFeatureAvailable?: boolean;
  /**
   * Callback when the upgrade button is clicked
   */
  onUpgradeClick?: () => void;
}

/**
 * A button for generating AI-powered content for social media posts.
 * This component provides different templates and options for content generation.
 * The basic version is available on the Creator tier, with advanced features on higher tiers.
 */
const ContentGenerationButton: React.FC<ContentGenerationButtonProps> = ({
  platforms = [],
  templates = [],
  onGenerateContent,
  onSaveContent,
  onApplyContent,
  previouslyGenerated = [],
  initialContent = '',
  isFeatureAvailable = true,
  onUpgradeClick,
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(platforms.length > 0 ? platforms[0].id : '');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [tone, setTone] = useState('professional');
  const [contentLength, setContentLength] = useState('medium');
  const [activeTab, setActiveTab] = useState('instagram');
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  

  const { generateContent } = useAIToolkit();
  const { subscription } = useSubscription();
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  const canUseEnterpriseFeatures = userTier === 'enterprise';
  
  // Platform tabs for basic tier
  const platformTabs = [
    { id: 'instagram', label: 'Instagram', icon: '📷' },
    { id: 'twitter', label: 'Twitter', icon: '🐦' },
    { id: 'facebook', label: 'Facebook', icon: '📘' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'tiktok', label: 'TikTok', icon: '🎵' },
    { id: 'youtube', label: 'YouTube', icon: '📺' }
  ];
  
  // Advanced platform tabs for influencer+ tiers
  const advancedPlatformTabs = [
    { id: 'mastodon', label: 'Mastodon', icon: '🐘' },
    { id: 'reddit', label: 'Reddit', icon: '🤖' }
  ];
  
  // Specialized content tabs
  const specializedContentTabs = [
    { id: 'caption', label: 'Caption Generator', icon: '✍️' },
    { id: 'video-description', label: 'Video Description', icon: '🎬' },
    { id: 'hashtags', label: 'Hashtag Optimizer', icon: '#️⃣' },
    { id: 'repurposing', label: 'Content Repurposing', icon: '🔄' }
  ];
  
  // Enterprise tabs
  const enterpriseTabs = [
    { id: 'seo', label: 'SEO Content', icon: '🔍' },
    { id: 'campaign', label: 'Multi-Platform Campaign', icon: '🚀' },
    { id: 'analytics', label: 'Content Analytics', icon: '📊' },
    { id: 'automation', label: 'Content Automation', icon: '⚙️' }
  ];
  
  const handleClick = () => {
    if (!isFeatureAvailable) {
      onUpgradeClick?.();
      return;
    }
    
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    // Reset the form when closing the dialog
    setPrompt('');
    setGeneratedContent('');
    setSelectedTemplate('');
    setViewMode('simple');
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setPrompt(template.prompt);
        setSelectedPlatform(template.platform);
      }
    }
  };

  const handleGenerateContentLegacy = async () => {
    if (!onGenerateContent || !prompt || !selectedPlatform) return;
    
    setIsGenerating(true);
    
    try {
      const content = await onGenerateContent(prompt, selectedPlatform, tone, contentLength);
      setGeneratedContent(content);
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error({
        title: "Generation failed",
        description: "Failed to generate content. Please try again."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveContent = async () => {
    if (!onSaveContent || !generatedContent) return;
    
    try {
      await onSaveContent(generatedContent, selectedPlatform, prompt);
      toast.success({
        title: "Content saved",
        description: "Your content has been saved successfully"
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error({
        title: "Save failed",
        description: "Failed to save content. Please try again."
      });
    }
  };

  const handleCopyContent = () => {
    if (!generatedContent) return;
    
    navigator.clipboard.writeText(generatedContent);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);

    toast.success({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard"
    });
  };

  const handleApplyContent = () => {
    if (!onApplyContent || !generatedContent) return;
    
    onApplyContent(generatedContent);
    handleClose();
  };

  const handleContentGenerated = (content: string, metadata?: any) => {
    // Use a typed variable with proper fallback to OTHER instead of non-existent GENERAL
    let platform: SocialPlatform;

    // Determine platform based on active tab
    switch (activeTab) {
      case 'instagram':
        platform = SocialPlatform.INSTAGRAM;
        break;
      case 'twitter':
        platform = SocialPlatform.TWITTER;
        break;
      case 'facebook':
        platform = SocialPlatform.FACEBOOK;
        break;
      case 'linkedin':
        platform = SocialPlatform.LINKEDIN;
        break;
      case 'tiktok':
        platform = SocialPlatform.TIKTOK;
        break;
      case 'youtube':
        platform = SocialPlatform.YOUTUBE;
        break;
      case 'mastodon':
        platform = SocialPlatform.MASTODON;
        break;
      case 'reddit':
        platform = SocialPlatform.REDDIT;
        break;
      case 'threads':
        platform = SocialPlatform.THREADS;
        break;
      case 'pinterest':
        platform = SocialPlatform.PINTEREST;
        break;
      default:
        // Fallback: use metadata platform if provided, otherwise use OTHER
        platform = (metadata?.platform as SocialPlatform) ?? SocialPlatform.OTHER;
        break;
    }

    setGeneratedContent(content);
    setActiveTab('history');
  };
  
  const handleTwitterContentGenerated = (content: string | string[], hashtags: string[]) => {
    if (Array.isArray(content)) {
      // For threads, join with appropriate separator
      setGeneratedContent(content.join('\n\n---\n\n'));
    } else {
      setGeneratedContent(content);
    }
    setActiveTab('history');
  };
  
  const handleInstagramContentGenerated = (content: string, hashtags: string[], mediaPrompt?: string) => {
    const fullContent = mediaPrompt 
      ? `${content}\n\n${hashtags.map(tag => `#${tag}`).join(' ')}\n\n[Image concept: ${mediaPrompt}]`
      : `${content}\n\n${hashtags.map(tag => `#${tag}`).join(' ')}`;
    
    setGeneratedContent(fullContent);
    setActiveTab('history');
  };
  
  const handleFacebookContentGenerated = (content: string, callToAction?: string) => {
    const fullContent = callToAction 
      ? `${content}\n\n${callToAction}`
      : content;
    
    setGeneratedContent(fullContent);
    setActiveTab('history');
  };
  
  const getPlatformOptions = platforms.map(platform => ({
    value: platform.id,
    label: platform.name
  }));

  const getToneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'formal', label: 'Formal' },
    { value: 'persuasive', label: 'Persuasive' },
    { value: 'enthusiastic', label: 'Enthusiastic' }
  ];

  const getLengthOptions = () => {
    const selectedPlatformObj = platforms.find(p => p.id === selectedPlatform);
    
    if (selectedPlatformObj?.contentLengthOptions) {
      return selectedPlatformObj.contentLengthOptions.map(length => ({
        value: length.toLowerCase(),
        label: length
      }));
    }
    
    return [
      { value: 'short', label: 'Short' },
      { value: 'medium', label: 'Medium' },
      { value: 'long', label: 'Long' }
    ];
  };

  const renderPlatformSpecificGenerator = () => {
    switch (selectedPlatform) {
      case SocialPlatform.INSTAGRAM:
        return <InstagramContentGenerator 
          onContentGenerated={handleInstagramContentGenerated} 
          initialPrompt={prompt}
        />;
      case SocialPlatform.TWITTER:
        return <TwitterContentGenerator 
          onContentGenerated={handleTwitterContentGenerated} 
          initialPrompt={prompt}
        />;
      case SocialPlatform.LINKEDIN:
        return <LinkedInContentGenerator 
          onContentGenerated={handleContentGenerated} 
          initialPrompt={prompt}
        />;
      case SocialPlatform.FACEBOOK:
        return <FacebookContentGenerator 
          onContentGenerated={handleFacebookContentGenerated} 
          initialPrompt={prompt}
        />;
      default:
        return (
          <div className="p-4 border rounded bg-gray-50">
            <p className="text-gray-700 mb-4">
              Use the simple mode for this platform or select Instagram, Twitter, LinkedIn or Facebook for specialized tools.
            </p>
            <button 
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded"
              onClick={() => setViewMode('simple')}
            >
              Switch to Simple Mode
            </button>
          </div>
        );
    }
  };

  const renderTabs = () => {
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="specialized">Specialized</TabsTrigger>
          <TabsTrigger value="enterprise" disabled={!canUseEnterpriseFeatures}>
            Enterprise
            {!canUseEnterpriseFeatures && (
              <span className="ml-1 text-xs bg-amber-500 text-white px-1 rounded">★</span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="platforms" className="p-1">
          <div className="grid grid-cols-3 gap-2 mb-6">
            {platformTabs.map((tab) => (
              <button
                key={tab.id}
                className={`p-2 border rounded flex flex-col items-center justify-center text-center transition-colors ${
                  activeTab === tab.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-2xl mb-1">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
            
            {/* Advanced platform tabs (influencer and enterprise tiers) */}
            {advancedPlatformTabs.map((tab) => (
              <button
                key={tab.id}
                className={`p-2 border rounded flex flex-col items-center justify-center text-center transition-colors relative ${
                  activeTab === tab.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                } ${!canUseAdvancedFeatures ? 'opacity-60' : ''}`}
                onClick={() => canUseAdvancedFeatures && setActiveTab(tab.id)}
                disabled={!canUseAdvancedFeatures}
              >
                <span className="text-2xl mb-1">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
                {!canUseAdvancedFeatures && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    ★
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Platform-specific content generators */}
          {activeTab === 'instagram' && (
            <InstagramContentGenerator
              onContentGenerated={(content, hashtags) => 
                handleContentGenerated(content, { hashtags })}
              initialPrompt={prompt}
            />
          )}
          
          {activeTab === 'twitter' && (
            <TwitterContentGenerator
              onContentGenerated={(content, hashtags) => 
                handleContentGenerated(content, { hashtags })}
              initialPrompt={prompt}
            />
          )}
          
          {activeTab === 'facebook' && (
            <FacebookContentGenerator
              onContentGenerated={(content, callToAction) => 
                handleContentGenerated(content, { callToAction })}
              initialPrompt={prompt}
            />
          )}
          
          {activeTab === 'linkedin' && (
            <LinkedInContentGenerator
              onContentGenerated={(content) => handleContentGenerated(content)}
              initialPrompt={prompt}
            />
          )}
          
          {activeTab === 'tiktok' && (
            <TikTokContentGenerator
              onContentGenerated={(caption, videoIdea, hashtags) => 
                handleContentGenerated(caption, { videoIdea, hashtags })}
              initialPrompt={prompt}
            />
          )}
          
          {activeTab === 'youtube' && (
            <YoutubeContentGenerator
              onContentGenerated={(title, description) => 
                handleContentGenerated(title, { description })}
              initialPrompt={prompt}
            />
          )}
          
          {activeTab === 'mastodon' && canUseAdvancedFeatures && (
            <MastodonContentGenerator
              onContentGenerated={(content, hashtags) => 
                handleContentGenerated(content, { hashtags })}
              initialPrompt={prompt}
            />
          )}
          
          {activeTab === 'reddit' && canUseAdvancedFeatures && (
            <RedditContentGenerator
              onContentGenerated={(title, text) => 
                handleContentGenerated(title, { text })}
              initialPrompt={prompt}
            />
          )}
        </TabsContent>
        
        <TabsContent value="specialized" className="p-1">
          <div className="grid grid-cols-2 gap-2 mb-6">
            {specializedContentTabs.map((tab) => (
              <button
                key={tab.id}
                className={`p-2 border rounded flex flex-col items-center justify-center text-center transition-colors ${
                  activeTab === tab.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                } ${tab.id === 'repurposing' && !canUseAdvancedFeatures ? 'opacity-60' : ''}`}
                onClick={() => 
                  (tab.id !== 'repurposing' || canUseAdvancedFeatures) && 
                  setActiveTab(tab.id)
                }
                disabled={tab.id === 'repurposing' && !canUseAdvancedFeatures}
              >
                <span className="text-2xl mb-1">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
                {tab.id === 'repurposing' && !canUseAdvancedFeatures && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    ★
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Specialized content generators */}
          {activeTab === 'caption' && (
            <CaptionGenerator
              onCaptionGenerated={(caption, hashtags, altText) => 
                handleContentGenerated(caption, { type: 'caption', hashtags, altText })}
              initialImageDescription={prompt}
            />
          )}
          
          {activeTab === 'video-description' && (
            <VideoDescriptionGenerator
              onDescriptionGenerated={(description, keywords, timestamps) => 
                handleContentGenerated(description, { type: 'videoDescription', keywords, timestamps })}
              initialTitle={prompt}
            />
          )}
          
          {activeTab === 'hashtags' && (
            <HashtagOptimizerComponent
              onHashtagsGenerated={(hashtags, categories) => 
                handleContentGenerated(hashtags.map(tag => `#${tag}`).join(' '), { type: 'hashtags', hashtags, categories })}
              initialContent={prompt}
            />
          )}
          
          {activeTab === 'repurposing' && canUseAdvancedFeatures && (
            <ContentRepurposingTool
              onRepurposedContent={(contentMap, mediaRecommendations) => 
                handleContentGenerated(
                  Object.entries(contentMap).map(([platform, content]) => `${platform}: ${content}`).join('\n'),
                  { type: 'repurposed', contentMap, mediaRecommendations }
                )}
              initialContent={prompt}
            />
          )}
        </TabsContent>
        
        <TabsContent value="enterprise" className="p-1">
          {canUseEnterpriseFeatures ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {enterpriseTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`p-2 border rounded flex flex-col items-center justify-center text-center transition-colors ${
                      activeTab === tab.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="text-2xl mb-1">{tab.icon}</span>
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Enterprise-tier content generators */}
              {activeTab === 'seo' && (
                <SEOContentGenerator
                  onContentGenerated={(content, metadata) => 
                    handleContentGenerated(content, metadata)}
                  initialKeywords={prompt}
                />
              )}
              
              {activeTab === 'campaign' && (
                <MultiPlatformCampaignGenerator
                  onCampaignGenerated={(campaignContent) => 
                    handleContentGenerated(JSON.stringify(campaignContent), { type: 'campaign', campaign: campaignContent })}
                  initialTopic={prompt}
                />
              )}
              
              {activeTab === 'calendar' && (
                <ContentCalendarGenerator
                  onCalendarGenerated={(calendar) => 
                    handleContentGenerated('Content Calendar Generated', { type: 'calendar', calendar })}
                  initialTopic={prompt}
                />
              )}
              
              {activeTab === 'brand-voice' && (
                <BrandVoiceConsistencyTool
                  onContentGenerated={(content: any, metadata: any) =>
                    handleContentGenerated(content, metadata)}
                  initialContent={prompt}
                />
              )}
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-6 text-center">
              <h3 className="font-medium text-amber-800 mb-2">Enterprise Features</h3>
              <p className="text-amber-700 mb-4">
                Advanced content generation features are available with our Enterprise subscription.
              </p>
              <p className="text-sm text-amber-600 mb-6">
                Access SEO content generation, multi-platform campaign planning, content calendar generation,
                and brand voice consistency tools.
              </p>
              <Button
                variant="primary"
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => window.location.href = '/dashboard/settings/billing'}
              >
                Upgrade to Enterprise
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<PenTool className="h-4 w-4" />}
        featureTier={isFeatureAvailable ? undefined : 'creator'}
        {...buttonProps}
      >
        {children || 'Generate Content'}
      </Button>

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleClose}
        title="AI Content Generator"
        size="xl"
      >
        <div className="flex justify-between mb-4">
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 text-sm rounded ${viewMode === 'simple' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('simple')}
            >
              Simple Mode
            </button>
            <button
              className={`px-3 py-1 text-sm rounded ${viewMode === 'advanced' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('advanced')}
            >
              Advanced Mode
            </button>
          </div>
        </div>
        
        {viewMode === 'simple' ? (
          renderTabs()
        ) : (
          renderPlatformSpecificGenerator()
        )}
      </Dialog>
    </>
  );
};

export default ContentGenerationButton; 