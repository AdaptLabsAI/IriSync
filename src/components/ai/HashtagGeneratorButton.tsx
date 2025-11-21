import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { useAIToolkit } from '../../hooks/useAIToolkit';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea/Textarea';
import { Input } from '../ui/input/Input';
import { Loader2, Hash, Lock, X, Copy, Trash, Plus } from 'lucide-react';
import { SocialPlatform } from '../../lib/models/SocialAccount';
import { Badge } from '../ui/badge';

export interface HashtagGeneratorButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Current content to generate hashtags for
   */
  content?: string;
  /**
   * Platform to generate hashtags for
   */
  platform?: SocialPlatform | 'auto';
  /**
   * Callback when hashtags are selected
   */
  onSelectHashtags?: (hashtags: string[]) => void;
  /**
   * Existing hashtags that are already selected
   */
  existingHashtags?: string[];
  /**
   * Callback for feedback on hashtag quality
   */
  onHashtagFeedback?: (hashtags: string[], isHelpful: boolean) => Promise<void>;
  /**
   * Function to call to generate hashtags
   */
  onGenerateHashtags?: (content: string, platform: string, count: number) => Promise<string[]>;
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
 * HashtagGeneratorButton - A component for generating relevant hashtags for social media posts.
 * This component helps users discover popular and relevant hashtags to improve content visibility.
 * Different subscription tiers provide access to different numbers of hashtag suggestions.
 */
