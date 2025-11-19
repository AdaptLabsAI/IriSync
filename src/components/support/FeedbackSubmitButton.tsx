import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { 
  MessageSquarePlus, 
  Send, 
  Loader2, 
  Star,
  SmilePlus,
  FrownIcon,
  Lightbulb,
  ThumbsUp,
  Camera,
  PaperclipIcon,
  XCircle
} from 'lucide-react';

export type FeedbackType = 'bug' | 'feature' | 'experience' | 'general';

export interface FeedbackSubmitButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Current page or feature to pre-fill in the feedback form
   */
  currentContext?: string;
  /**
   * Function to submit feedback
   */
  onSubmitFeedback?: (feedback: {
    type: FeedbackType;
    rating?: number;
    content: string;
    context: string;
    email?: string;
    screenshot?: File;
  }) => Promise<void>;
  /**
   * Whether to show the email field
   */
  showEmailField?: boolean;
  /**
   * Whether to allow screenshot uploads
   */
  allowScreenshots?: boolean;
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
 * FeedbackSubmitButton - A component for collecting user feedback.
 * This component allows users to submit bugs, feature requests, or general feedback about the platform.
 */
const FeedbackSubmitButton: React.FC<FeedbackSubmitButtonProps> = ({
  currentContext = '',
  onSubmitFeedback,
  showEmailField = true,
  allowScreenshots = true,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [rating, setRating] = useState<number | null>(null);
  const [context, setContext] = useState(currentContext);
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleOpenDialog = () => {
    setIsOpen(true);
    resetForm();
  };
  
  const resetForm = () => {
    setFeedbackType('general');
    setRating(null);
    setContext(currentContext);
    setContent('');
    setEmail('');
    setScreenshot(null);
    setPreviewUrl(null);
    setSubmitted(false);
  };
  
  const handleSubmit = async () => {
    if (!onSubmitFeedback) return;
    
    if (!content.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide some feedback content",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmitFeedback({
        type: feedbackType,
        rating: rating ?? undefined,
        content,
        context,
        email: email.trim() || undefined,
        screenshot: screenshot || undefined
      });
      
      setSubmitted(true);
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback. We appreciate your input!"
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast({
        title: "Submission failed",
        description: "We couldn't submit your feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);
      
      // Generate a preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  };
  
  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setPreviewUrl(null);
  };
  
  const getFeedbackTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'bug': return <FrownIcon className="h-5 w-5" />;
      case 'feature': return <Lightbulb className="h-5 w-5" />;
      case 'experience': return <SmilePlus className="h-5 w-5" />;
      case 'general': return <MessageSquarePlus className="h-5 w-5" />;
    }
  };
  
  const getFeedbackTypeLabel = (type: FeedbackType) => {
    switch (type) {
      case 'bug': return 'Report a bug';
      case 'feature': return 'Request a feature';
      case 'experience': return 'Share your experience';
      case 'general': return 'General feedback';
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
        <MessageSquarePlus className="h-4 w-4 mr-2" />
        {!iconOnly && "Feedback"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageSquarePlus className="h-5 w-5 text-blue-500 mr-2" />
              {submitted ? "Thank you for your feedback!" : "Submit Feedback"}
            </DialogTitle>
            <DialogDescription>
              {submitted 
                ? "Your feedback helps us improve our product and services."
                : "Your feedback is valuable to us and helps improve our product."}
            </DialogDescription>
          </DialogHeader>
          
          {submitted ? (
            <div className="py-6 flex flex-col items-center text-center">
              <ThumbsUp className="h-16 w-16 text-[#00CC44] mb-4" />
              <h3 className="text-xl font-medium mb-2">Feedback Received</h3>
              <p className="text-gray-600 mb-6">
                Thank you for taking the time to share your thoughts with us. 
                We appreciate your input and will use it to make improvements.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsOpen(false);
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {/* Feedback type selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Feedback Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['bug', 'feature', 'experience', 'general'] as FeedbackType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`flex items-center px-3 py-2 rounded-md border transition-colors ${
                        feedbackType === type 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFeedbackType(type)}
                    >
                      <span className={`mr-2 ${feedbackType === type ? 'text-blue-500' : 'text-gray-500'}`}>
                        {getFeedbackTypeIcon(type)}
                      </span>
                      <span className="text-sm">{getFeedbackTypeLabel(type)}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Rating (only for experience feedback) */}
              {feedbackType === 'experience' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Rating</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`p-2 rounded-full ${
                          rating === value ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                        }`}
                        onClick={() => setRating(value)}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Context */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Which area are you providing feedback on?</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Dashboard, Content Calendar, Analytics, etc."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>
              
              {/* Feedback content */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Feedback</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md min-h-[120px]"
                  placeholder={feedbackType === 'bug' 
                    ? "Please describe the issue you encountered in detail. What happened? What did you expect to happen?" 
                    : feedbackType === 'feature' 
                      ? "Please describe the feature you'd like to see. How would it help you?" 
                      : "Share your thoughts or suggestions with us..."
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              
              {/* Screenshot upload (for bugs and features) */}
              {allowScreenshots && (feedbackType === 'bug' || feedbackType === 'feature') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <span>Screenshot</span>
                    <span className="ml-1 text-xs text-gray-500">(optional)</span>
                  </label>
                  
                  {!screenshot ? (
                    <div className="border border-dashed rounded-md p-4 text-center">
                      <button
                        type="button"
                        onClick={() => document.getElementById('screenshot-upload')?.click()}
                        className="flex flex-col items-center w-full text-gray-500 hover:text-blue-500"
                      >
                        <Camera className="h-8 w-8 mb-2" />
                        <span className="text-sm">Click to add a screenshot</span>
                        <span className="text-xs mt-1">Supports PNG, JPG up to 5MB</span>
                      </button>
                      <input
                        id="screenshot-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotChange}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={previewUrl!} 
                        alt="Screenshot Preview" 
                        className="max-h-[200px] rounded-md mx-auto border"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="absolute top-2 right-2 bg-white text-red-500 rounded-full p-1 shadow-sm hover:text-red-700"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Email for follow-up */}
              {showEmailField && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <span>Your Email</span>
                    <span className="ml-1 text-xs text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="In case we need to follow up"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || isSubmitting}
                  className="space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackSubmitButton; 