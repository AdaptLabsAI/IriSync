import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { useToast } from '../../ui/use-toast';

interface ContentRepurposingToolProps {
  onRepurposedContent: (
    contentMap: Record<SocialPlatform, string>,
    mediaRecommendations?: Record<SocialPlatform, string>
  ) => void;
  initialContent?: string;
  sourcePlatform?: SocialPlatform;
}

/**
 * Advanced content repurposing tool to adapt content for multiple platforms
 * Reformats and optimizes content for each platform's specific requirements
 */
export default function ContentRepurposingTool({ 
  onRepurposedContent,
  initialContent = '',
  sourcePlatform = SocialPlatform.TWITTER
}: ContentRepurposingToolProps) {
  const { generateContent, improveContent, repurposeContent, generateMediaRecommendations, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [originalPlatform, setOriginalPlatform] = useState<SocialPlatform>(sourcePlatform);
  const [targetPlatforms, setTargetPlatforms] = useState<SocialPlatform[]>([
    SocialPlatform.INSTAGRAM,
    SocialPlatform.TWITTER,
    SocialPlatform.TIKTOK,
    SocialPlatform.FACEBOOK
  ]);
  const [preserveTone, setPreserveTone] = useState(true);
  const [adaptFormat, setAdaptFormat] = useState(true);
  const [includeMediaRecommendations, setIncludeMediaRecommendations] = useState(true);
  const [contentStyle, setContentStyle] = useState<'casual' | 'professional' | 'entertaining' | 'informative'>('casual');
  
  const [generatedContent, setGeneratedContent] = useState<Record<SocialPlatform, string>>({} as Record<SocialPlatform, string>);
  const [mediaRecommendations, setMediaRecommendations] = useState<Record<SocialPlatform, string>>({} as Record<SocialPlatform, string>);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Toggle platform selection
  const togglePlatform = (platform: SocialPlatform) => {
    if (targetPlatforms.includes(platform)) {
      setTargetPlatforms(targetPlatforms.filter(p => p !== platform));
    } else {
      setTargetPlatforms([...targetPlatforms, platform]);
    }
  };
  
  // Handle content repurposing with proper API method
  const handleRepurposeContent = async () => {
    if (!originalContent) {
      toast({
        title: "Content required",
        description: "Please provide the original content to repurpose"
      });
      return;
    }
    
    if (targetPlatforms.length === 0) {
      toast({
        title: "Target platforms required",
        description: "Please select at least one target platform"
      });
      return;
    }
    
    try {
      // Use the dedicated repurposeContent method
      const result = await repurposeContent(
        originalContent, 
        originalPlatform, 
        targetPlatforms,
        { 
          preserveTone,
          adaptFormat,
          includeMediaRecommendations,
          contentStyle
        }
      );
      
      if (result) {
        // Extract repurposed content from the result
        if (result.repurposedContent) {
          setGeneratedContent(result.repurposedContent);
          setSelectedPlatform(targetPlatforms[0]);
        } else {
          // Fallback if result format is different
          const contentMap: Record<SocialPlatform, string> = {} as Record<SocialPlatform, string>;
          
          // Handle different potential response formats
          if (typeof result === 'object' && !Array.isArray(result)) {
            Object.keys(result).forEach(key => {
              if (targetPlatforms.includes(key as SocialPlatform) && typeof result[key] === 'string') {
                contentMap[key as SocialPlatform] = result[key];
              }
            });
          }
          
          // Only set the result if we extracted some content
          if (Object.keys(contentMap).length > 0) {
            setGeneratedContent(contentMap);
            setSelectedPlatform(targetPlatforms[0]);
          } else {
            // If we couldn't extract proper content, fall back to individual platform processing
            await fallbackRepurposeContent();
            return;
          }
        }
        
        // Handle media recommendations
        if (includeMediaRecommendations && canUseAdvancedFeatures) {
          if (result.mediaRecommendations) {
            setMediaRecommendations(result.mediaRecommendations);
          } else {
            // If no media recommendations in the response, try to get them separately
            await generateMediaRecommendationsForPlatforms();
          }
        }
        
        toast({
          title: "Content repurposed",
          description: `Repurposed for ${targetPlatforms.length} platform(s)`
        });
      }
    } catch (err) {
      console.error('Error repurposing content:', err);
      toast({
        title: "Repurposing failed",
        description: error ? error.message : "Failed to repurpose content. Please try again."
      });
      
      // Try the fallback approach
      await fallbackRepurposeContent();
    }
  };
  
  // Fallback method that processes each platform in sequence
  const fallbackRepurposeContent = async () => {
    try {
      // Create a mapping of platform to repurposed content
      const contentMap: Record<SocialPlatform, string> = {} as Record<SocialPlatform, string>;
      
      for (const platform of targetPlatforms) {
        // Use improveContent as a fallback strategy
        const result = await improveContent(originalContent, platform);
        
        if (result && (result.content || typeof result === 'string')) {
          contentMap[platform] = result.content || result.toString();
        } else {
          // Last resort placeholder
          contentMap[platform] = `${originalContent} [Adapted for ${getPlatformName(platform)}]`;
        }
      }
      
      setGeneratedContent(contentMap);
      setSelectedPlatform(targetPlatforms[0]);
      
      // Generate media recommendations as needed
      if (includeMediaRecommendations && canUseAdvancedFeatures) {
        await generateMediaRecommendationsForPlatforms();
      }
      
      toast({
        title: "Content repurposed",
        description: `Repurposed for ${targetPlatforms.length} platform(s) using alternative method`
      });
    } catch (err) {
      console.error('Error in fallback repurposing:', err);
      toast({
        title: "Repurposing failed",
        description: "Unable to repurpose content. Using basic adaptation."
      });
      
      // Create basic repurposed content as last resort
      const basicContentMap: Record<SocialPlatform, string> = {} as Record<SocialPlatform, string>;
      for (const platform of targetPlatforms) {
        basicContentMap[platform] = createBasicRepurposedContent(originalContent, platform);
      }
      
      setGeneratedContent(basicContentMap);
      setSelectedPlatform(targetPlatforms[0]);
    }
  };
  
  // Generate media recommendations in a separate call
  const generateMediaRecommendationsForPlatforms = async () => {
    try {
      const result = await generateMediaRecommendations(originalContent, targetPlatforms);
      
      if (result && result.recommendations) {
        setMediaRecommendations(result.recommendations);
      } else {
        // Create basic recommendations if API doesn't return valid data
        const basicRecommendations: Record<SocialPlatform, string> = {} as Record<SocialPlatform, string>;
        for (const platform of targetPlatforms) {
          basicRecommendations[platform] = getDefaultMediaRecommendation(platform);
        }
        setMediaRecommendations(basicRecommendations);
      }
    } catch (err) {
      console.error('Error generating media recommendations:', err);
      // Create default recommendations for each platform
      const defaultRecommendations: Record<SocialPlatform, string> = {} as Record<SocialPlatform, string>;
      for (const platform of targetPlatforms) {
        defaultRecommendations[platform] = getDefaultMediaRecommendation(platform);
      }
      setMediaRecommendations(defaultRecommendations);
    }
  };
  
  // Default media recommendations as a fallback
  const getDefaultMediaRecommendation = (platform: SocialPlatform): string => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        return "Square image with vibrant colors and minimal text. Consider adding a lifestyle element.";
      case SocialPlatform.TIKTOK:
        return "Short vertical video showing the process or a quick demo with trending music.";
      case SocialPlatform.TWITTER:
        return "GIF or simple graphic that captures attention in a crowded feed.";
      case SocialPlatform.FACEBOOK:
        return "Image carousel showcasing multiple aspects or video with captions.";
      case SocialPlatform.LINKEDIN:
        return "Professional infographic or data visualization with your branding.";
      case SocialPlatform.YOUTUBE:
        return "Long-form tutorial video with clear sections and timestamps.";
      default:
        return "Visual content that aligns with your message and brand guidelines.";
    }
  };
  
  // Create basic repurposed content as a last resort
  const createBasicRepurposedContent = (content: string, platform: SocialPlatform): string => {
    // Platform-specific basic adaptations
    switch (platform) {
      case SocialPlatform.TWITTER:
        // Twitter: Truncate to 280 characters
        return content.length > 280 
          ? content.substring(0, 277) + '...'
          : content;
          
      case SocialPlatform.INSTAGRAM:
        // Instagram: Add some emojis and make more casual
        const emojis = ['✨', '📸', '🔥', '💯', '👉', '🙌'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        return `${randomEmoji} ${content}`;
        
      case SocialPlatform.LINKEDIN:
        // LinkedIn: Make more professional
        return `Professional insight: ${content}`;
        
      case SocialPlatform.FACEBOOK:
        // Facebook: Add a question to encourage engagement
        return `${content}\n\nWhat do you think about this?`;
        
      case SocialPlatform.TIKTOK:
        // TikTok: Make brief and catchy
        const firstSentence = content.split('.')[0];
        return firstSentence.length > 150
          ? firstSentence.substring(0, 147) + '...'
          : firstSentence;
          
      default:
        return content;
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRepurposeContent();
  };
  
  // Use repurposed content
  const handleUseContent = () => {
    onRepurposedContent(
      generatedContent,
      includeMediaRecommendations ? mediaRecommendations : undefined
    );
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
      case SocialPlatform.REDDIT: return '🔍';
      case SocialPlatform.MASTODON: return '🐘';
      default: return '📝';
    }
  };
  
  // Get platform display name
  const getPlatformName = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.INSTAGRAM: return 'Instagram';
      case SocialPlatform.TWITTER: return 'Twitter';
      case SocialPlatform.FACEBOOK: return 'Facebook';
      case SocialPlatform.TIKTOK: return 'TikTok';
      case SocialPlatform.LINKEDIN: return 'LinkedIn';
      case SocialPlatform.YOUTUBE: return 'YouTube';
      case SocialPlatform.PINTEREST: return 'Pinterest';
      case SocialPlatform.REDDIT: return 'Reddit';
      case SocialPlatform.MASTODON: return 'Mastodon';
      default: return 'General';
    }
  };
  
  // Get ideal content length for platform
  const getPlatformContentLength = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.TWITTER: return 'Ideal: 280 characters';
      case SocialPlatform.INSTAGRAM: return 'Ideal: 125-150 words';
      case SocialPlatform.FACEBOOK: return 'Ideal: 40-80 words';
      case SocialPlatform.TIKTOK: return 'Ideal: 150 characters';
      case SocialPlatform.LINKEDIN: return 'Ideal: 100-150 words';
      case SocialPlatform.YOUTUBE: return 'Ideal: 100-150 words';
      case SocialPlatform.PINTEREST: return 'Ideal: 100-200 characters';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Content Repurposing Tool</h2>
      
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
      
      {/* Simplified tabs navigation */}
      <div className="mb-6">
        <div className="border-b mb-4">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 ${activeTab === 'content' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
            >
              Content
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 ${activeTab === 'settings' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
            >
              Settings
            </button>
          </div>
        </div>
        
        {/* Content tab */}
        {activeTab === 'content' && (
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="originalContent">
                Original Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="originalContent"
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
                className="w-full p-2 border rounded"
                rows={5}
                placeholder="Paste your original content here..."
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="originalPlatform">
                  Source Platform
                </label>
                <select
                  id="originalPlatform"
                  value={originalPlatform}
                  onChange={(e) => setOriginalPlatform(e.target.value as SocialPlatform)}
                  className="w-full p-2 border rounded"
                >
                  <option value={SocialPlatform.TWITTER}>Twitter</option>
                  <option value={SocialPlatform.INSTAGRAM}>Instagram</option>
                  <option value={SocialPlatform.FACEBOOK}>Facebook</option>
                  <option value={SocialPlatform.TIKTOK}>TikTok</option>
                  <option value={SocialPlatform.LINKEDIN}>LinkedIn</option>
                  <option value={SocialPlatform.YOUTUBE}>YouTube</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="contentStyle">
                  Content Style
                </label>
                <select
                  id="contentStyle"
                  value={contentStyle}
                  onChange={(e) => setContentStyle(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                  <option value="entertaining">Entertaining</option>
                  <option value="informative">Informative</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Target Platforms <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  SocialPlatform.INSTAGRAM,
                  SocialPlatform.TWITTER,
                  SocialPlatform.FACEBOOK,
                  SocialPlatform.TIKTOK,
                  SocialPlatform.LINKEDIN,
                  SocialPlatform.YOUTUBE
                ].map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    className={`p-2 text-center border rounded flex items-center justify-center gap-2 ${
                      targetPlatforms.includes(platform) 
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
                Select target platforms to repurpose your content for
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preserveTone}
                    onChange={(e) => setPreserveTone(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Preserve Tone</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={adaptFormat}
                    onChange={(e) => setAdaptFormat(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Adapt Format</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeMediaRecommendations}
                    onChange={(e) => setIncludeMediaRecommendations(e.target.checked)}
                    className="mr-2"
                    disabled={!canUseAdvancedFeatures}
                  />
                  <span className={`text-gray-700 ${!canUseAdvancedFeatures ? 'opacity-50' : ''}`}>
                    Include Media Recommendations
                    {!canUseAdvancedFeatures && (
                      <span className="ml-1 text-amber-500 text-xs">★</span>
                    )}
                  </span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !originalContent || targetPlatforms.length === 0}
            >
              {loading ? 'Repurposing...' : 'Repurpose Content'}
            </button>
          </form>
        )}
        
        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <p className="text-gray-600">
              Configure advanced settings for content repurposing:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <h3 className="font-medium mb-2">Platform Preferences</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Set specific preferences for each platform
                </p>
                
                {Object.values(SocialPlatform).filter(platform => 
                  typeof platform === 'string' && 
                  targetPlatforms.includes(platform as SocialPlatform)
                ).map((platform) => (
                  <div key={platform} className="mb-3">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <span>{getPlatformIcon(platform as SocialPlatform)}</span>
                      <span>{getPlatformName(platform as SocialPlatform)}</span>
                    </h4>
                    <p className="text-xs text-gray-500">
                      {getPlatformContentLength(platform as SocialPlatform)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border rounded p-4">
                <h3 className="font-medium mb-2">Advanced Features</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Additional capabilities to enhance your repurposed content
                </p>
                
                {canUseAdvancedFeatures ? (
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="hashtagRecommendations" 
                        className="mr-2"
                        checked={true}
                        disabled
                      />
                      <label htmlFor="hashtagRecommendations" className="text-sm">
                        Platform-specific hashtag recommendations
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="audienceAnalysis" 
                        className="mr-2"
                        checked={true}
                        disabled
                      />
                      <label htmlFor="audienceAnalysis" className="text-sm">
                        Audience-targeted optimizations
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="trendAnalysis" 
                        className="mr-2"
                        checked={true}
                        disabled
                      />
                      <label htmlFor="trendAnalysis" className="text-sm">
                        Trend analysis for improved reach
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 p-3 rounded border border-amber-200 text-sm text-amber-800">
                    Advanced features available on Influencer and Enterprise plans
                    <button
                      className="block mt-2 px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 text-xs"
                      onClick={() => window.location.href = '/dashboard/settings/billing'}
                    >
                      Upgrade Plan
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setActiveTab('content')}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Back to Content
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Results section */}
      {Object.keys(generatedContent).length > 0 && (
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Repurposed Content</h3>
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-[#00CC44] text-white rounded hover:bg-[#00AA33]"
            >
              Use Repurposed Content
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(generatedContent).map((platform) => (
              <button
                key={platform}
                className={`px-3 py-1 flex items-center gap-1 border rounded ${
                  selectedPlatform === platform 
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
                onClick={() => setSelectedPlatform(platform as SocialPlatform)}
              >
                <span>{getPlatformIcon(platform as SocialPlatform)}</span>
                <span>{getPlatformName(platform as SocialPlatform)}</span>
              </button>
            ))}
          </div>
          
          {selectedPlatform && (
            <div className="space-y-4">
              <div className="border rounded p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-800">{getPlatformName(selectedPlatform)}</h4>
                  <span className="text-xs text-gray-500">{getPlatformContentLength(selectedPlatform)}</span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <pre className="whitespace-pre-wrap font-sans text-gray-800">
                    {generatedContent[selectedPlatform]}
                  </pre>
                </div>
                
                {includeMediaRecommendations && mediaRecommendations[selectedPlatform] && (
                  <div className="mt-3 text-sm bg-indigo-50 p-3 rounded border border-indigo-100">
                    <span className="font-medium text-indigo-700">Media Recommendation:</span>
                    <p className="text-gray-700 mt-1">{mediaRecommendations[selectedPlatform]}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Content Repurposing Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Adjust your content format and length for each platform's requirements</li>
          <li>Consider the audience expectations and behavior on each platform</li>
          <li>Maintain brand voice consistency while adapting to platform norms</li>
          <li>Use platform-specific features like hashtags, mentions, or formatting</li>
          <li>Customize media to suit each platform's optimal dimensions and style</li>
        </ul>
      </div>
    </div>
  );
} 