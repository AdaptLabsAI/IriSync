import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface CampaignContent {
  platform: SocialPlatform;
  content: string;
  type: string;
  timing: string;
  hashtags?: string[];
  mediaPrompt?: string;
}

interface Campaign {
  title: string;
  description: string;
  goal: string;
  targetAudience: string;
  platforms: SocialPlatform[];
  schedule: string;
  contents: CampaignContent[];
}

interface MultiPlatformCampaignGeneratorProps {
  onCampaignGenerated: (campaign: Campaign) => void;
  initialTopic?: string;
}

/**
 * Enterprise-tier multi-platform campaign generator
 * Creates coordinated content campaigns across multiple platforms with scheduling
 */
export default function MultiPlatformCampaignGenerator({ 
  onCampaignGenerated,
  initialTopic = ''
}: MultiPlatformCampaignGeneratorProps) {
  const { generateContent, generateCampaign, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [topic, setTopic] = useState(initialTopic);
  const [campaignType, setCampaignType] = useState<'product-launch' | 'event' | 'content-series' | 'promotion'>('product-launch');
  const [campaignLength, setCampaignLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    SocialPlatform.INSTAGRAM,
    SocialPlatform.TWITTER,
    SocialPlatform.FACEBOOK
  ]);
  const [goal, setGoal] = useState<'engagement' | 'conversion' | 'awareness' | 'traffic'>('engagement');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'energetic' | 'inspirational'>('professional');
  
  const [generatedCampaign, setGeneratedCampaign] = useState<Campaign | null>(null);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'preview'>('create');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  
  const userTier = subscription?.tier || 'creator';
  const canUseEnterpriseFeatures = userTier === 'enterprise';
  
  // Toggle platform selection
  const togglePlatform = (platform: SocialPlatform) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };
  
  // Handle campaign generation
  const handleGenerateCampaign = async () => {
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please provide a campaign topic"
      });
      return;
    }
    
    if (platforms.length === 0) {
      toast({
        title: "Platforms required",
        description: "Please select at least one platform"
      });
      return;
    }
    
    if (!canUseEnterpriseFeatures) {
      toast({
        title: "Enterprise feature",
        description: "Multi-platform campaign generation requires an Enterprise plan"
      });
      return;
    }
    
    try {
      const result = await generateCampaign(topic, campaignType, platforms, {
        goal,
        tone,
        targetAudience: targetAudience || undefined,
        campaignLength
      });
      
      if (result) {
        // Process API response into Campaign format
        const campaignData: Campaign = {
          title: result.topic || topic,
          description: result.overallStrategy?.description || `${campaignType} campaign for ${topic}`,
          goal: goal,
          targetAudience: targetAudience || result.audienceInsights?.demographics || 'General audience',
          platforms: platforms,
          schedule: result.overallStrategy?.timeline || getCampaignLengthDescription(),
          contents: []
        };
        
        // Extract platform-specific content
        if (result.platforms) {
          platforms.forEach(platform => {
            const platformData = result.platforms[platform];
            
            if (platformData) {
              // Extract post ideas and convert to CampaignContent
              const postIdeas = platformData.postIdeas || [];
              const hashtags = platformData.hashtags || [];
              
              postIdeas.forEach((idea: string, index: number) => {
                campaignData.contents.push({
                  platform: platform,
                  content: idea,
                  type: platformData.contentTypes?.[index % (platformData.contentTypes?.length || 1)] || 'Post',
                  timing: platformData.postingSchedule || 'Best time for platform',
                  hashtags: hashtags,
                  mediaPrompt: `Create ${platform} content for: ${idea}`
                });
              });
            }
          });
        }
        
        // If no contents were extracted, create basic placeholder content
        if (campaignData.contents.length === 0) {
          platforms.forEach(platform => {
            campaignData.contents.push({
              platform: platform,
              content: `${topic} content for ${getPlatformName(platform)}`,
              type: 'Post',
              timing: 'Optimal time based on platform analytics',
              hashtags: [`${campaignType}`, `${topic.replace(/\s+/g, '')}`]
            });
          });
        }
        
        setGeneratedCampaign(campaignData);
        setSelectedPlatform(platforms[0]);
        setActiveTab('preview');
        
        toast({
          title: "Campaign generated",
          description: `Generated ${campaignLength} campaign for ${platforms.length} platforms`,
        });
      }
    } catch (err) {
      console.error('Error generating campaign:', err);
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate campaign. Please try again."
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateCampaign();
  };
  
  // Handle campaign selection
  const handleUseCampaign = () => {
    if (generatedCampaign) {
      onCampaignGenerated(generatedCampaign);
    }
  };
  
  // Get campaign length description
  const getCampaignLengthDescription = () => {
    switch (campaignLength) {
      case 'short': return '1 week (3-5 posts)';
      case 'medium': return '2 weeks (6-10 posts)';
      case 'long': return '4+ weeks (12+ posts)';
      default: return '';
    }
  };
  
  // Get campaign type description
  const getCampaignTypeDescription = () => {
    switch (campaignType) {
      case 'product-launch': return 'Launch a new product or service';
      case 'event': return 'Promote an upcoming event';
      case 'content-series': return 'Create a series of related content';
      case 'promotion': return 'Run a special promotion or sale';
      default: return '';
    }
  };
  
  // Get goal description
  const getGoalDescription = () => {
    switch (goal) {
      case 'engagement': return 'Maximize likes, comments, and shares';
      case 'conversion': return 'Drive sales, sign-ups, or downloads';
      case 'awareness': return 'Increase brand or product visibility';
      case 'traffic': return 'Drive traffic to your website';
      default: return '';
    }
  };
  
  // Get platform icon
  const getPlatformIcon = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM: return '📸';
      case SocialPlatform.TWITTER: return '🐦';
      case SocialPlatform.FACEBOOK: return '👍';
      case SocialPlatform.TIKTOK: return '📱';
      case SocialPlatform.LINKEDIN: return '💼';
      case SocialPlatform.YOUTUBE: return '▶️';
      case SocialPlatform.PINTEREST: return '📌';
      default: return '📝';
    }
  };
  
  // Get platform name
  const getPlatformName = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM: return 'Instagram';
      case SocialPlatform.TWITTER: return 'Twitter';
      case SocialPlatform.FACEBOOK: return 'Facebook';
      case SocialPlatform.TIKTOK: return 'TikTok';
      case SocialPlatform.LINKEDIN: return 'LinkedIn';
      case SocialPlatform.YOUTUBE: return 'YouTube';
      case SocialPlatform.PINTEREST: return 'Pinterest';
      default: return platform;
    }
  };
  
  // Check if enterprise features are available
  if (!canUseEnterpriseFeatures) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Multi-Platform Campaign Generator</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded p-6 text-center">
          <h3 className="font-medium text-amber-800 mb-2">Enterprise Feature</h3>
          <p className="text-amber-700 mb-4">
            Multi-platform campaign generation is available with our Enterprise subscription.
          </p>
          <p className="text-sm text-amber-600 mb-6">
            Create comprehensive campaigns across multiple platforms with coordinated messaging,
            scheduling recommendations, and platform-specific content optimization.
          </p>
          <button
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
            onClick={() => window.location.href = '/dashboard/settings/billing'}
          >
            Upgrade to Enterprise
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Multi-Platform Campaign Generator</h2>
      
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
      
      <Tabs
        defaultValue="create"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'create' | 'preview')}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedCampaign}>
            Preview Campaign
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="topic">
                Campaign Topic <span className="text-red-500">*</span>
              </label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2 border rounded"
                rows={2}
                placeholder="What is your campaign about? (e.g., Summer product launch, Holiday promotion)"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="campaignType">
                  Campaign Type
                </label>
                <select
                  id="campaignType"
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value as any)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="product-launch">Product Launch</option>
                  <option value="event">Event Promotion</option>
                  <option value="content-series">Content Series</option>
                  <option value="promotion">Special Promotion</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getCampaignTypeDescription()}</p>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="campaignLength">
                  Campaign Length
                </label>
                <select
                  id="campaignLength"
                  value={campaignLength}
                  onChange={(e) => setCampaignLength(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getCampaignLengthDescription()}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Target Platforms <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  SocialPlatform.INSTAGRAM,
                  SocialPlatform.TWITTER,
                  SocialPlatform.FACEBOOK,
                  SocialPlatform.TIKTOK,
                  SocialPlatform.LINKEDIN,
                  SocialPlatform.YOUTUBE,
                  SocialPlatform.PINTEREST
                ].map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    className={`p-2 text-center border rounded flex items-center justify-center gap-2 ${
                      platforms.includes(platform) 
                        ? 'bg-indigo-100 border-indigo-300' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => togglePlatform(platform)}
                  >
                    <span>{getPlatformIcon(platform)}</span>
                    <span>{getPlatformName(platform)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select at least one platform for your campaign
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="goal">
                  Campaign Goal
                </label>
                <select
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="engagement">Engagement</option>
                  <option value="conversion">Conversion</option>
                  <option value="awareness">Brand Awareness</option>
                  <option value="traffic">Website Traffic</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getGoalDescription()}</p>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="tone">
                  Content Tone
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
                  <option value="inspirational">Inspirational</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="targetAudience">
                Target Audience (Optional)
              </label>
              <textarea
                id="targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full p-2 border rounded"
                rows={2}
                placeholder="Describe your target audience (e.g., Marketing professionals aged 25-45, Small business owners in the tech industry)"
              />
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !topic || platforms.length === 0}
            >
              {loading ? 'Generating...' : 'Generate Campaign'}
            </button>
          </form>
        </TabsContent>

        <TabsContent value="preview">
          {generatedCampaign && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded p-4">
                <h3 className="font-semibold text-lg text-indigo-800 mb-2">{generatedCampaign.title}</h3>
                <p className="text-gray-700 mb-4">{generatedCampaign.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Goal</h4>
                    <p className="text-gray-600">{generatedCampaign.goal}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Target Audience</h4>
                    <p className="text-gray-600">{generatedCampaign.targetAudience}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Platforms</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {generatedCampaign.platforms.map((platform) => (
                      <span key={platform} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">
                        {getPlatformIcon(platform)} {getPlatformName(platform)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Schedule</h4>
                  <p className="text-gray-600">{generatedCampaign.schedule}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Campaign Content</h3>
                
                <div className="flex border-b mb-4">
                  {generatedCampaign.platforms.map((platform) => (
                    <button
                      key={platform}
                      className={`px-3 py-2 ${selectedPlatform === platform ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-600'}`}
                      onClick={() => setSelectedPlatform(platform)}
                    >
                      <span className="mr-1">{getPlatformIcon(platform)}</span>
                      {getPlatformName(platform)}
                    </button>
                  ))}
                </div>
                
                {selectedPlatform && (
                  <div className="space-y-4">
                    {generatedCampaign.contents
                      .filter(content => content.platform === selectedPlatform)
                      .map((content, index) => (
                        <div key={index} className="border rounded p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-800">{content.type}</h4>
                            <span className="text-sm text-gray-500">{content.timing}</span>
                          </div>
                          <div className="bg-gray-50 p-3 rounded mb-3">
                            <p className="whitespace-pre-line text-gray-700">{content.content}</p>
                          </div>
                          {content.hashtags && content.hashtags.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">Hashtags:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {content.hashtags.map((tag, i) => (
                                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {content.mediaPrompt && (
                            <div>
                              <span className="text-xs text-gray-500">Media Suggestion:</span>
                              <p className="text-xs italic text-gray-600 mt-1">{content.mediaPrompt}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Edit Campaign
                </button>
                
                <button
                  onClick={handleUseCampaign}
                  className="px-3 py-1 bg-indigo-700 text-white rounded hover:bg-indigo-800"
                >
                  Use This Campaign
                </button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Campaign Best Practices:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Maintain consistent branding and messaging across all platforms</li>
          <li>Adapt content format to each platform's unique characteristics</li>
          <li>Stagger posts for optimal engagement across different times</li>
          <li>Include a mix of content types (educational, promotional, engaging)</li>
          <li>Measure performance across platforms to refine future campaigns</li>
        </ul>
      </div>
    </div>
  );
} 