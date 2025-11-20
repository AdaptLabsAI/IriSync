import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { useAIToolkit } from '../../hooks/useAIToolkit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea/Textarea';
import { Input } from '../ui/input/Input';
import { Loader2, Image, Lock, Copy, Download, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';

export type ImageStyle = 'realistic' | 'artistic' | 'cartoon' | 'sketch' | 'minimalist' | 'abstract' | 'vintage' | 'cinematic';
export type ImageAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type ImageSize = 'small' | 'medium' | 'large';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: ImageStyle;
  aspectRatio: ImageAspectRatio;
  size: ImageSize;
  timestamp: Date;
}

export interface ImageGenerationButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Default prompt to start with
   */
  defaultPrompt?: string;
  /**
   * Callback when an image is selected
   */
  onSelectImage?: (image: GeneratedImage) => void;
  /**
   * Callback for feedback on generated image quality
   */
  onImageFeedback?: (imageId: string, isHelpful: boolean) => Promise<void>;
  /**
   * Function to call to generate images
   */
  onGenerateImage?: (prompt: string, style: ImageStyle, aspectRatio: ImageAspectRatio, size: ImageSize) => Promise<GeneratedImage>;
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
 * ImageGenerationButton - A component for generating images with AI for social media.
 * This component helps users create custom images for their posts without needing design skills.
 * Different subscription tiers provide access to different image sizes and styles.
 */
