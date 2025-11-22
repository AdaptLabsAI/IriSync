import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Sparkles, RefreshCw, Copy, ThumbsUp, ThumbsDown, Loader2, PencilLine } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { useToast } from '../../ui/use-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Textarea } from '../../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';

export type CaptionTone = 
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'humorous'
  | 'inspirational'
  | 'promotional'
  | 'informative'
  | 'exciting';

export type CaptionLength = 
  | 'short'
  | 'medium'
  | 'long';

export interface CaptionGenerationButtonProps {
  /**
   * Current post text content
   */
  currentCaption?: string;
  /**
   * Keywords to use for generation
   */
  keywords?: string[];
  /**
   * Image description/content to use for generation
   */
  imageDescription?: string;
  /**
   * Platform to generate for
   */
  platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'auto';
  /**
   * Function to call when caption is generated and selected
   */
  onSelectCaption: (caption: string) => void;
  /**
   * Function to call to generate captions
   */
  onGenerateCaptions: (options: {
    currentCaption?: string;
    keywords?: string[];
    imageDescription?: string;
    platform?: string;
    tone?: CaptionTone;
    length?: CaptionLength;
    count?: number;
  }) => Promise<string[]>;
  /**
   * Function to report caption quality feedback
   */
  onCaptionFeedback?: (caption: string, positive: boolean) => Promise<void>;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
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
 * CaptionGenerationButton - Component for generating AI-powered captions for social media
 */
export const CaptionGenerationButton: React.FC<CaptionGenerationButtonProps> = ({
  currentCaption = '',
  keywords = [],
  imageDescription = '',
  platform = 'auto',
  onSelectCaption,
  onGenerateCaptions,
  onCaptionFeedback,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState<CaptionTone>('friendly');
  const [length, setLength] = useState<CaptionLength>('medium');
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { subscription } = useSubscription();
  
  const userTier = subscription?.tier || 'creator';

  // Determine maximum number of captions based on tier
  const getMaxCaptions = () => {
    switch (userTier) {
      case 'enterprise':
        return 6;
      case 'influencer':
        return 4;
      case 'creator':
        return 2;
      default:
        return 0;
    }
  };

  const maxCaptions = getMaxCaptions();

  // Check if AI caption generation is available based on subscription tier
  // All valid subscription tiers (creator, influencer, enterprise) have AI caption access
  const canGenerateCaptions = maxCaptions > 0;
  
  // Custom prompt available only for enterprise users
  const canUseCustomPrompt = userTier === 'enterprise';
  
  // Handle initiating caption generation
  const handleGenerateCaptions = async () => {
    if (!canGenerateCaptions || isGenerating) return;
    
    setIsGenerating(true);
    setSelectedCaptionIndex(null);
    
    try {
      const options = {
        currentCaption,
        keywords,
        imageDescription,
        platform,
        tone,
        length,
        count: maxCaptions,
        customPrompt: canUseCustomPrompt && customPrompt ? customPrompt : undefined,
      };
      
      const captions = await onGenerateCaptions(options);
      setGeneratedCaptions(captions);
    } catch (error) {
      console.error('Error generating captions:', error);
      toast({
        title: 'Caption Generation Failed',
        description: 'Failed to generate captions. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle selecting a caption
  const handleSelectCaption = (index: number) => {
    if (index < 0 || index >= generatedCaptions.length) return;
    
    setSelectedCaptionIndex(index);
  };
  
  // Handle applying the selected caption
  const handleApplyCaption = () => {
    if (selectedCaptionIndex === null) return;
    
    const selectedCaption = generatedCaptions[selectedCaptionIndex];
    onSelectCaption(selectedCaption);
    setIsOpen(false);
    
    toast({
      title: 'Caption Applied',
      description: 'The generated caption has been applied to your post.',
    });
  };
  
  // Handle submitting feedback on caption quality
  const handleCaptionFeedback = async (index: number, positive: boolean) => {
    if (!onCaptionFeedback || index < 0 || index >= generatedCaptions.length) return;
    
    try {
      await onCaptionFeedback(generatedCaptions[index], positive);
      
      toast({
        title: 'Feedback Submitted',
        description: `Thank you for your feedback! This helps improve future captions.`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error submitting caption feedback:', error);
    }
  };
  
  // Handle copying caption to clipboard
  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption).then(() => {
      toast({
        title: 'Caption Copied',
        description: 'Caption copied to clipboard.',
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };
  
  // Open dialog and auto-generate if applicable
  const handleOpenDialog = () => {
    if (!canGenerateCaptions) {
      toast({
        title: 'Feature Not Available',
        description: 'Caption generation requires a paid subscription. Please upgrade your plan.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsOpen(true);
    
    // Auto-generate captions if we have image description or keywords
    if ((imageDescription || keywords.length > 0) && generatedCaptions.length === 0) {
      setTimeout(() => {
        handleGenerateCaptions();
      }, 500);
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
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Generate Caption
      </Button>
      
      <Dialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          // Reset state when dialog closes
          setSelectedCaptionIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
              AI Caption Generator
            </DialogTitle>
            <DialogDescription>
              Generate engaging captions for your social media posts
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-4 pt-4">
              {generatedCaptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border rounded-md bg-gray-50">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                      <p className="text-sm text-gray-600">Generating creative captions...</p>
                    </>
                  ) : (
                    <>
                      <PencilLine className="h-10 w-10 text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 text-center mb-4">
                        Click the button below to generate AI-powered captions for your post.
                        {(imageDescription || keywords.length > 0) && (
                          <span className="block mt-1">
                            We'll use your {imageDescription ? 'image' : ''} 
                            {imageDescription && keywords.length > 0 ? ' and ' : ''}
                            {keywords.length > 0 ? 'keywords' : ''} for better results.
                          </span>
                        )}
                      </p>
                      <Button onClick={handleGenerateCaptions}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Captions
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedCaptions.map((caption, index) => (
                    <div 
                      key={index}
                      className={`relative p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedCaptionIndex === index 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectCaption(index)}
                    >
                      <p className="text-sm text-gray-700 whitespace-pre-wrap pr-16">
                        {caption}
                      </p>
                      
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {onCaptionFeedback && (
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e: any) => {
                                      e.stopPropagation();
                                      handleCaptionFeedback(index, true);
                                    }}
                                  >
                                    <ThumbsUp className="h-4 w-4 text-gray-500 hover:text-[#00CC44]" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Like this caption</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e: any) => {
                                      e.stopPropagation();
                                      handleCaptionFeedback(index, false);
                                    }}
                                  >
                                    <ThumbsDown className="h-4 w-4 text-gray-500 hover:text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Dislike this caption</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  handleCopyCaption(caption);
                                }}
                              >
                                <Copy className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy to clipboard</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="options" className="space-y-4 pt-4">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tone</label>
                  <RadioGroup
                    value={tone}
                    onValueChange={(value: any) => setTone(value as CaptionTone)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="professional" id="professional" />
                      <Label htmlFor="professional">Professional</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="casual" id="casual" />
                      <Label htmlFor="casual">Casual</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="friendly" id="friendly" />
                      <Label htmlFor="friendly">Friendly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="humorous" id="humorous" />
                      <Label htmlFor="humorous">Humorous</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="inspirational" id="inspirational" />
                      <Label htmlFor="inspirational">Inspirational</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="promotional" id="promotional" />
                      <Label htmlFor="promotional">Promotional</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="informative" id="informative" />
                      <Label htmlFor="informative">Informative</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exciting" id="exciting" />
                      <Label htmlFor="exciting">Exciting</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Length</label>
                  <RadioGroup
                    value={length}
                    onValueChange={(value: any) => setLength(value as CaptionLength)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="short" id="short" />
                      <Label htmlFor="short">Short</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="long" id="long" />
                      <Label htmlFor="long">Long</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {canUseCustomPrompt && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Prompt (Enterprise Only)</label>
                    <Textarea
                      placeholder="Enter custom instructions for the AI generator..."
                      value={customPrompt}
                      onChange={(e: any) => setCustomPrompt(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-gray-500">
                      Use custom instructions to guide the AI. For example: "Include a call to action" or "Reference our summer sale".
                    </p>
                  </div>
                )}
                
                {!canUseCustomPrompt && canGenerateCaptions && (
                  <div className="bg-blue-50 p-3 rounded-md flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Upgrade to Enterprise to unlock custom prompt instructions and more caption options.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between items-center">
            <div>
              {generatedCaptions.length > 0 && (
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={handleGenerateCaptions}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApplyCaption}
                disabled={selectedCaptionIndex === null}
              >
                Apply Caption
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaptionGenerationButton; 