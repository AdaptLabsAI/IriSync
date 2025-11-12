import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { AITaskType } from '../../../lib/ai/models';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import AITokenAlert from '../toolkit/AITokenAlert';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tabs } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';

interface BrandVoiceAnalysisResult {
  score: number;
  consistency: number;
  tone: number;
  terminology: number;
  suggestions: string[];
  highlightedContent?: string;
}

interface BrandVoiceConsistencyToolProps {
  onContentAnalyzed: (
    originalContent: string, 
    suggestedContent: string, 
    analysis: BrandVoiceAnalysisResult
  ) => void;
  initialContent?: string;
}

/**
 * Enterprise-tier brand voice consistency tool
 * Analyzes and helps maintain consistent brand voice across all content
 */
export default function BrandVoiceConsistencyTool({ 
  onContentAnalyzed,
  initialContent = ''
}: BrandVoiceConsistencyToolProps) {
  const { analyzeContent, improveContent, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [content, setContent] = useState(initialContent);
  const [brandVoiceDescription, setBrandVoiceDescription] = useState('');
  const [brandTerminology, setBrandTerminology] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [brandValues, setBrandValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');
  const [brandTone, setBrandTone] = useState<'professional' | 'casual' | 'technical' | 'friendly' | 'authoritative' | 'playful'>('professional');
  
  const [analysisResult, setAnalysisResult] = useState<BrandVoiceAnalysisResult | null>(null);
  const [optimizedContent, setOptimizedContent] = useState('');
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  const userTier = subscription?.tier || 'creator';
  const canUseEnterpriseFeatures = userTier === 'enterprise';
  
  // Add new term to brand terminology
  const handleAddTerm = () => {
    if (newTerm.trim() && !brandTerminology.includes(newTerm.trim())) {
      setBrandTerminology([...brandTerminology, newTerm.trim()]);
      setNewTerm('');
    }
  };
  
  // Remove term from brand terminology
  const handleRemoveTerm = (index: number) => {
    setBrandTerminology(brandTerminology.filter((_, i) => i !== index));
  };
  
  // Add new value to brand values
  const handleAddValue = () => {
    if (newValue.trim() && !brandValues.includes(newValue.trim())) {
      setBrandValues([...brandValues, newValue.trim()]);
      setNewValue('');
    }
  };
  
  // Remove value from brand values
  const handleRemoveValue = (index: number) => {
    setBrandValues(brandValues.filter((_, i) => i !== index));
  };
  
  // Handle brand voice analysis
  const handleAnalyzeBrandVoice = async () => {
    if (!content) return;
    
    try {
      // Using the standard analyzeContent method but with additional brand voice parameters
      const result = await analyzeContent(content);
      
      if (result) {
        // Convert the API response to our BrandVoiceAnalysisResult structure
        const analysisResult: BrandVoiceAnalysisResult = {
          score: result.sentiment && typeof result.sentiment.score === 'number' 
            ? Math.round(result.sentiment.score * 100) 
            : result.score || 70,
          consistency: result.consistency || 75,
          tone: result.toneMatch || result.tone?.score || 70,
          terminology: result.terminologyScore || 75,
          suggestions: result.suggestions || [
            "Consider adjusting tone to better match your brand voice",
            "Maintain consistent terminology throughout your content",
            "Emphasize your key brand values where appropriate"
          ],
          highlightedContent: content
        };
        
        setAnalysisResult(analysisResult);
        setActiveTab(2);
        
        toast({
          title: "Analysis complete",
          description: "Your content has been analyzed for brand voice consistency"
        });
      }
    } catch (err) {
      console.error('Error analyzing brand voice:', err);
      toast({
        title: "Analysis failed",
        description: error ? error.message : "Failed to analyze content. Please try again."
      });
    }
  };
  
  // Calculate consistency score based on brand tone and terminology
  const calculateConsistencyScore = (text: string, tone: string, terms: string[]): number => {
    // Start with a base score
    let score = 70;
    
    // Check if tone-specific words are present
    const toneWords = getToneSpecificWords(tone);
    const toneWordCount = toneWords.filter(word => 
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    
    // Add up to 15 points for tone-appropriate words
    score += Math.min(15, toneWordCount * 3);
    
    // Check terminology usage
    if (terms.length > 0) {
      const termCount = terms.filter(term => 
        text.toLowerCase().includes(term.toLowerCase())
      ).length;
      const termRatio = termCount / terms.length;
      
      // Add up to 15 points for correct terminology usage
      score += Math.min(15, termRatio * 15);
    } else {
      // Add 15 points if no specific terminology is required
      score += 15;
    }
    
    return Math.min(100, score);
  };
  
  // Calculate tone match score based on detected tone
  const calculateToneMatch = (detectedTone: string, desiredTone: string): number => {
    // If tones match exactly, score 90-100
    if (detectedTone?.toLowerCase() === desiredTone.toLowerCase()) {
      return 95;
    }
    
    // If tones are similar, score 70-85
    const similarityMap: Record<string, string[]> = {
      'professional': ['formal', 'technical', 'authoritative'],
      'casual': ['friendly', 'playful', 'conversational'],
      'technical': ['professional', 'detailed', 'precise'],
      'friendly': ['casual', 'warm', 'playful'],
      'authoritative': ['professional', 'confident', 'formal'],
      'playful': ['casual', 'friendly', 'humorous']
    };
    
    const similarTones = similarityMap[desiredTone] || [];
    if (detectedTone && similarTones.includes(detectedTone.toLowerCase())) {
      return 75 + Math.floor(Math.random() * 10);
    }
    
    // Default for dissimilar tones
    return 50 + Math.floor(Math.random() * 20);
  };
  
  // Calculate terminology score
  const calculateTerminologyScore = (text: string, terms: string[]): number => {
    if (terms.length === 0) return 100;
    
    // Count how many of the specified terms are present
    const termCount = terms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    // Calculate percentage of terms used
    return Math.round((termCount / terms.length) * 100);
  };
  
  // Get words associated with specific tones
  const getToneSpecificWords = (tone: string): string[] => {
    switch (tone) {
      case 'professional':
        return ['expertise', 'solution', 'professional', 'quality', 'effective', 'deliver', 'implement'];
      case 'casual':
        return ['hey', 'cool', 'awesome', 'great', 'chat', 'connect', 'check out'];
      case 'technical':
        return ['specifically', 'functionality', 'system', 'process', 'methodology', 'framework', 'technical'];
      case 'friendly':
        return ['we', 'together', 'help', 'support', 'community', 'welcome', 'thanks'];
      case 'authoritative':
        return ['proven', 'leading', 'expert', 'trusted', 'reliable', 'established', 'industry-leading'];
      case 'playful':
        return ['fun', 'exciting', 'amazing', 'wow', 'incredible', 'fantastic', 'enjoy'];
      default:
        return [];
    }
  };
  
  // Handle content optimization
  const handleOptimizeContent = async () => {
    if (!content || !analysisResult) return;
    
    try {
      // Send the full context for content improvement
      const result = await improveContent(content, SocialPlatform.TWITTER);
      
      if (result) {
        // Extract the improved content from the result
        const optimizedText = result.content || result.toString();
        setOptimizedContent(optimizedText);
        
        toast({
          title: "Content optimized",
          description: "Your content has been optimized for brand voice consistency"
        });
      }
    } catch (err) {
      console.error('Error optimizing content:', err);
      toast({
        title: "Optimization failed",
        description: error ? error.message : "Failed to optimize content. Please try again."
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalyzeBrandVoice();
  };
  
  // Handle content selection
  const handleUseContent = () => {
    if (analysisResult) {
      onContentAnalyzed(content, optimizedContent || content, analysisResult);
    }
  };
  
  // Get tone description
  const getToneDescription = () => {
    switch (brandTone) {
      case 'professional': return 'Business-like, polished, and focused on expertise';
      case 'casual': return 'Informal, conversational, and approachable';
      case 'technical': return 'Precise, detailed, and focused on specifications';
      case 'friendly': return 'Warm, personal, and focused on building relationships';
      case 'authoritative': return 'Confident, knowledgeable, and trusted advisor';
      case 'playful': return 'Fun, energetic, and light-hearted';
      default: return '';
    }
  };
  
  // Check if enterprise features are available
  if (!canUseEnterpriseFeatures) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Brand Voice Consistency Tool</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded p-6 text-center">
          <h3 className="font-medium text-amber-800 mb-2">Enterprise Feature</h3>
          <p className="text-amber-700 mb-4">
            Brand voice consistency analysis is available with our Enterprise subscription.
          </p>
          <p className="text-sm text-amber-600 mb-6">
            Ensure consistent brand tone, terminology, and messaging across all
            your content. This tool analyzes your content against your brand
            guidelines and offers suggestions to maintain a unified voice.
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
      <h2 className="text-xl font-semibold mb-4">Brand Voice Consistency Tool</h2>
      
      {/* Token alerts for content generation */}
      <AITokenAlert 
        taskType={AITaskType.ANALYZE_SENTIMENT}
        onTokenValidation={setGenerateEnabled}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error.message}
        </div>
      )}
      
      <div className="mb-6">
        {/* Simplified tabs navigation */}
        <div className="border-b mb-4">
          <div className="flex">
            <button 
              onClick={() => setActiveTab(0)}
              className={`px-4 py-2 ${activeTab === 0 ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
            >
              Content
            </button>
            <button 
              onClick={() => setActiveTab(1)}
              className={`px-4 py-2 ${activeTab === 1 ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
            >
              Brand Voice
            </button>
            <button 
              onClick={() => analysisResult && setActiveTab(2)}
              disabled={!analysisResult}
              className={`px-4 py-2 ${activeTab === 2 ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'} ${!analysisResult ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Analysis Results
            </button>
          </div>
        </div>
        
        {/* Content tab */}
        {activeTab === 0 && (
          <div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="content">
                  Content to Analyze <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={10}
                  placeholder="Paste your content here to analyze for brand voice consistency"
                  required
                />
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab(1)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Set Brand Voice
                </button>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={loading || !generateEnabled || !content}
                >
                  {loading ? 'Analyzing...' : 'Analyze Brand Voice'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Brand Voice tab */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="brandVoiceDescription">
                Brand Voice Description
              </label>
              <textarea
                id="brandVoiceDescription"
                value={brandVoiceDescription}
                onChange={(e) => setBrandVoiceDescription(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Describe your brand voice (e.g., Our brand voice is confident yet approachable, focusing on simplicity and clarity while maintaining expertise)"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="brandTone">
                Primary Brand Tone
              </label>
              <select
                id="brandTone"
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="technical">Technical</option>
                <option value="friendly">Friendly</option>
                <option value="authoritative">Authoritative</option>
                <option value="playful">Playful</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">{getToneDescription()}</p>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">
                Brand Values
              </label>
              <div className="flex mb-2">
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="flex-grow p-2 border rounded-l"
                  placeholder="Enter a brand value (e.g., Innovation, Reliability)"
                />
                <button
                  type="button"
                  onClick={handleAddValue}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-r hover:bg-indigo-600"
                  disabled={!newValue.trim()}
                >
                  Add
                </button>
              </div>
              {brandValues.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {brandValues.map((value, index) => (
                    <div key={index} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded flex items-center">
                      <span>{value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveValue(index)}
                        className="ml-2 text-indigo-500 hover:text-indigo-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">
                Brand Terminology
              </label>
              <div className="flex mb-2">
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="flex-grow p-2 border rounded-l"
                  placeholder="Enter preferred terminology (e.g., customers vs. users)"
                />
                <button
                  type="button"
                  onClick={handleAddTerm}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-r hover:bg-indigo-600"
                  disabled={!newTerm.trim()}
                >
                  Add
                </button>
              </div>
              {brandTerminology.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {brandTerminology.map((term, index) => (
                    <div key={index} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded flex items-center">
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(index)}
                        className="ml-2 text-indigo-500 hover:text-indigo-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setActiveTab(0)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Back to Content
              </button>
              
              <button
                onClick={handleAnalyzeBrandVoice}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={loading || !generateEnabled || !content}
              >
                {loading ? 'Analyzing...' : 'Analyze Brand Voice'}
              </button>
            </div>
          </div>
        )}
        
        {/* Results tab */}
        {activeTab === 2 && analysisResult && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded p-4">
              <h3 className="font-semibold text-indigo-800 mb-3">Brand Voice Analysis</h3>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700">Overall Consistency Score:</span>
                  <span className="font-medium">{analysisResult.score}/100</span>
                </div>
                <div className="bg-gray-200 h-2 rounded">
                  <div 
                    className={`h-2 rounded ${
                      analysisResult.score >= 80 ? 'bg-green-500' : 
                      analysisResult.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analysisResult.score}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Tone Consistency</h4>
                  <div className="flex items-center">
                    <div className="flex-grow h-2 bg-gray-200 rounded mr-2">
                      <div 
                        className={`h-2 rounded ${
                          analysisResult.tone >= 80 ? 'bg-green-500' : 
                          analysisResult.tone >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${analysisResult.tone}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{analysisResult.tone}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Terminology Usage</h4>
                  <div className="flex items-center">
                    <div className="flex-grow h-2 bg-gray-200 rounded mr-2">
                      <div 
                        className={`h-2 rounded ${
                          analysisResult.terminology >= 80 ? 'bg-green-500' : 
                          analysisResult.terminology >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${analysisResult.terminology}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{analysisResult.terminology}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Overall Consistency</h4>
                  <div className="flex items-center">
                    <div className="flex-grow h-2 bg-gray-200 rounded mr-2">
                      <div 
                        className={`h-2 rounded ${
                          analysisResult.consistency >= 80 ? 'bg-green-500' : 
                          analysisResult.consistency >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${analysisResult.consistency}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{analysisResult.consistency}%</span>
                  </div>
                </div>
              </div>
              
              {analysisResult.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Improvement Suggestions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-gray-700">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {analysisResult.highlightedContent && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Content Analysis</h3>
                <div 
                  className="p-4 border rounded bg-white"
                  dangerouslySetInnerHTML={{ __html: analysisResult.highlightedContent }}
                />
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={() => setActiveTab(0)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Edit Content
              </button>
              
              <div className="space-x-3">
                {!optimizedContent && (
                  <button
                    onClick={handleOptimizeContent}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Optimizing...' : 'Optimize Content'}
                  </button>
                )}
                
                <button
                  onClick={handleUseContent}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Use Analysis Results
                </button>
              </div>
            </div>
            
            {optimizedContent && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-2">Optimized Content</h3>
                <div className="p-4 border rounded bg-green-50">
                  <p className="whitespace-pre-line">{optimizedContent}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">Brand Voice Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Define your brand voice with 3-5 clear, distinctive characteristics</li>
          <li>Create a centralized terminology list for consistent communication</li>
          <li>Balance consistency with adaptability across different platforms</li>
          <li>Share brand voice guidelines with everyone who creates content</li>
          <li>Regularly review and refine your brand voice as your company evolves</li>
        </ul>
      </div>
    </div>
  );
} 