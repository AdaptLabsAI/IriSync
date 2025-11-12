import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { useToast } from '../../ui/use-toast';
import { SocialPlatform } from '../../../lib/models/SocialAccount';

interface CaptionGeneratorProps {
  onCaptionGenerated: (caption: string, hashtags: string[], altText?: string) => void;
  initialImageDescription?: string;
  imageUrl?: string;
}

/**
 * AI-powered image caption generator for social media
 * Creates engaging captions for images with optional hashtags and alt text
 */
export default function CaptionGenerator({ 
  onCaptionGenerated,
  initialImageDescription = '',
  imageUrl = ''
}: CaptionGeneratorProps) {
  const { generateContent, suggestHashtags, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [imageDescription, setImageDescription] = useState(initialImageDescription);
  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.INSTAGRAM);
  const [tone, setTone] = useState<'casual' | 'professional' | 'humorous' | 'inspirational'>('casual');
  const [captionLength, setCaptionLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [generateAltText, setGenerateAltText] = useState(true);
  const [industry, setIndustry] = useState<'fashion' | 'food' | 'travel' | 'business' | 'lifestyle' | 'general'>('general');
  
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedAltText, setGeneratedAltText] = useState('');
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [hashtagsEnabled, setHashtagsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle caption generation
  const handleGenerateCaption = async () => {
    if (!imageDescription) {
      toast({
        title: "Missing information",
        description: "Please provide an image description"
      });
      return;
    }
    
    try {
      // Use generateContent with appropriate parameters
      const options = {
        imageDescription,
        tone,
        includeEmojis,
        includeHashtags,
        generateAltText,
        industry
      };
      
      const result = await generateContent('image-caption', platform, captionLength, options);
      
      if (result) {
        let caption = '';
        let altText = '';
        let hashtags: string[] = [];
        
        // Handle structured response format
        if (typeof result === 'object') {
          // Extract caption from object response
          if (result.caption) {
            caption = result.caption;
          } else if (result.content) {
            caption = result.content;
          }
          
          // Extract alt text if available
          if (result.altText) {
            altText = result.altText;
          }
          
          // Extract hashtags if available
          if (result.hashtags && Array.isArray(result.hashtags)) {
            hashtags = result.hashtags;
          }
        } else if (typeof result === 'string') {
          // Handle simple string response
          caption = result;
        }
        
        setGeneratedCaption(caption);
        
        // If alt text was requested but not provided in response, generate it separately
        if (generateAltText && !altText) {
          try {
            const altTextResult = await generateContent('alt-text', platform, 'medium', { imageDescription });
            
            if (altTextResult) {
              if (typeof altTextResult === 'object' && altTextResult.altText) {
                setGeneratedAltText(altTextResult.altText);
              } else if (typeof altTextResult === 'string') {
                setGeneratedAltText(altTextResult);
              }
            }
          } catch (altErr) {
            console.error('Error generating alt text:', altErr);
            // Create a basic alt text as fallback
            setGeneratedAltText(`Image showing ${imageDescription.substring(0, 100)}${imageDescription.length > 100 ? '...' : ''}`);
          }
        } else if (altText) {
          setGeneratedAltText(altText);
        }
        
        // If hashtags were requested but not provided in response, generate them separately
        if (includeHashtags && hashtags.length === 0) {
          try {
            const hashtagResult = await suggestHashtags(caption || imageDescription, platform);
            
            if (hashtagResult) {
              if (hashtagResult.hashtags && Array.isArray(hashtagResult.hashtags)) {
                setSuggestedHashtags(hashtagResult.hashtags);
              } else if (Array.isArray(hashtagResult)) {
                setSuggestedHashtags(hashtagResult);
              } else if (typeof hashtagResult === 'string') {
                const extractedTags = hashtagResult
                  .split(/[\s,#]+/)
                  .filter(tag => tag && tag.trim().length > 0);
                setSuggestedHashtags(extractedTags);
              }
            }
          } catch (hashtagErr) {
            console.error('Error generating hashtags:', hashtagErr);
            // Generate simple hashtags based on the image description
            const simpleHashtags = imageDescription
              .toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 4)
              .map(word => word.replace(/[^\w]/g, ''))
              .filter(word => word.length > 4)
              .slice(0, 5);
            
            setSuggestedHashtags(simpleHashtags);
          }
        } else if (hashtags.length > 0) {
          setSuggestedHashtags(hashtags);
        }
        
        toast({
          title: "Caption generated",
          description: "Your image caption has been created"
        });
      }
    } catch (err) {
      console.error('Error generating caption:', err);
      toast({
        title: "Generation failed",
        description: error ? error.message : "Failed to generate caption. Please try again."
      });
    }
  };
  
  // Handle hashtag generation
  const handleGenerateHashtags = async (content: string) => {
    if (!content) return;
    
    try {
      const result = await suggestHashtags(content, platform);
      
      if (result) {
        // Handle different response formats
        if (result.hashtags && Array.isArray(result.hashtags)) {
          setSuggestedHashtags(result.hashtags);
        } else if (Array.isArray(result)) {
          setSuggestedHashtags(result);
        } else {
          // If we get a string or other format, try to parse hashtags
          const extractedTags = result.toString()
            .split(/[\s,#]+/)
            .filter((tag: string) => tag !== '');
          setSuggestedHashtags(extractedTags);
        }
      }
    } catch (err) {
      console.error('Error generating hashtags:', err);
    }
  };
  
  // Generate alt text separately if not included in the initial generation
  const handleGenerateAltText = async () => {
    if (!imageDescription) return;
    
    try {
      const result = await generateContent('alt-text', platform, 'medium', {
        imageDescription
      });
      
      if (result) {
        if (typeof result === 'object' && result.altText) {
          setGeneratedAltText(result.altText);
        } else {
          setGeneratedAltText(result.toString());
        }
        
        toast({
          title: "Alt text generated",
          description: "Accessibility alt text has been created for your image"
        });
      }
    } catch (err) {
      console.error('Error generating alt text:', err);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateCaption();
  };
  
  // Handle content selection
  const handleUseCaption = () => {
    onCaptionGenerated(
      generatedCaption, 
      suggestedHashtags, 
      generateAltText ? generatedAltText : undefined
    );
  };
  
  // Get caption length description
  const getCaptionLengthDescription = () => {
    switch (captionLength) {
      case 'short': return 'Brief caption (1-2 sentences)';
      case 'medium': return 'Standard caption (3-4 sentences)';
      case 'long': return 'Detailed caption (5+ sentences)';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Image Caption Generator</h2>
      
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
      
      {/* Simplified tabs navigation */}
      <div className="mb-6">
        <div className="border-b mb-4">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 ${activeTab === 'create' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
            >
              Create Caption
            </button>
            <button 
              onClick={() => canUseAdvancedFeatures && setActiveTab('advanced')}
              disabled={!canUseAdvancedFeatures}
              className={`px-4 py-2 ${activeTab === 'advanced' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'} ${!canUseAdvancedFeatures ? 'opacity-50 cursor-not-allowed' : ''} relative`}
            >
              Advanced Options
              {!canUseAdvancedFeatures && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  ★
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Create caption tab */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmit} className="mb-6">
            {imageUrl && (
              <div className="mb-4">
                <p className="block text-gray-700 mb-2">Image Preview</p>
                <div className="border rounded p-2 max-w-xs">
                  <img 
                    src={imageUrl} 
                    alt="Image to caption" 
                    className="max-h-48 max-w-full mx-auto object-contain"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="imageDescription">
                Image Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="imageDescription"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Describe the image in detail (people, objects, scene, colors, mood, etc.)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The more details you provide about your image, the better the caption will be.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="platform">
                  Platform
                </label>
                <select
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
                  className="w-full p-2 border rounded"
                >
                  <option value={SocialPlatform.INSTAGRAM}>Instagram</option>
                  <option value={SocialPlatform.FACEBOOK}>Facebook</option>
                  <option value={SocialPlatform.TWITTER}>Twitter</option>
                  <option value={SocialPlatform.LINKEDIN}>LinkedIn</option>
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
                  <option value="humorous">Humorous</option>
                  <option value="inspirational">Inspirational</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="captionLength">
                  Length
                </label>
                <select
                  id="captionLength"
                  value={captionLength}
                  onChange={(e) => setCaptionLength(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {getCaptionLengthDescription()}
                </p>
              </div>
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
                    checked={includeHashtags}
                    onChange={(e) => setIncludeHashtags(e.target.checked)}
                    className="mr-2"
                    disabled={!hashtagsEnabled}
                  />
                  <span className={`text-gray-700 ${!hashtagsEnabled ? 'opacity-50' : ''}`}>
                    Include Hashtags
                  </span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateAltText}
                    onChange={(e) => setGenerateAltText(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Generate Alt Text</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !imageDescription}
            >
              {loading ? 'Generating...' : 'Generate Caption'}
            </button>
          </form>
        )}
        
        {/* Advanced options tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="industry">
                  Industry/Niche
                </label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="general">General</option>
                  <option value="fashion">Fashion</option>
                  <option value="food">Food</option>
                  <option value="travel">Travel</option>
                  <option value="business">Business</option>
                  <option value="lifestyle">Lifestyle</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Specialized captions for specific industries
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 border rounded p-4">
              <h3 className="font-medium mb-2">Caption Style Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Platform Best Practices</h4>
                  {platform === SocialPlatform.INSTAGRAM && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Keep main message in first 125 characters</li>
                      <li>Use line breaks for readability</li>
                      <li>Use 10-15 relevant hashtags</li>
                      <li>Ask engaging questions</li>
                    </ul>
                  )}
                  {platform === SocialPlatform.FACEBOOK && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Shorter captions perform better (40-80 words)</li>
                      <li>Use 1-2 hashtags maximum</li>
                      <li>Include a clear call to action</li>
                      <li>Consider using emotion-triggering language</li>
                    </ul>
                  )}
                  {platform === SocialPlatform.TWITTER && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Keep under 280 characters</li>
                      <li>Use 1-2 relevant hashtags</li>
                      <li>Be concise and direct</li>
                      <li>Use strong verbs and active voice</li>
                    </ul>
                  )}
                  {platform === SocialPlatform.LINKEDIN && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Keep message clear and focused</li>
                      <li>Use descriptive language</li>
                      <li>Include relevant context</li>
                      <li>Consider your audience's interests</li>
                    </ul>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Tone Guidelines</h4>
                  {tone === 'casual' && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Conversational language</li>
                      <li>Personal pronouns (I, we, you)</li>
                      <li>Contractions and colloquialisms</li>
                      <li>Friendly and approachable</li>
                    </ul>
                  )}
                  {tone === 'professional' && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Formal language</li>
                      <li>Industry-specific terminology</li>
                      <li>Factual information</li>
                      <li>Authoritative voice</li>
                    </ul>
                  )}
                  {tone === 'humorous' && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Playful language</li>
                      <li>Wordplay and puns</li>
                      <li>Pop culture references</li>
                      <li>Light-hearted approach</li>
                    </ul>
                  )}
                  {tone === 'inspirational' && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                      <li>Motivational language</li>
                      <li>Value-based messaging</li>
                      <li>Emotional triggers</li>
                      <li>Call to action</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setActiveTab('create');
                  handleGenerateCaption();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled || !imageDescription}
              >
                {loading ? 'Generating...' : 'Apply & Generate'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Results section */}
      {generatedCaption && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Generated Caption</h3>
            <button
              onClick={handleUseCaption}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Use This Caption
            </button>
          </div>
          
          <div className="bg-gray-50 border rounded p-4 mb-4">
            <p className="whitespace-pre-line">{generatedCaption}</p>
          </div>
          
          {suggestedHashtags.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Suggested Hashtags</h4>
              <div className="flex flex-wrap gap-2">
                {suggestedHashtags.map((tag, index) => (
                  <span key={index} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {generatedAltText && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Generated Alt Text</h4>
              <div className="bg-gray-50 border rounded p-3">
                <p className="text-gray-700 text-sm">{generatedAltText}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Caption Writing Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Start with your most important message in the first sentence</li>
          <li>Create a clear call-to-action if appropriate</li>
          <li>Ask questions to encourage engagement</li>
          <li>Include relevant hashtags to increase discoverability</li>
          <li>Add alt text to make your content accessible to everyone</li>
        </ul>
      </div>
    </div>
  );
} 