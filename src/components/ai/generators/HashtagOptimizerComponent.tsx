import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AITaskType } from '../../../lib/ai/models';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { useToast } from '../../ui/use-toast';

interface HashtagOptimizerComponentProps {
  onHashtagsGenerated: (hashtags: string[], categories?: string[]) => void;
  initialContent?: string;
  initialHashtags?: string[];
}

/**
 * Specialized hashtag generator and optimizer for optimal engagement
 * Generates, categorizes, and ranks hashtags for maximum discoverability
 */
export default function HashtagOptimizerComponent({ 
  onHashtagsGenerated,
  initialContent = '',
  initialHashtags = []
}: HashtagOptimizerComponentProps) {
  const { suggestHashtags, loading, error, analyzeHashtags } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [content, setContent] = useState(initialContent);
  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.INSTAGRAM);
  const [count, setCount] = useState(15);
  const [manualHashtags, setManualHashtags] = useState(initialHashtags.join(' '));
  const [includeNiche, setIncludeNiche] = useState(true);
  const [includePopular, setIncludePopular] = useState(true);
  const [includeBranded, setIncludeBranded] = useState(false);
  const [niche, setNiche] = useState<string>('');
  
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [hashtagCategories, setHashtagCategories] = useState<{[key: string]: string}>({});
  const [popularityScores, setPopularityScores] = useState<{[key: string]: number}>({});
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'generate' | 'optimize'>('generate');
  
  const userTier = subscription?.tier || 'creator';
  const canUseAdvancedFeatures = userTier === 'influencer' || userTier === 'enterprise';
  
  // Handle hashtag generation
  const handleGenerateHashtags = async () => {
    if (!content && !manualHashtags) {
      toast({
        title: "Content required",
        description: "Please provide content or manual hashtags to generate from"
      });
      return;
    }
    
    try {
      let contentToUse = content;
      
      // If user provided manual hashtags, incorporate them into the content for context
      if (manualHashtags.trim()) {
        const hashtags = manualHashtags
          .split(/[\s,#]+/)
          .map(tag => tag.trim())
          .filter(tag => tag !== '');
        contentToUse = content + "\n\nInclude these hashtags: " + hashtags.join(", ");
      }
      
      // Use the suggestHashtags API method
      const result = await suggestHashtags(contentToUse, platform, count);
      
      if (result) {
        // Extract hashtags from the API response
        let extractedHashtags: string[] = [];
        let extractedCategories: {[key: string]: string} = {};
        let extractedScores: {[key: string]: number} = {};
        
        // Handle different response formats
        if (result.hashtags) {
          if (Array.isArray(result.hashtags)) {
            extractedHashtags = result.hashtags;
          } else if (typeof result.hashtags === 'object') {
            // Some API responses might provide hashtags as an object with metadata
            extractedHashtags = Object.keys(result.hashtags);
            
            // Extract categories and scores if available
            Object.entries(result.hashtags).forEach(([tag, data]: [string, any]) => {
              if (data.category) extractedCategories[tag] = data.category;
              if (data.popularity) extractedScores[tag] = data.popularity / 100;
            });
          }
        } else if (Array.isArray(result)) {
          extractedHashtags = result;
        } else if (typeof result === 'string') {
          extractedHashtags = result.split(/[\s,#]+/).filter(tag => tag !== '');
        }
        
        // Use category data from API if available
        if (result.categories) {
          extractedCategories = result.categories;
        } else if (Object.keys(extractedCategories).length === 0) {
          // Create categories based on hashtag length as a simple fallback
          extractedHashtags.forEach(tag => {
            if (tag.length < 6) {
              extractedCategories[tag] = 'popular';
            } else if (tag.length < 10) {
              extractedCategories[tag] = 'niche';
            } else {
              extractedCategories[tag] = 'specific';
            }
          });
        }
        
        // Use popularity scores from API if available
        if (result.popularityScores) {
          extractedScores = result.popularityScores;
        } else if (Object.keys(extractedScores).length === 0) {
          // Create scores based on category as a fallback
          extractedHashtags.forEach(tag => {
            const category = extractedCategories[tag];
            if (category === 'popular') {
              extractedScores[tag] = 0.8;
            } else if (category === 'niche') {
              extractedScores[tag] = 0.6;
            } else {
              extractedScores[tag] = 0.4;
            }
          });
        }
        
        // Update state with all extracted data
        setGeneratedHashtags(extractedHashtags);
        setSelectedHashtags(extractedHashtags);
        setHashtagCategories(extractedCategories);
        setPopularityScores(extractedScores);
        
        // If we have hashtags and advanced features, automatically analyze them
        if (extractedHashtags.length > 0 && canUseAdvancedFeatures) {
          handleAnalyzeHashtags(extractedHashtags);
        }
        
        toast({
          title: "Hashtags generated",
          description: `Generated ${extractedHashtags.length} hashtags for ${platform}`
        });
      }
    } catch (err) {
      console.error('Error generating hashtags:', err);
      toast({
        title: "Generation failed",
        description: error ? error.message : "Failed to generate hashtags. Please try again."
      });
    }
  };
  
  // Analyze existing hashtags for optimization
  const handleAnalyzeHashtags = async (tagsToAnalyze = generatedHashtags) => {
    if (!canUseAdvancedFeatures || tagsToAnalyze.length === 0) return;
    
    try {
      // Use the analyzeHashtags method from the API
      const result = await analyzeHashtags(tagsToAnalyze, platform);
      
      if (result && result.hashtags) {
        // Extract hashtag data from the analysis result
        const updatedCategories: {[key: string]: string} = {};
        const updatedScores: {[key: string]: number} = {};
        
        // Process each hashtag in the result
        for (const tag of tagsToAnalyze) {
          if (result.hashtags[tag]) {
            const tagData = result.hashtags[tag];
            updatedCategories[tag] = tagData.category || hashtagCategories[tag] || 'general';
            
            // Convert popularity to a decimal between 0-1 if needed
            const popularity = typeof tagData.popularity === 'number' 
              ? (tagData.popularity > 1 ? tagData.popularity / 100 : tagData.popularity)
              : popularityScores[tag] || 0.5;
            
            updatedScores[tag] = popularity;
          } else {
            // Preserve existing data if not updated
            updatedCategories[tag] = hashtagCategories[tag] || 'general';
            updatedScores[tag] = popularityScores[tag] || 0.5;
          }
        }
        
        // Sort hashtags by popularity for optimization
        const optimizedHashtags = [...tagsToAnalyze].sort((a, b) => {
          return (updatedScores[b] || 0.5) - (updatedScores[a] || 0.5);
        });
        
        // Update state with analyzed data
        setHashtagCategories(updatedCategories);
        setPopularityScores(updatedScores);
        setGeneratedHashtags(optimizedHashtags);
        setSelectedHashtags(optimizedHashtags);
        
        toast({
          title: "Hashtags analyzed",
          description: "Your hashtags have been analyzed and optimized"
        });
      }
    } catch (err) {
      console.error('Error analyzing hashtags:', err);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze hashtags. Using basic optimization instead."
      });
      
      // Fallback to sorting by popularity using existing data
      const optimizedHashtags = [...tagsToAnalyze].sort((a, b) => {
        return (popularityScores[b] || 0.5) - (popularityScores[a] || 0.5);
      });
      
      setGeneratedHashtags(optimizedHashtags);
      setSelectedHashtags(optimizedHashtags);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateHashtags();
  };
  
  // Toggle hashtag selection
  const toggleHashtagSelection = (hashtag: string) => {
    if (selectedHashtags.includes(hashtag)) {
      setSelectedHashtags(selectedHashtags.filter(tag => tag !== hashtag));
    } else {
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };
  
  // Handle selection of all hashtags
  const handleSelectAll = () => {
    setSelectedHashtags([...generatedHashtags]);
  };
  
  // Handle deselection of all hashtags
  const handleDeselectAll = () => {
    setSelectedHashtags([]);
  };
  
  // Handle use of selected hashtags
  const handleUseHashtags = () => {
    onHashtagsGenerated(
      selectedHashtags, 
      canUseAdvancedFeatures ? Object.keys(hashtagCategories) : undefined
    );
  };
  
  // Get hashtag category if available
  const getHashtagCategory = (hashtag: string) => {
    return hashtagCategories[hashtag] || 'general';
  };
  
  // Get hashtag popularity score if available
  const getHashtagPopularity = (hashtag: string) => {
    return popularityScores[hashtag] || 0;
  };
  
  // Get color class based on hashtag category
  const getCategoryColorClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'niche': return 'bg-purple-100 text-purple-800';
      case 'ultra-niche': return 'bg-purple-200 text-purple-900';
      case 'growing-niche': return 'bg-fuchsia-100 text-fuchsia-800';
      case 'popular': return 'bg-blue-100 text-blue-800';
      case 'trending': return 'bg-pink-100 text-pink-800';
      case 'evergreen': return 'bg-green-100 text-green-800';
      case 'branded': return 'bg-amber-100 text-amber-800';
      case 'specific': return 'bg-indigo-100 text-indigo-800';
      case 'location': return 'bg-green-100 text-green-800';
      case 'seasonal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Hashtag Optimizer</h2>
      
      {/* Token alerts for hashtag generation */}
      <AITokenAlert 
        taskType={AITaskType.GENERATE_HASHTAGS}
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
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-2 ${activeTab === 'generate' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
            >
              Generate
            </button>
            <button 
              onClick={() => setActiveTab('optimize')}
              disabled={!canUseAdvancedFeatures || generatedHashtags.length === 0}
              className={`px-4 py-2 ${activeTab === 'optimize' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'} ${(!canUseAdvancedFeatures || generatedHashtags.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Optimize
              {!canUseAdvancedFeatures && (
                <span className="ml-1 text-amber-500 text-xs">★</span>
              )}
            </button>
          </div>
        </div>
        
        {/* Generate tab */}
        {activeTab === 'generate' && (
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="content">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Paste your content here to generate relevant hashtags"
              />
              <p className="text-xs text-gray-500 mt-1">
                The more detailed your content, the more relevant your hashtags will be
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  <option value={SocialPlatform.TWITTER}>Twitter</option>
                  <option value={SocialPlatform.TIKTOK}>TikTok</option>
                  <option value={SocialPlatform.FACEBOOK}>Facebook</option>
                  <option value={SocialPlatform.LINKEDIN}>LinkedIn</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="count">
                  Number of Hashtags
                </label>
                <select
                  id="count"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  <option value={5}>Few (5)</option>
                  <option value={10}>Some (10)</option>
                  <option value={15}>Many (15)</option>
                  <option value={30}>Maximum (30)</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="manualHashtags">
                Manual Hashtags (Optional)
              </label>
              <input
                id="manualHashtags"
                value={manualHashtags}
                onChange={(e) => setManualHashtags(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter hashtags separated by spaces (e.g., travel vacation summer)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include specific hashtags you want to use or build upon
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeNiche}
                    onChange={(e) => setIncludeNiche(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Niche</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includePopular}
                    onChange={(e) => setIncludePopular(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Popular</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeBranded}
                    onChange={(e) => setIncludeBranded(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Branded</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="niche">
                Niche/Industry (Optional)
              </label>
              <input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Specific niche or industry (e.g., fitness, photography, tech)"
              />
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || (!content && !manualHashtags)}
            >
              {loading ? 'Generating...' : 'Generate Hashtags'}
            </button>
          </form>
        )}
        
        {/* Optimize tab */}
        {activeTab === 'optimize' && (
          <div className="space-y-6">
            {canUseAdvancedFeatures ? (
              <>
                <div className="bg-indigo-50 border border-indigo-100 rounded p-4">
                  <h3 className="font-medium text-indigo-800 mb-2">Hashtag Performance Analysis</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Category Distribution</h4>
                      <div className="space-y-1">
                        {Object.entries(
                          Object.values(hashtagCategories).reduce((acc: {[key: string]: number}, cat) => {
                            acc[cat] = (acc[cat] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([category, count], index) => (
                          <div key={index} className="flex items-center">
                            <span className={`text-xs px-2 py-0.5 rounded mr-2 ${getCategoryColorClass(category)}`}>
                              {category}
                            </span>
                            <div className="flex-grow h-2 bg-gray-200 rounded mr-2">
                              <div 
                                className="h-2 bg-indigo-500 rounded" 
                                style={{ width: `${(count as number) / Object.keys(hashtagCategories).length * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Optimization Recommendations</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                        <li>Use a mix of popular and niche hashtags for better reach</li>
                        <li>Include 1-2 branded hashtags for brand recognition</li>
                        <li>Group low-performing hashtags with high-performing ones</li>
                        <li>Consider adding location-based hashtags if relevant</li>
                      </ul>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAnalyzeHashtags()}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={loading || generatedHashtags.length === 0}
                  >
                    {loading ? 'Analyzing...' : 'Re-Analyze & Optimize'}
                  </button>
                </div>
                
                <div className="bg-gray-50 border rounded p-4">
                  <h3 className="font-medium mb-2">Hashtag Group Suggestions</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm text-gray-700">Engagement-focused Group</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedHashtags
                          .filter((_, i) => i < 5)
                          .map((tag, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded ${getCategoryColorClass(getHashtagCategory(tag))}`}>
                              #{tag}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-700">Discovery-focused Group</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedHashtags
                          .filter((_, i) => i >= 5 && i < 10)
                          .map((tag, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded ${getCategoryColorClass(getHashtagCategory(tag))}`}>
                              #{tag}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-700">Niche-focused Group</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedHashtags
                          .filter(tag => getHashtagCategory(tag).includes('niche'))
                          .slice(0, 5)
                          .map((tag, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded ${getCategoryColorClass(getHashtagCategory(tag))}`}>
                              #{tag}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <h3 className="font-medium text-amber-800 mb-2">Premium Feature</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Hashtag optimization is available on Influencer and Enterprise plans.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700 mb-4">
                  <li>Analyze hashtag performance and rankings</li>
                  <li>Get personalized recommendations for your content</li>
                  <li>Optimize hashtag groups for different goals</li>
                  <li>Track performance across platforms</li>
                </ul>
                <button
                  className="px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600"
                  onClick={() => window.location.href = '/dashboard/settings/billing'}
                >
                  Upgrade Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Results section */}
      {generatedHashtags.length > 0 && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Generated Hashtags</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {generatedHashtags.map((hashtag, index) => {
                const isSelected = selectedHashtags.includes(hashtag);
                const category = getHashtagCategory(hashtag);
                const popularity = getHashtagPopularity(hashtag);
                
                return (
                  <div 
                    key={index} 
                    className={`rounded border px-3 py-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => toggleHashtagSelection(hashtag)}
                  >
                    <div className="flex items-center">
                      <span className={`inline-block w-4 h-4 rounded-full mr-2 ${
                        isSelected ? 'bg-indigo-500' : 'bg-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </span>
                      <span className="font-medium">#{hashtag}</span>
                    </div>
                    
                    {canUseAdvancedFeatures && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColorClass(category)}`}>
                          {category}
                        </span>
                        
                        <span className="text-xs text-gray-500">
                          {Math.floor(popularity * 100)}% popularity
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-500">
                {selectedHashtags.length} of {generatedHashtags.length} hashtags selected
              </span>
            </div>
            
            <button
              onClick={handleUseHashtags}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={selectedHashtags.length === 0}
            >
              Use Selected Hashtags
            </button>
          </div>
          
          {selectedHashtags.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border rounded">
              <label className="block text-sm text-gray-700 mb-1">Copy Hashtags:</label>
              <div className="p-2 bg-white border rounded">
                <code className="text-sm break-all">
                  {selectedHashtags.map(tag => `#${tag}`).join(' ')}
                </code>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Hashtag Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Instagram works best with 10-15 relevant hashtags</li>
          <li>Twitter is most effective with 1-2 targeted hashtags</li>
          <li>Use a mix of popular and niche hashtags for better reach</li>
          <li>Research trending hashtags in your industry</li>
          <li>Avoid using banned or flagged hashtags that could limit visibility</li>
        </ul>
      </div>
    </div>
  );
} 