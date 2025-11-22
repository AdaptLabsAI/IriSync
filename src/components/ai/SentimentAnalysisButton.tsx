import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { useAIToolkit } from '../../hooks/useAIToolkit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Loader2, BarChart, Lock, ThumbsUp, ThumbsDown } from 'lucide-react';

export interface SentimentResult {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
    disgust?: number;
  };
  tone?: string[];
  strength?: number;
  confidence: number;
  keywords?: Array<{
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }>;
  topics?: string[];
  summary?: string;
}

export interface SentimentAnalysisButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Current content to analyze
   */
  content?: string;
  /**
   * Callback for feedback on analysis quality
   */
  onAnalysisFeedback?: (analysisId: string, isHelpful: boolean) => Promise<void>;
  /**
   * Function to call to analyze sentiment
   */
  onAnalyzeSentiment?: (content: string, detailed?: boolean) => Promise<SentimentResult>;
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
 * SentimentAnalysisButton - A component for analyzing sentiment in social media content.
 * This component helps users understand the emotional tone of their content and how it might be perceived.
 * Different subscription tiers provide access to different levels of sentiment analysis detail.
 */
const SentimentAnalysisButton: React.FC<SentimentAnalysisButtonProps> = ({
  content = '',
  onAnalysisFeedback,
  onAnalyzeSentiment,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contentToAnalyze, setContentToAnalyze] = useState(content);
  const [detailedAnalysis, setDetailedAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SentimentResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string>('');
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { analyzeSentiment, loading, error } = useAIToolkit();
  
  const userTier = subscription?.tier || 'creator';
  
  // Check feature availability based on subscription tier
  const canUseSentimentAnalysis = userTier !== 'free';
  const canUseDetailedAnalysis = userTier === 'enterprise' || userTier === 'influencer';
  
  const handleOpenDialog = () => {
    if (!canUseSentimentAnalysis) {
      toast({
        title: "Feature not available",
        description: "Sentiment analysis requires a Creator subscription or higher",
        variant: "destructive"
      });
      return;
    }
    setIsOpen(true);
    setContentToAnalyze(content);
  };
  
  const handleAnalyze = async () => {
    if (!contentToAnalyze.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      // Use provided function or hook function
      const result = onAnalyzeSentiment 
        ? await onAnalyzeSentiment(contentToAnalyze, detailedAnalysis)
        : await analyzeSentiment(contentToAnalyze, detailedAnalysis);
      
      setAnalysisResult(result);
      setAnalysisId(Date.now().toString()); // Simple ID for feedback
      
      toast({
        title: "Analysis complete",
        description: "Your content's sentiment has been analyzed",
      });
    } catch (err) {
      console.error('Error analyzing sentiment:', err);
      toast({
        title: "Analysis failed",
        description: typeof error === 'string' ? error : error?.message || "Failed to analyze sentiment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleDetailedToggle = (value: string) => {
    const isDetailed = value === 'detailed';
    
    if (isDetailed && !canUseDetailedAnalysis) {
      toast({
        title: "Feature not available",
        description: "Detailed sentiment analysis requires Influencer or Enterprise subscription",
        variant: "destructive"
      });
      return;
    }
    
    setDetailedAnalysis(isDetailed);
    setAnalysisResult(null); // Clear previous results when switching modes
  };
  
  const handleAnalysisFeedback = async (isHelpful: boolean) => {
    if (!onAnalysisFeedback || !analysisId) return;
    
    try {
      await onAnalysisFeedback(analysisId, isHelpful);
      
      toast({
        title: "Thank you for your feedback",
        description: isHelpful 
          ? "We're glad the analysis was helpful" 
          : "We'll work on improving our analysis",
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };
  
  // Helper to render sentiment color classes
  const getSentimentColorClass = (sentiment: string, isBg = false) => {
    const prefix = isBg ? 'bg-' : 'text-';
    switch (sentiment) {
      case 'positive':
        return isBg ? 'bg-[#00FF6A]/10' : 'text-[#00CC44]';
      case 'negative':
        return `${prefix}red-500`;
      case 'neutral':
        return `${prefix}gray-500`;
      case 'mixed':
        return `${prefix}amber-500`;
      default:
        return `${prefix}gray-500`;
    }
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
        <BarChart className="h-4 w-4 mr-2" />
        {!iconOnly && "Sentiment Analysis"}
        {!canUseSentimentAnalysis && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          // Reset state when dialog closes
          setAnalysisResult(null);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BarChart className="h-5 w-5 text-blue-500 mr-2" />
              Sentiment Analysis
            </DialogTitle>
            <DialogDescription>
              Analyze the emotional tone and sentiment of your content
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Tabs 
              defaultValue="basic" 
              onValueChange={handleDetailedToggle}
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger 
                  value="detailed" 
                  disabled={!canUseDetailedAnalysis}
                  className="relative"
                >
                  Detailed
                  {!canUseDetailedAnalysis && <Lock className="h-3 w-3 absolute top-1 right-1" />}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-2">
                <div className="text-sm text-gray-500">
                  Basic sentiment analysis provides overall sentiment and score.
                </div>
              </TabsContent>
              
              <TabsContent value="detailed" className="space-y-4 mt-2">
                <div className="text-sm text-gray-500">
                  Detailed analysis includes emotions, keyword sentiments, and topic detection.
                  {!canUseDetailedAnalysis && (
                    <div className="mt-1 text-xs text-amber-600">
                      Requires Influencer or Enterprise subscription
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <Textarea
              value={contentToAnalyze}
              onChange={(e: any) => setContentToAnalyze(e.target.value)}
              placeholder="Enter content to analyze sentiment..."
              rows={5}
            />
            
            <div className="flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={!contentToAnalyze.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Sentiment"
                )}
              </Button>
            </div>
            
            {analysisResult && (
              <div className="mt-6 border rounded-md p-4">
                <h3 className="text-lg font-medium mb-4">Sentiment Analysis Results</h3>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-base font-medium">Overall Sentiment</div>
                    <div className={`font-medium capitalize ${getSentimentColorClass(analysisResult.overall)}`}>
                      {analysisResult.overall}
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${getSentimentColorClass(analysisResult.overall, true)}`} 
                      style={{ width: `${Math.abs(analysisResult.score) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <div>Negative</div>
                    <div>Neutral</div>
                    <div>Positive</div>
                  </div>
                  
                  <div className="text-sm mt-2">
                    Score: <span className="font-medium">{analysisResult.score.toFixed(2)}</span>
                    {analysisResult.confidence && (
                      <span className="ml-4">
                        Confidence: <span className="font-medium">{(analysisResult.confidence * 100).toFixed(0)}%</span>
                      </span>
                    )}
                  </div>
                </div>
                
                {detailedAnalysis && analysisResult.emotions && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Emotional Analysis</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(analysisResult.emotions).map(([emotion, value]) => (
                        <div key={emotion} className="flex items-center">
                          <div className="w-20 text-sm capitalize">{emotion}:</div>
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-blue-500" 
                                style={{ width: `${(value as number) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="w-12 text-right text-sm">
                            {typeof value === 'number' ? (value * 100).toFixed(0) : value}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {detailedAnalysis && analysisResult.keywords && analysisResult.keywords.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Keyword Sentiment</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {analysisResult.keywords.map((keyword, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                          <div>{keyword.text}</div>
                          <div className={`font-medium capitalize ${getSentimentColorClass(keyword.sentiment)}`}>
                            {keyword.sentiment}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {detailedAnalysis && analysisResult.topics && analysisResult.topics.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Detected Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.topics.map((topic, idx) => (
                        <span 
                          key={idx}
                          className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {detailedAnalysis && analysisResult.summary && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-gray-700">{analysisResult.summary}</p>
                  </div>
                )}
                
                <div className="flex justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Was this analysis helpful?</span>
                    <Button
                      variant="ghost"
                      size="small"
                      className="h-8 w-8 p-0"
                      onClick={() => handleAnalysisFeedback(true)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      className="h-8 w-8 p-0"
                      onClick={() => handleAnalysisFeedback(false)}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {detailedAnalysis && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <span className="mr-1">Analysis powered by</span>
                      <span className="font-semibold">IriSync AI</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SentimentAnalysisButton; 