const ImageGenerationButton: React.FC<ImageGenerationButtonProps> = ({
  defaultPrompt = '',
  onSelectImage,
  onImageFeedback,
  onGenerateImage,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptText, setPromptText] = useState(defaultPrompt);
  const [imageStyle, setImageStyle] = useState<ImageStyle>('realistic');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('medium');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { generateImage, loading, error } = useAIToolkit();
  
  const userTier = subscription?.tier || 'creator';
  
  // Check feature availability based on subscription tier
  const canUseImageGenerator = userTier !== 'free';
  const canUseAdvancedStyles = userTier === 'enterprise' || userTier === 'influencer';
  const canUseLargeSize = userTier === 'enterprise';
  
  // Determine maximum regeneration count based on tier
  const getMaxRegenerations = () => {
    switch (userTier) {
      case 'enterprise':
        return 10;
      case 'influencer':
        return 5;
      case 'creator':
        return 3;
      default:
        return 0;
    }
  };
  
  const maxRegenerations = getMaxRegenerations();
  
  const handleOpenDialog = () => {
    if (!canUseImageGenerator) {
      toast({
        title: "Feature not available",
        description: "Image generation requires a Creator subscription or higher",
        variant: "destructive"
      });
      return;
    }
    setIsOpen(true);
    setPromptText(defaultPrompt);
  };
  
  const handleGenerateImage = async () => {
    if (!promptText.trim() || isGenerating) return;
    
    // Validate image size based on subscription
    if (imageSize === 'large' && !canUseLargeSize) {
      toast({
        title: "Size not available",
        description: "Large images require an Enterprise subscription",
        variant: "destructive"
      });
      return;
    }
    
    // Validate advanced styles
    if (['cinematic', 'abstract', 'vintage'].includes(imageStyle) && !canUseAdvancedStyles) {
      toast({
        title: "Style not available",
        description: "Advanced styles require an Influencer or Enterprise subscription",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Use provided function or hook function
      const image = onGenerateImage 
        ? await onGenerateImage(promptText, imageStyle, aspectRatio, imageSize)
        : await generateImage(promptText, imageStyle, aspectRatio, imageSize);
      
      setGeneratedImage(image);
      setRegenerateCount(0);
      
      toast({
        title: "Image generated",
        description: "Your AI image has been created successfully",
      });
    } catch (err) {
      console.error('Error generating image:', err);
      toast({
        title: "Generation failed",
        description: error || "Failed to generate image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleRegenerateImage = async () => {
    if (isGenerating || regenerateCount >= maxRegenerations) return;
    
    setIsGenerating(true);
    
    try {
      // Use provided function or hook function with the same settings
      const image = onGenerateImage 
        ? await onGenerateImage(promptText, imageStyle, aspectRatio, imageSize)
        : await generateImage(promptText, imageStyle, aspectRatio, imageSize);
      
      setGeneratedImage(image);
      setRegenerateCount(prev => prev + 1);
      
      toast({
        title: "Image regenerated",
        description: `Regeneration ${regenerateCount + 1}/${maxRegenerations} successful`,
      });
    } catch (err) {
      console.error('Error regenerating image:', err);
      toast({
        title: "Regeneration failed",
        description: error || "Failed to regenerate image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSelectImage = () => {
    if (!generatedImage || !onSelectImage) return;
    
    onSelectImage(generatedImage);
    setIsOpen(false);
    
    toast({
      title: "Image selected",
      description: "The generated image has been added to your content",
    });
  };
  
  const handleDownloadImage = () => {
    if (!generatedImage) return;
    
    // Create temporary link element to download the image
    const link = document.createElement('a');
    link.href = generatedImage.url;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Image downloaded",
      description: "Your generated image has been downloaded",
    });
  };
  
  const handleCopyPrompt = () => {
    if (!promptText.trim()) return;
    
    navigator.clipboard.writeText(promptText);
    
    toast({
      title: "Prompt copied",
      description: "The image prompt has been copied to clipboard",
    });
  };
  
  const handleImageFeedback = async (isHelpful: boolean) => {
    if (!onImageFeedback || !generatedImage) return;
    
    try {
      await onImageFeedback(generatedImage.id, isHelpful);
      
      toast({
        title: "Thank you for your feedback",
        description: "Your feedback helps us improve image generation",
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
        <Image className="h-4 w-4 mr-2" />
        {!iconOnly && "Generate Image"}
        {!canUseImageGenerator && <Lock className="h-3 w-3 ml-1" />}
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
              <Image className="h-5 w-5 text-blue-500 mr-2" />
              AI Image Generator
            </DialogTitle>
            <DialogDescription>
              Create custom images for your social media content
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image Prompt</label>
              <Textarea
                value={promptText}
                onChange={(e: any) => setPromptText(e.target.value)}
                placeholder="Describe the image you want to generate..."
                rows={3}
              />
              
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  disabled={!promptText.trim()}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Prompt
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Style</label>
                <Select 
                  value={imageStyle} 
                  onValueChange={(value: any) => setImageStyle(value as ImageStyle)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="artistic">Artistic</SelectItem>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                    <SelectItem value="sketch">Sketch</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    
                    {canUseAdvancedStyles && (
                      <>
                        <SelectItem value="abstract">Abstract</SelectItem>
                        <SelectItem value="vintage">Vintage</SelectItem>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                
                {!canUseAdvancedStyles && (
                  <div className="text-xs text-amber-600">
                    Advanced styles require Influencer or Enterprise tier
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Aspect Ratio</label>
                <Select 
                  value={aspectRatio} 
                  onValueChange={(value: any) => setAspectRatio(value as ImageAspectRatio)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">Square (1:1)</SelectItem>
                    <SelectItem value="4:3">Landscape (4:3)</SelectItem>
                    <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                    <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                    <SelectItem value="9:16">Story (9:16)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Size</label>
                <Select 
                  value={imageSize} 
                  onValueChange={(value: any) => setImageSize(value as ImageSize)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large" disabled={!canUseLargeSize}>
                      Large {!canUseLargeSize && '(Enterprise only)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {!canUseLargeSize && (
                  <div className="text-xs text-amber-600">
                    Large size requires Enterprise tier
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleGenerateImage}
                disabled={!promptText.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Image"
                )}
              </Button>
            </div>
            
            {generatedImage && (
              <div className="mt-6 border rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">Generated Image</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImageFeedback(true)}
                      className="h-8 w-8 p-0"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImageFeedback(false)}
                      className="h-8 w-8 p-0"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="relative bg-gray-100 rounded-md flex items-center justify-center">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-md">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  ) : null}
                  
                  <img 
                    src={generatedImage.url} 
                    alt={generatedImage.prompt}
                    className={`max-w-full max-h-[400px] mx-auto object-contain rounded-md ${isGenerating ? 'opacity-50' : ''}`}
                  />
                </div>
                
                <div className="flex justify-between mt-4 space-x-2">
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateImage}
                      disabled={isGenerating || regenerateCount >= maxRegenerations}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Regenerate ({regenerateCount}/{maxRegenerations})
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadImage}
                      disabled={isGenerating}
                      className="ml-2"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleSelectImage}
                    disabled={isGenerating}
                  >
                    Use This Image
                  </Button>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Settings:</span> {imageStyle}, {aspectRatio}, {imageSize}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageGenerationButton; 