const HashtagGeneratorButton: React.FC<HashtagGeneratorButtonProps> = ({
  content = '',
  platform = 'auto',
  onSelectHashtags,
  existingHashtags = [],
  onHashtagFeedback,
  onGenerateHashtags,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(platform.toString());
  const [contentToAnalyze, setContentToAnalyze] = useState(content);
  const [hashtagCount, setHashtagCount] = useState(5);
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>(existingHashtags);
  const [customHashtag, setCustomHashtag] = useState('');
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { suggestHashtags, loading, error } = useAIToolkit();
  
  const userTier = subscription?.tier || 'creator';
  
  // Check feature availability based on subscription tier
  const canUseHashtagGenerator = userTier !== 'free';
  
  // Determine maximum hashtags based on tier
  const getMaxHashtags = () => {
    switch (userTier) {
      case 'enterprise':
        return 20;
      case 'influencer':
        return 15;
      case 'creator':
        return 10;
      default:
        return 5;
    }
  };
  
  const maxHashtags = getMaxHashtags();
  
  const handleOpenDialog = () => {
    if (!canUseHashtagGenerator) {
      toast({
        title: "Feature not available",
        description: "Hashtag generator requires a Creator subscription or higher",
        variant: "destructive"
      });
      return;
    }
    setIsOpen(true);
    setContentToAnalyze(content);
    setSelectedHashtags(existingHashtags);
  };
  
  const handleGenerateHashtags = async () => {
    if (!contentToAnalyze.trim() || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Use provided function or hook function
      const hashtags = onGenerateHashtags 
        ? await onGenerateHashtags(contentToAnalyze, selectedPlatform, hashtagCount)
        : await suggestHashtags(contentToAnalyze, selectedPlatform as SocialPlatform, hashtagCount);
      
      if (typeof hashtags === 'object' && 'hashtags' in hashtags) {
        // Handle case where suggestHashtags returns an object with hashtags property
        setGeneratedHashtags(hashtags.hashtags);
      } else {
        // Handle case where the function returns an array directly
        setGeneratedHashtags(hashtags as string[]);
      }
      
      toast({
        title: "Hashtags generated",
        description: `Generated ${hashtags.length} hashtags for your content`,
      });
    } catch (err) {
      console.error('Error generating hashtags:', err);
      toast({
        title: "Generation failed",
        description: typeof error === 'string' ? error : error?.message || "Failed to generate hashtags. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSelectHashtag = (hashtag: string) => {
    if (selectedHashtags.includes(hashtag)) {
      setSelectedHashtags(selectedHashtags.filter(h => h !== hashtag));
    } else {
      if (selectedHashtags.length >= maxHashtags) {
        toast({
          title: "Maximum hashtags reached",
          description: `You can only select up to ${maxHashtags} hashtags with your current plan`,
          variant: "destructive"
        });
        return;
      }
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };
  
  const handleAddCustomHashtag = () => {
    if (!customHashtag.trim()) return;
    
    const formatted = customHashtag.trim().startsWith('#') 
      ? customHashtag.trim() 
      : `#${customHashtag.trim()}`;
    
    // Remove spaces and special characters except underscore
    const sanitized = formatted.replace(/[^\w#]/g, '');
    
    if (selectedHashtags.includes(sanitized)) {
      toast({
        title: "Duplicate hashtag",
        description: "This hashtag is already selected",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedHashtags.length >= maxHashtags) {
      toast({
        title: "Maximum hashtags reached",
        description: `You can only select up to ${maxHashtags} hashtags with your current plan`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedHashtags([...selectedHashtags, sanitized]);
    setCustomHashtag('');
  };
  
  const handleRemoveHashtag = (hashtag: string) => {
    setSelectedHashtags(selectedHashtags.filter(h => h !== hashtag));
  };
  
  const handleClearHashtags = () => {
    setSelectedHashtags([]);
  };
  
  const handleSubmitHashtags = () => {
    if (onSelectHashtags) {
      onSelectHashtags(selectedHashtags);
    }
    setIsOpen(false);
  };
  
  const handleCopyHashtags = () => {
    if (selectedHashtags.length === 0) return;
    
    const hashtagsText = selectedHashtags.join(' ');
    navigator.clipboard.writeText(hashtagsText);
    
    toast({
      title: "Hashtags copied",
      description: "The selected hashtags have been copied to clipboard",
    });
  };
  
  const handleHashtagFeedback = async (isHelpful: boolean) => {
    if (!onHashtagFeedback || generatedHashtags.length === 0) return;
    
    try {
      await onHashtagFeedback(generatedHashtags, isHelpful);
      
      toast({
        title: "Thank you for your feedback",
        description: "Your feedback helps us improve hashtag suggestions",
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
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
        <Hash className="h-4 w-4 mr-2" />
        {!iconOnly && "Generate Hashtags"}
        {!canUseHashtagGenerator && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Hash className="h-5 w-5 text-blue-500 mr-2" />
              Hashtag Generator
            </DialogTitle>
            <DialogDescription>
              Generate relevant hashtags for your content to increase visibility
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={contentToAnalyze}
                onChange={(e: any) => setContentToAnalyze(e.target.value)}
                placeholder="Enter content to generate hashtags for..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Number of hashtags</label>
                  <span className="text-xs text-gray-500">{hashtagCount}</span>
                </div>
                <Slider 
                  min={3} 
                  max={Math.min(maxHashtags, 15)} 
                  step={1}
                  value={[hashtagCount]}
                  onValueChange={(value: any) => setHashtagCount(value[0])}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleGenerateHashtags}
                disabled={!contentToAnalyze.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Hashtags"
                )}
              </Button>
            </div>
            
            {generatedHashtags.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Generated Hashtags</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleHashtagFeedback(true)}
                      className="h-8 px-2"
                    >
                      <span className="sr-only">Helpful</span>
                      👍
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleHashtagFeedback(false)}
                      className="h-8 px-2"
                    >
                      <span className="sr-only">Not helpful</span>
                      👎
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
                  {generatedHashtags.map((hashtag, index) => (
                    <Badge 
                      key={index}
                      variant={selectedHashtags.includes(hashtag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleSelectHashtag(hashtag)}
                    >
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Selected Hashtags ({selectedHashtags.length}/{maxHashtags})</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleClearHashtags}
                    disabled={selectedHashtags.length === 0}
                    className="h-8 w-8 p-0"
                  >
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Clear all</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCopyHashtags}
                    disabled={selectedHashtags.length === 0}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy all</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 p-2 min-h-[60px] border rounded-md bg-white">
                {selectedHashtags.length > 0 ? (
                  selectedHashtags.map((hashtag, index) => (
                    <Badge 
                      key={index}
                      className="pr-1 flex items-center gap-1"
                    >
                      {hashtag}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveHashtag(hashtag)}
                        className="h-4 w-4 p-0 hover:bg-transparent"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                    No hashtags selected
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add custom hashtag..."
                  value={customHashtag}
                  onChange={(e: any) => setCustomHashtag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomHashtag();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleAddCustomHashtag}
                  disabled={!customHashtag.trim()}
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add</span>
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmitHashtags}
                disabled={selectedHashtags.length === 0}
              >
                Use Selected Hashtags
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HashtagGeneratorButton; 