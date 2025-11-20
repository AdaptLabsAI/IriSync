import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { useAIToolkit } from '../../hooks/useAIToolkit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Loader2, Users, Lock, Download, Calendar, ThumbsUp, ThumbsDown } from 'lucide-react';
import { SocialPlatform } from '../../lib/models/SocialAccount';

export type InsightTimeframe = '7days' | '30days' | '90days' | 'all';
export type InsightType = 'demographics' | 'interests' | 'behavior' | 'growth' | 'engagement';

export interface AudienceSegment {
  id: string;
  name: string;
  percentage: number;
  count?: number;
}

export interface AudienceInsight {
  id: string;
  platform: SocialPlatform;
  type: InsightType;
  title: string;
  description: string;
  segments: AudienceSegment[];
  timeframe: InsightTimeframe;
  timestamp: Date;
  confidence: number;
}

export interface AudienceInsightButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Connected social platforms to analyze
   */
  platforms?: Array<{id: string, name: string, type: SocialPlatform}>;
  /**
   * Callback for when insights are generated
   */
  onGenerateInsights?: (platformId: string, insightType: InsightType, timeframe: InsightTimeframe) => Promise<AudienceInsight[]>;
  /**
   * Callback for feedback on insight quality
   */
  onInsightFeedback?: (insightId: string, isHelpful: boolean) => Promise<void>;
  /**
   * Callback for exporting insights
   */
  onExportInsights?: (insights: AudienceInsight[], format: 'pdf' | 'csv' | 'json') => Promise<string>;
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
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * AudienceInsightButton - A component that provides AI-powered audience insights.
 * This component helps users understand their audience demographics, interests, and behaviors.
 * This feature is available on Influencer and Enterprise tiers.
 */
const AudienceInsightButton: React.FC<AudienceInsightButtonProps> = ({
  platforms = [],
  onGenerateInsights,
  onInsightFeedback,
  onExportInsights,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(platforms.length > 0 ? platforms[0].id : '');
  const [insightType, setInsightType] = useState<InsightType>('demographics');
  const [timeframe, setTimeframe] = useState<InsightTimeframe>('30days');
  const [insights, setInsights] = useState<AudienceInsight[]>([]);
  const [activeTab, setActiveTab] = useState('insights');
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { generateAudienceInsights, loading, error } = useAIToolkit();
  
  const userTier = subscription?.tier || 'creator';
  
  // Check feature availability based on subscription tier
  const canUseAudienceInsights = userTier === 'enterprise' || userTier === 'influencer';
  
  const handleOpenDialog = () => {
    if (!canUseAudienceInsights) {
      toast({
        title: "Feature not available",
        description: "Audience insights require an Influencer or Enterprise subscription",
        variant: "destructive"
      });
      return;
    }
    
    if (platforms.length === 0) {
      toast({
        title: "No platforms connected",
        description: "Connect a social platform to analyze audience insights",
        variant: "destructive"
      });
      return;
    }
    
    setIsOpen(true);
  };
  
  const handleGenerateInsights = async () => {
    if (!selectedPlatform || isGenerating) return;
    
    setIsGenerating(true);
    setInsights([]);
    
    try {
      // Use provided function or hook function
      const result = onGenerateInsights 
        ? await onGenerateInsights(selectedPlatform, insightType, timeframe)
        : await generateAudienceInsights(selectedPlatform, insightType, timeframe);
      
      setInsights(result);
      
      toast({
        title: "Insights generated",
        description: `Generated ${result.length} insights for your audience`,
      });
    } catch (err) {
      console.error('Error generating audience insights:', err);
      toast({
        title: "Generation failed",
        description: error || "Failed to generate audience insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleExportInsights = async (format: 'pdf' | 'csv' | 'json') => {
    if (!onExportInsights || insights.length === 0) return;
    
    try {
      const url = await onExportInsights(insights, format);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = url;
      link.download = `audience-insights-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: `Insights exported as ${format.toUpperCase()}`,
      });
    } catch (err) {
      console.error('Error exporting insights:', err);
      toast({
        title: "Export failed",
        description: "Failed to export insights. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleInsightFeedback = async (insightId: string, isHelpful: boolean) => {
    if (!onInsightFeedback) return;
    
    try {
      await onInsightFeedback(insightId, isHelpful);
      
      toast({
        title: "Thank you for your feedback",
        description: "Your feedback helps us improve our insights",
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };
  
  // Helper to render graph bars
  const renderBar = (percentage: number, color: string = 'bg-blue-500') => {
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
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
        <Users className="h-4 w-4 mr-2" />
        {!iconOnly && "Audience Insights"}
        {!canUseAudienceInsights && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open: any) => {
          setIsOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              AI Audience Insights
            </DialogTitle>
            <DialogDescription>
              Analyze your audience demographics, interests, and behaviors
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="pt-2">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="insights">Generate Insights</TabsTrigger>
              <TabsTrigger value="history" disabled={insights.length === 0}>
                Results ({insights.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="insights" className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="text-sm font-medium">Insight Type</label>
                  <Select
                    value={insightType}
                    onValueChange={(value: any) => setInsightType(value as InsightType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select insight type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demographics">Demographics</SelectItem>
                      <SelectItem value="interests">Interests</SelectItem>
                      <SelectItem value="behavior">Behavior</SelectItem>
                      <SelectItem value="growth">Growth Trends</SelectItem>
                      <SelectItem value="engagement">Engagement Patterns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Period</label>
                  <Select
                    value={timeframe}
                    onValueChange={(value: any) => setTimeframe(value as InsightTimeframe)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="90days">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateInsights}
                  disabled={!selectedPlatform || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Generate Insights"
                  )}
                </Button>
              </div>
              
              {insights.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Generated Insights</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportInsights('pdf')}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportInsights('csv')}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <div key={insight.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-base font-medium">{insight.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInsightFeedback(insight.id, true)}
                              className="h-7 w-7 p-0"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInsightFeedback(insight.id, false)}
                              className="h-7 w-7 p-0"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          {insight.segments.map((segment, idx) => (
                            <div key={idx} className="flex items-center">
                              <div className="w-36 text-sm truncate pr-2">{segment.name}</div>
                              <div className="flex-1">
                                {renderBar(segment.percentage)}
                              </div>
                              <div className="w-16 text-right text-sm">{segment.percentage}%</div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between mt-3 pt-2 border-t text-xs text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {timeframeLabels[insight.timeframe]}
                          </div>
                          <div>
                            Confidence: {(insight.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4 py-4">
              {insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div key={insight.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-base font-medium">{insight.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInsightFeedback(insight.id, true)}
                            className="h-7 w-7 p-0"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInsightFeedback(insight.id, false)}
                            className="h-7 w-7 p-0"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        {insight.segments.map((segment, idx) => (
                          <div key={idx} className="flex items-center">
                            <div className="w-36 text-sm truncate pr-2">{segment.name}</div>
                            <div className="flex-1">
                              {renderBar(segment.percentage)}
                            </div>
                            <div className="w-16 text-right text-sm">{segment.percentage}%</div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between mt-3 pt-2 border-t text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {timeframeLabels[insight.timeframe]}
                        </div>
                        <div>
                          Confidence: {(insight.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No insights generated yet</p>
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
const timeframeLabels: Record<InsightTimeframe, string> = {
  '7days': 'Last 7 days',
  '30days': 'Last 30 days',
  '90days': 'Last 90 days',
  'all': 'All time'
};

export default AudienceInsightButton; 