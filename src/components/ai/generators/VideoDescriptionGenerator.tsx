import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import Tabs, { Tab, TabPanel } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface VideoDescriptionGeneratorProps {
  onDescriptionGenerated: (description: string, keywords: string[], timestamps?: string[]) => void;
  initialTitle?: string;
  initialContent?: string;
}

/**
 * Video description generator for YouTube and other video platforms
 * Creates structured video descriptions with sections, timestamps, and links
 */
export default function VideoDescriptionGenerator({ 
  onDescriptionGenerated,
  initialTitle = '',
  initialContent = ''
}: VideoDescriptionGeneratorProps) {
  const { generateContent, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [videoTitle, setVideoTitle] = useState(initialTitle);
  const [videoContent, setVideoContent] = useState(initialContent);
  const [platform, setPlatform] = useState<'youtube' | 'vimeo' | 'tiktok'>('youtube');
  const [videoLength, setVideoLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [includeLinks, setIncludeLinks] = useState(true);
  const [includeDisclaimer, setIncludeDisclaimer] = useState(false);
  const [additionalLinks, setAdditionalLinks] = useState('');
  const [videoKeyPoints, setVideoKeyPoints] = useState('');
  
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>([]);
  const [generatedTimestamps, setGeneratedTimestamps] = useState<string[]>([]);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'advanced'>('create');
  const [editMode, setEditMode] = useState<'structured' | 'raw'>('structured');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle description generation
  const handleGenerateDescription = async () => {
    if (!videoTitle || !videoContent) {
      toast({
        title: "Missing information",
        description: "Please provide both a video title and content details"
      });
      return;
    }
    
    try {
      const result = await generateContent('video-description', 
        platform === 'youtube' ? SocialPlatform.YOUTUBE : 
        platform === 'tiktok' ? SocialPlatform.TIKTOK : 
        SocialPlatform.TWITTER, 
        videoLength, 
        {
          title: videoTitle,
          content: videoContent,
          keyPoints: videoKeyPoints,
          includeTimestamps,
          includeCTA,
          includeLinks,
          includeDisclaimer,
          additionalLinks: additionalLinks.split('\n').filter(link => link.trim() !== ''),
        }
      );
      
      if (result) {
        // Handle potential structure with different parts
        if (typeof result === 'object') {
          if (result.description) {
            setGeneratedDescription(result.description);
          } else if (result.content) {
            setGeneratedDescription(result.content);
          } else if (typeof result === 'string') {
            setGeneratedDescription(result);
          } else {
            setGeneratedDescription(JSON.stringify(result));
          }
          
          if (result.keywords && Array.isArray(result.keywords)) {
            setGeneratedKeywords(result.keywords);
          } else {
            // Extract keywords from content if not provided
            const extractedKeywords = videoTitle
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .split(/\s+/)
              .filter(word => word.length > 3)
              .slice(0, 5);
            setGeneratedKeywords(extractedKeywords);
          }
          
          if (result.timestamps && Array.isArray(result.timestamps)) {
            setGeneratedTimestamps(result.timestamps);
          } else if (includeTimestamps) {
            // Create basic timestamps if requested but not provided
            const videoMinutes = videoLength === 'short' ? 2 : 
                               videoLength === 'medium' ? 7 : 15;
            const sections = videoContent.split(/\n+/).filter(line => line.trim().length > 0);
            const generatedTS = sections.slice(0, 5).map((section, index) => {
              const minutes = Math.floor((videoMinutes * index) / sections.length);
              const seconds = Math.floor(Math.random() * 59);
              return `${minutes}:${seconds < 10 ? '0' + seconds : seconds} ${section.substring(0, 30)}${section.length > 30 ? '...' : ''}`;
            });
            setGeneratedTimestamps(generatedTS);
          }
        } else if (typeof result === 'string') {
          setGeneratedDescription(result);
          
          // Try to extract timestamps if they're in the format 0:00 - Section
          const timestampRegex = /(\d+:\d{2})\s*(-|–)\s*([^\n]+)/g;
          const extractedTimestamps: string[] = [];
          let match;
          
          while ((match = timestampRegex.exec(result)) !== null) {
            extractedTimestamps.push(`${match[1]} ${match[3].trim()}`);
          }
          
          if (extractedTimestamps.length > 0) {
            setGeneratedTimestamps(extractedTimestamps);
          }
        }
        
        toast({
          title: "Description generated",
          description: "Your video description has been created"
        });
      }
    } catch (err) {
      console.error('Error generating video description:', err);
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate description. Please try again."
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateDescription();
  };
  
  // Handle content selection
  const handleUseDescription = () => {
    onDescriptionGenerated(
      generatedDescription, 
      generatedKeywords, 
      includeTimestamps ? generatedTimestamps : undefined
    );
  };
  
  // Get video length description
  const getVideoLengthDescription = () => {
    switch (videoLength) {
      case 'short': return 'Short video (1-3 minutes)';
      case 'medium': return 'Medium video (3-10 minutes)';
      case 'long': return 'Long video (10+ minutes)';
      default: return '';
    }
  };
  
  // Handle description editing
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedDescription(e.target.value);
  };
  
  // Format the description for display
  const getFormattedDescription = () => {
    if (editMode === 'raw') {
      return generatedDescription;
    }
    
    // For structured view, replace single newlines with <br/> for React rendering
    return generatedDescription.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Video Description Generator</h2>
      
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
        value={activeTab === 'create' ? 0 : 1} 
        onChange={(_, value) => setActiveTab(value === 0 ? 'create' : 'advanced')}
      >
        <Tab label="Create Description" />
        <Tab 
          label="Advanced Options" 
          disabled={!canUseAdvancedFeatures}
        />
        
        <TabPanel value={activeTab === 'create' ? 0 : 1} index={0}>
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2" htmlFor="videoTitle">
                  Video Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="videoTitle"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter the title of your video"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="platform">
                  Platform
                </label>
                <select
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="videoContent">
                Video Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="videoContent"
                value={videoContent}
                onChange={(e) => setVideoContent(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Describe what your video is about..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The more details you provide about your video, the better the description will be.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="videoKeyPoints">
                Key Points (Optional)
              </label>
              <textarea
                id="videoKeyPoints"
                value={videoKeyPoints}
                onChange={(e) => setVideoKeyPoints(e.target.value)}
                className="w-full p-2 border rounded"
                rows={2}
                placeholder="List main points covered in the video (one per line)..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="videoLength">
                  Video Length
                </label>
                <select
                  id="videoLength"
                  value={videoLength}
                  onChange={(e) => setVideoLength(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getVideoLengthDescription()}</p>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Options</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeTimestamps}
                      onChange={(e) => setIncludeTimestamps(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Include Timestamps</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeCTA}
                      onChange={(e) => setIncludeCTA(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Include Call to Action</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeLinks}
                      onChange={(e) => setIncludeLinks(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Include Social Media Links</span>
                  </label>
                </div>
              </div>
            </div>
            
            {includeLinks && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="additionalLinks">
                  Additional Links (Optional)
                </label>
                <textarea
                  id="additionalLinks"
                  value={additionalLinks}
                  onChange={(e) => setAdditionalLinks(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={2}
                  placeholder="Add links to include in the description (one per line)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  For example: website, products, resources mentioned in the video
                </p>
              </div>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !videoTitle || !videoContent}
            >
              {loading ? 'Generating...' : 'Generate Video Description'}
            </button>
          </form>
        </TabPanel>
        
        <TabPanel value={activeTab === 'create' ? 0 : 1} index={1}>
          {canUseAdvancedFeatures ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                These advanced features are available to Influencer and Enterprise subscribers.
              </p>
              
              {/* Advanced features */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Custom Sections</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeDisclaimer}
                      onChange={(e) => setIncludeDisclaimer(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Include Disclaimer Section</span>
                  </label>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">SEO Optimization</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Optimize your description for better YouTube search rankings.
                </p>
                <button
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:bg-gray-400"
                  disabled={loading || !generatedDescription}
                >
                  Optimize for SEO
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
              <p className="text-sm text-amber-700 mb-3">
                Advanced video description features are available on Influencer and Enterprise plans.
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
      
      {generatedDescription && (
        <div className="border rounded p-4 mb-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Generated Video Description</h3>
            <div className="flex gap-2">
              <button 
                className={`px-2 py-1 text-xs rounded ${editMode === 'structured' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setEditMode('structured')}
              >
                Structured View
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${editMode === 'raw' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setEditMode('raw')}
              >
                Raw Text
              </button>
            </div>
          </div>
          
          {editMode === 'structured' ? (
            <div className="bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap font-mono text-sm">
              {getFormattedDescription()}
            </div>
          ) : (
            <textarea
              value={generatedDescription}
              onChange={handleDescriptionChange}
              className="w-full p-4 border rounded mb-4 font-mono text-sm"
              rows={12}
            />
          )}
          
          {generatedTimestamps.length > 0 && (
            <div className="bg-gray-50 p-4 rounded mb-4 border-l-4 border-red-400">
              <h4 className="font-medium text-gray-700 mb-2">Timestamps</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {generatedTimestamps.map((timestamp, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {timestamp}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {generatedKeywords.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Keywords for Tags</h4>
              <div className="flex flex-wrap gap-2">
                {generatedKeywords.map((keyword, index) => (
                  <span 
                    key={index} 
                    className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4 flex flex-col md:flex-row justify-between gap-3">
            <button
              onClick={handleGenerateDescription}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled}
            >
              {loading ? 'Regenerating...' : 'Regenerate Description'}
            </button>
            
            <button
              onClick={handleUseDescription}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Use This Description
            </button>
          </div>
        </div>
      )}
      
      {platform === 'youtube' && (
        <div className="mt-4 text-sm text-gray-500">
          <h4 className="font-medium text-gray-600 mb-1">YouTube Description Tips:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the first 100-150 characters wisely as they appear in search results</li>
            <li>Include relevant keywords naturally throughout the description</li>
            <li>Add timestamps to help viewers navigate longer videos</li>
            <li>Include links to related content, social media, and websites</li>
          </ul>
        </div>
      )}
    </div>
  );
} 