import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { useAIToolkit } from '../../hooks/useAIToolkit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Loader2, TrendingUp, Lock, Download, Calendar, ThumbsUp, ThumbsDown } from 'lucide-react';
import { SocialPlatform } from '../../lib/models/SocialAccount';

export type TrendTimeframe = '24hours' | '7days' | '30days' | '90days';
export type TrendCategory = 'hashtags' | 'topics' | 'content-types' | 'keywords' | 'industry-specific';

export interface TrendItem {
  id: string;
  name: string;
  category: TrendCategory;
  growthRate: number;
  volume: number;
  relevanceScore: number;
}

export interface TrendAnalysisResult {
  id: string;
  platform: SocialPlatform;
  category: TrendCategory;
  timeframe: TrendTimeframe;
  trends: TrendItem[];
  generatedAt: Date;
  confidence: number;
  recommendations?: string[];
}

export interface TrendAnalysisButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Connected social platforms to analyze trends for
   */
  platforms?: Array<{id: string, name: string, type: SocialPlatform}>;
  /**
   * Optional industry or niche to analyze
   */
  industry?: string;
  /**
   * Callback for when trends are analyzed
   */
  onAnalyzeTrends?: (platformId: string, category: TrendCategory, timeframe: TrendTimeframe, industry?: string) => Promise<TrendAnalysisResult>;
  /**
   * Callback for feedback on trend quality
   */
  onTrendFeedback?: (trendResultId: string, isHelpful: boolean) => Promise<void>;
  /**
   * Callback for exporting trend analysis
   */
  onExportTrends?: (trends: TrendAnalysisResult, format: 'pdf' | 'csv' | 'json') => Promise<string>;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * TrendAnalysisButton - A component that analyzes current trends on social platforms.
 * This component helps users discover trending topics, hashtags, and content types
 * to stay relevant and increase engagement.
 * This feature is available only on Influencer and Enterprise tiers.
 */
