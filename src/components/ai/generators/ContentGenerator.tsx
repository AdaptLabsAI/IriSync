import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';

interface ContentGeneratorProps {
  onContentGenerated: (content: string, hashtags: string[]) => void;
}

/**
 * Component to generate content using AI with token management
 */
export default function ContentGenerator({ onContentGenerated }: ContentGeneratorProps) {
  const { generateContent, suggestHashtags, loading, error } = useAIToolkit();
  
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.INSTAGRAM);
  const [contentType, setContentType] = useState('post');
  const [generatedContent, setGeneratedContent] = useState('');
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [hashtagsEnabled, setHashtagsEnabled] = useState(true);
  const [brandingNotification, setBrandingNotification] = useState<string | null>(null);
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!prompt || !platform) return;
    
    try {
      const result = await generateContent(prompt, platform, contentType);
      
      if (result) {
        setGeneratedContent(result.content);
        
        // Handle branding information
        if (result.branding) {
          if (result.branding.brandingAdded) {
            // Show user that branding was added
            setBrandingNotification('✨ IriSync hashtag automatically added for branding!');
            setTimeout(() => setBrandingNotification(null), 5000); // Clear after 5 seconds
          }
          
          // Use branded hashtags if available
          if (result.branding.hashtags && result.branding.hashtags.length > 0) {
            setSuggestedHashtags(result.branding.hashtags.map((tag: string) => `#${tag}`));
          }
        }
        
        // Fallback to legacy hashtag extraction if no branding info
        if (result.suggestedHashtags && result.suggestedHashtags.length > 0) {
          setSuggestedHashtags(result.suggestedHashtags);
        }
      }
    } catch (err) {
      console.error('Error generating content:', err);
    }
  };
  
  // Handle hashtag generation
  const handleGenerateHashtags = async () => {
    if (!generatedContent || !platform) return;
    
    try {
      const result = await suggestHashtags(generatedContent, platform, 10);
      
      if (result) {
        // Handle branding information for hashtags
        if (result.branding) {
          if (result.branding.brandingAdded) {
            setBrandingNotification('✨ IriSync hashtag automatically added to your hashtags!');
            setTimeout(() => setBrandingNotification(null), 5000); // Clear after 5 seconds
          }
          
          // Use branded hashtags if available
          if (result.branding.hashtags && result.branding.hashtags.length > 0) {
            setSuggestedHashtags(result.branding.hashtags.map((tag: string) => `#${tag}`));
            return;
          }
        }
        
        // Fallback to legacy hashtag handling
        if (result.hashtags) {
          setSuggestedHashtags(result.hashtags);
        }
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
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">AI Content Generator</h2>
      
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
      
      {/* Branding notification */}
      {brandingNotification && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 flex items-center">
          <span className="mr-2">ℹ️</span>
          {brandingNotification}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mb-6">
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
            placeholder="Example: A post about our new sustainable product line with eco-friendly packaging"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="platform">
              Platform
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
              className="w-full p-2 border rounded"
              required
            >
              <option value={SocialPlatform.FACEBOOK}>Facebook</option>
              <option value={SocialPlatform.INSTAGRAM}>Instagram</option>
              <option value={SocialPlatform.TWITTER}>Twitter</option>
              <option value={SocialPlatform.LINKEDIN}>LinkedIn</option>
              <option value={SocialPlatform.TIKTOK}>TikTok</option>
              <option value={SocialPlatform.YOUTUBE}>YouTube</option>
              <option value={SocialPlatform.REDDIT}>Reddit</option>
              <option value={SocialPlatform.MASTODON}>Mastodon</option>
              <option value={SocialPlatform.THREADS}>Threads</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="contentType">
              Content Type
            </label>
            <select
              id="contentType"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="post">Regular Post</option>
              <option value="caption">Image Caption</option>
              <option value="story">Story</option>
              <option value="reel">Reel/Video</option>
              <option value="bio">Profile Bio</option>
            </select>
          </div>
        </div>
        
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={loading || !generateEnabled || !prompt}
        >
          {loading ? 'Generating...' : 'Generate Content'}
        </button>
      </form>
      
      {generatedContent && (
        <div className="border rounded p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Generated Content</h3>
          <p className="text-gray-700 whitespace-pre-line mb-4">{generatedContent}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestedHashtags.map((tag, index) => (
              <span 
                key={index} 
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleGenerateHashtags}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !hashtagsEnabled}
            >
              {loading ? 'Generating...' : 'Regenerate Hashtags'}
            </button>
            
            <button
              onClick={handleUseContent}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 