import React, { useState } from 'react';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import AITokenAlert from '../toolkit/AITokenAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../ui/use-toast';
import { useSubscription } from '../../../hooks/useSubscription';
import { AITaskType } from '../../../lib/ai/models';

// Define content types enum
enum ContentType {
  BLOG = 'blog',
  LANDING = 'landing',
  PRODUCT = 'product',
  CATEGORY = 'category'
}

interface SEOContentGeneratorProps {
  onContentGenerated: (content: string, metadata: any) => void;
  initialKeywords?: string;
}

/**
 * Enterprise-tier SEO content generator
 * Creates optimized content with metadata, keyword analysis, and structure for SEO
 */
export default function SEOContentGenerator({ 
  onContentGenerated,
  initialKeywords = ''
}: SEOContentGeneratorProps) {
  const { generateContent, analyzeSEO, loading, error } = useAIToolkit();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [keywords, setKeywords] = useState(initialKeywords);
  const [contentType, setContentType] = useState(ContentType.BLOG);
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetAudience, setTargetAudience] = useState<'general' | 'beginner' | 'expert' | 'business'>('general');
  const [includeHeadings, setIncludeHeadings] = useState(true);
  const [includeMetaData, setIncludeMetaData] = useState(true);
  const [industry, setIndustry] = useState<'tech' | 'finance' | 'health' | 'ecommerce' | 'education' | 'general'>('general');
  const [competitorURL, setCompetitorURL] = useState('');
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [keywordAnalysis, setKeywordAnalysis] = useState<any>(null);
  const [generateEnabled, setGenerateEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'analyze'>('create');
  
  const userTier = subscription?.tier || 'creator';
  const canUseEnterpriseFeatures = userTier === 'enterprise';
  
  // Handle content generation
  const handleGenerateContent = async () => {
    if (!keywords) {
      toast({
        title: "Keywords required",
        description: "Please provide target keywords to optimize content"
      });
      return;
    }
    
    if (!canUseEnterpriseFeatures) {
      toast({
        title: "Enterprise feature",
        description: "SEO content generation requires an Enterprise plan"
      });
      return;
    }
    
    try {
      const result = await generateContent('seo-content', contentType as any, contentLength, {
        keywords,
        industry,
        targetAudience,
        includeHeadings,
        includeMetaData,
        competitorURL: competitorURL || undefined
      });
      
      if (result) {
        // Handle different response formats
        if (typeof result === 'object') {
          if (result.content) {
            setGeneratedContent(result.content);
          } else if (typeof result.text === 'string') {
            setGeneratedContent(result.text);
          } else if (typeof result === 'string') {
            setGeneratedContent(result);
          }
          
          if (result.title) {
            setGeneratedTitle(result.title);
          }
          
          if (result.description) {
            setGeneratedDescription(result.description);
          }
          
          if (result.keywordAnalysis) {
            setKeywordAnalysis(result.keywordAnalysis);
          }
        } else if (typeof result === 'string') {
          // If it's just a string, assume it's the content
          setGeneratedContent(result);
          
          // Generate metadata separately
          if (includeMetaData) {
            handleGenerateMetadata(result);
          }
        }
        
        toast({
          title: "SEO content generated",
          description: `Generated ${contentLength} ${contentType} content`
        });
      }
    } catch (err: any) {
      console.error('Error generating SEO content:', err);
      setGeneratedContent('');
      setIsGenerating(false);
      
      toast({
        title: "Generation failed",
        description: err?.message || "Failed to generate content. Please try again."
      });
    }
  };
  
  // Generate metadata if not included in initial generation
  const handleGenerateMetadata = async (content: string) => {
    if (!content) return;
    
    try {
      const result = await generateContent('seo-metadata', contentType as any, 'short', {
        content,
        keywords
      });
      
      if (result) {
        if (typeof result === 'object') {
          if (result.title) {
            setGeneratedTitle(result.title);
          }
          
          if (result.description) {
            setGeneratedDescription(result.description);
          }
        } else if (typeof result === 'string' && result.includes('title:')) {
          // Try to extract title and description from string response
          const titleMatch = content.match(/title:\s*([^\n]+)/i);
          const descMatch = content.match(/description:\s*([^\n]+)/i);
          
          if (titleMatch && titleMatch[1]) {
            setGeneratedTitle(titleMatch[1].trim());
          }
          
          if (descMatch && descMatch[1]) {
            setGeneratedDescription(descMatch[1].trim());
          }
        }
      }
    } catch (err: any) {
      console.error('Error generating metadata:', err);
    }
  };
  
  // Analyze SEO for existing content
  const handleAnalyzeSEO = async () => {
    if (!generatedContent || !keywords) return;
    
    try {
      const keywordList = keywords.split(',').map(k => k.trim());
      const result = await analyzeSEO(generatedContent, keywordList, competitorURL || undefined);
      
      if (result) {
        // Process the API response into our expected format
        const analysisData = typeof result === 'object' ? result : { score: 0, recommendations: [] };
        
        setKeywordAnalysis(analysisData);
        
        toast({
          title: "SEO analysis complete",
          description: "Content has been analyzed for SEO optimization"
        });
      }
    } catch (err: any) {
      console.error('Error analyzing SEO:', err);
      setKeywordAnalysis(null);
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis failed",
        description: err?.message || "Failed to analyze SEO. Please try again."
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
    const metadata = {
      title: generatedTitle,
      description: generatedDescription,
      keywordAnalysis: keywordAnalysis,
      keywords: keywords.split(',').map(k => k.trim())
    };
    
    onContentGenerated(generatedContent, metadata);
  };
  
  // Get content length description
  const getContentLengthDescription = () => {
    switch (contentLength) {
      case 'short': return 'Brief content (300-500 words)';
      case 'medium': return 'Standard content (800-1200 words)';
      case 'long': return 'Comprehensive content (1500+ words)';
      default: return '';
    }
  };
  
  // Get industry description
  const getIndustryDescription = () => {
    switch (industry) {
      case 'tech': return 'Technology and software';
      case 'finance': return 'Finance and banking';
      case 'health': return 'Healthcare and wellness';
      case 'ecommerce': return 'E-commerce and retail';
      case 'education': return 'Education and training';
      case 'general': return 'General purpose';
      default: return '';
    }
  };
  
  // Check if enterprise features are available
  if (!canUseEnterpriseFeatures) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">SEO Content Generator</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded p-6 text-center">
          <h3 className="font-medium text-amber-800 mb-2">Enterprise Feature</h3>
          <p className="text-amber-700 mb-4">
            SEO content generation is available with our Enterprise subscription.
          </p>
          <p className="text-sm text-amber-600 mb-6">
            Generate optimized content with meta tags, headings, and keyword density analysis.
            Includes competitor analysis and structured data for improved search engine rankings.
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
      <h2 className="text-xl font-semibold mb-4">SEO Content Generator</h2>
      
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
        value={activeTab}
        onChange={(_: any, value: string) => setActiveTab(value as 'create' | 'analyze')}
        className="mb-6"
      >
        <TabsTrigger label="Create Content" value="create" />
        <TabsTrigger label="Analyze Content" value="analyze" disabled={!canUseEnterpriseFeatures} />

        <TabsContent value="create">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="keywords">
                Target Keywords <span className="text-red-500">*</span>
              </label>
              <textarea
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full p-2 border rounded"
                rows={2}
                placeholder="Enter primary and secondary keywords, separated by commas"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: seo optimization, search engine ranking, keyword research
              </p>
            </div>
            
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
                  <option value="blog">Blog Post</option>
                  <option value="landing">Landing Page</option>
                  <option value="product">Product Description</option>
                  <option value="category">Category Page</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="contentLength">
                  Content Length
                </label>
                <select
                  id="contentLength"
                  value={contentLength}
                  onChange={(e) => setContentLength(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getContentLengthDescription()}</p>
              </div>
              
              <div>
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
                  <option value="tech">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="health">Healthcare</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="education">Education</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getIndustryDescription()}</p>
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
                <option value="beginner">Beginners</option>
                <option value="expert">Experts</option>
                <option value="business">Business Decision Makers</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="competitorURL">
                Competitor URL (Optional)
              </label>
              <input
                type="text"
                id="competitorURL"
                value={competitorURL}
                onChange={(e) => setCompetitorURL(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="https://competitor.com/relevant-page"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a competitor URL to analyze and outperform their content
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeHeadings}
                    onChange={(e) => setIncludeHeadings(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Include Structured Headings</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeMetaData}
                    onChange={(e) => setIncludeMetaData(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Generate Meta Title & Description</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !generateEnabled || !keywords}
            >
              {loading ? 'Generating...' : 'Generate SEO Content'}
            </button>
          </form>
        </TabsContent>
        
        <TabsContent value="analyze">
          <div className="space-y-4">
            {!keywordAnalysis ? (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">SEO Analysis</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Analyze your content for keyword density, readability, and more.
                </p>
                <button
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded disabled:bg-gray-400"
                  onClick={handleAnalyzeSEO}
                  disabled={loading || !generatedContent}
                >
                  {loading ? 'Analyzing...' : 'Analyze SEO Metrics'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium mb-3">SEO Analysis Results</h3>
                  
                  {keywordAnalysis.score && (
                    <div className="flex items-center mb-3">
                      <span className="text-gray-700 mr-2">Overall SEO Score:</span>
                      <div className="bg-gray-200 h-2 rounded flex-grow">
                        <div
                          className={`h-2 rounded ${
                            keywordAnalysis.score >= 80 ? 'bg-[#00CC44]' :
                            keywordAnalysis.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${keywordAnalysis.score}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 font-medium">{keywordAnalysis.score}/100</span>
                    </div>
                  )}
                  
                  {keywordAnalysis.keywordDensity && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-2">Keyword Density</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(keywordAnalysis.keywordDensity).map(([keyword, density]: [string, any]) => (
                          <div key={keyword} className="bg-white p-2 rounded border text-sm">
                            <div className="font-medium truncate">{keyword}</div>
                            <div className={`text-xs ${
                              parseFloat(density) > 0.5 && parseFloat(density) < 3
                                ? 'text-[#00CC44]'
                                : 'text-amber-600'
                            }`}>
                              {density}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {keywordAnalysis.suggestions && keywordAnalysis.suggestions.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-2">Improvement Suggestions</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {keywordAnalysis.suggestions.map((suggestion: string, index: number) => (
                          <li key={index} className="text-gray-700">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <button
                    className="px-3 py-1 mt-2 bg-indigo-600 text-white text-sm rounded"
                    onClick={handleAnalyzeSEO}
                  >
                    Refresh Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {generatedContent && (
        <div className="border rounded p-4 mb-4 mt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Generated SEO Content</h3>
          
          {generatedTitle && generatedDescription && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Meta Information</h4>
              <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                <div className="mb-3">
                  <span className="text-sm text-gray-500">Title Tag:</span>
                  <p className="text-blue-600 text-lg font-medium mt-1 cursor-pointer hover:underline">
                    {generatedTitle}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Meta Description:</span>
                  <p className="text-gray-600 text-sm mt-1">
                    {generatedDescription}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Content</h4>
            <div className="bg-white p-4 rounded mb-4 border border-gray-200">
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
              </div>
            </div>
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
              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Use This Content
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <h4 className="font-medium text-gray-600 mb-1">SEO Best Practices:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use primary keywords naturally in headings and first paragraph</li>
          <li>Maintain keyword density between 1-3% for optimal results</li>
          <li>Include semantic keywords and related terms</li>
          <li>Structure content with proper H1, H2, H3 headings</li>
          <li>Aim for at least 300 words for minimal SEO impact</li>
        </ul>
      </div>
    </div>
  );
} 