const TrendAnalysisButton: React.FC<TrendAnalysisButtonProps> = ({
  platforms = [],
  industry = '',
  onAnalyzeTrends,
  onTrendFeedback,
  onExportTrends,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(platforms.length > 0 ? platforms[0].id : '');
  const [trendCategory, setTrendCategory] = useState<TrendCategory>('hashtags');
  const [timeframe, setTimeframe] = useState<TrendTimeframe>('7days');
  const [industryInput, setIndustryInput] = useState(industry);
  const [trendResult, setTrendResult] = useState<TrendAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('analyze');
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { analyzeTrends, loading, error } = useAIToolkit();
  
  const userTier = subscription?.tier || 'creator';
  
  // Check feature availability based on subscription tier
  const canUseTrendAnalysis = userTier === 'enterprise' || userTier === 'influencer';
  
  const handleOpenDialog = () => {
    if (!canUseTrendAnalysis) {
      toast({
        title: "Feature not available",
        description: "Trend analysis requires an Influencer or Enterprise subscription",
        variant: "destructive"
      });
      return;
    }
    
    if (platforms.length === 0) {
      toast({
        title: "No platforms connected",
        description: "Connect a social platform to analyze trends",
        variant: "destructive"
      });
      return;
    }
    
    setIsOpen(true);
  };
  
  const handleAnalyzeTrends = async () => {
    if (!selectedPlatform || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setTrendResult(null);
    
    try {
      // Use provided function or hook function
      const result = onAnalyzeTrends 
        ? await onAnalyzeTrends(selectedPlatform, trendCategory, timeframe, industryInput)
        : await analyzeTrends(selectedPlatform, trendCategory, timeframe, industryInput);
      
      setTrendResult(result);
      
      toast({
        title: "Trends analyzed",
        description: `Found ${result.trends.length} trending ${trendCategory.replace('-', ' ')}`,
      });
    } catch (err) {
      console.error('Error analyzing trends:', err);
      toast({
        title: "Analysis failed",
        description: error?.message || "Failed to analyze trends. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleExportTrends = async (format: 'pdf' | 'csv' | 'json') => {
    if (!onExportTrends || !trendResult) return;
    
    try {
      const url = await onExportTrends(trendResult, format);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = url;
      link.download = `trend-analysis-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: `Trend analysis exported as ${format.toUpperCase()}`,
      });
    } catch (err) {
      console.error('Error exporting trends:', err);
      toast({
        title: "Export failed",
        description: "Failed to export trend analysis. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleTrendFeedback = async (isHelpful: boolean) => {
    if (!onTrendFeedback || !trendResult) return;
    
    try {
      await onTrendFeedback(trendResult.id, isHelpful);
      
      toast({
        title: "Thank you for your feedback",
        description: "Your feedback helps us improve our trend analysis",
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };
  
  // Helper to render growth indicator
  const renderGrowthIndicator = (growth: number) => {
    const color = growth > 20 ? 'text-[#00CC44]'
      : growth > 0 ? 'text-[#00FF6A]'
      : growth === 0 ? 'text-gray-400'
      : 'text-red-500';
    
    const arrowIcon = growth > 0 ? '↑' 
      : growth === 0 ? '→'
      : '↓';
    
    return (
      <span className={`font-medium ${color}`}>
        {arrowIcon} {Math.abs(growth)}%
      </span>
    );
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={handleOpenDialog}
        {...buttonProps}
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        {!iconOnly && "Trend Analysis"}
        {!canUseTrendAnalysis && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        }
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
              AI Trend Analysis
            </DialogTitle>
            <DialogDescription>
              Analyze trending topics, hashtags, and content formats across social platforms
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="pt-2">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="analyze">Analyze Trends</TabsTrigger>
              <TabsTrigger value="results" disabled={!trendResult}>
                Results
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="analyze" className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <Select 
                    value={selectedPlatform} 
                    onValueChange={setSelectedPlatform}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map(platform => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trend Category</label>
                  <Select 
                    value={trendCategory} 
                    onValueChange={(value: any) => setTrendCategory(value as TrendCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trend category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hashtags">Hashtags</SelectItem>
                      <SelectItem value="topics">Topics</SelectItem>
                      <SelectItem value="content-types">Content Types</SelectItem>
                      <SelectItem value="keywords">Keywords</SelectItem>
                      <SelectItem value="industry-specific">Industry Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Period</label>
                  <Select 
                    value={timeframe} 
                    onValueChange={(value: any) => setTimeframe(value as TrendTimeframe)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24hours">Last 24 hours</SelectItem>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="90days">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry/Niche (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Fashion, Technology, Fitness"
                    value={industryInput}
                    onChange={(e: any) => setIndustryInput(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyzeTrends}
                  disabled={!selectedPlatform || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Trends"
                  )}
                </Button>
              </div>
              
              {trendResult && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Trend Analysis Results</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportTrends('pdf')}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportTrends('csv')}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-hidden border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {trendResult.trends.map((trend) => (
                          <tr key={trend.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trend.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {renderGrowthIndicator(trend.growthRate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trend.volume.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trend.relevanceScore.toFixed(1)}/10</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {trendResult.recommendations && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
                        {trendResult.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {timeframeLabels[trendResult.timeframe]} | Confidence: {(trendResult.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => handleTrendFeedback(true)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" /> Helpful
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => handleTrendFeedback(false)}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" /> Not Helpful
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="results" className="space-y-4 py-4">
              {trendResult ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      {categoryLabels[trendResult.category]} Trends on {platforms.find(p => p.id === selectedPlatform)?.name}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportTrends('pdf')}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-hidden border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {trendResult.trends.map((trend) => (
                          <tr key={trend.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trend.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {renderGrowthIndicator(trend.growthRate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trend.volume.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trend.relevanceScore.toFixed(1)}/10</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {trendResult.recommendations && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
                        {trendResult.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No trend analysis results yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper for rendering timeframe labels
const timeframeLabels: Record<TrendTimeframe, string> = {
  '24hours': 'Last 24 hours',
  '7days': 'Last 7 days',
  '30days': 'Last 30 days',
  '90days': 'Last 90 days'
};

// Helper for rendering category labels
const categoryLabels: Record<TrendCategory, string> = {
  'hashtags': 'Hashtag',
  'topics': 'Topic',
  'content-types': 'Content Type',
  'keywords': 'Keyword',
  'industry-specific': 'Industry'
};

export default TrendAnalysisButton; 