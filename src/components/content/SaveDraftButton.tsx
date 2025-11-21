import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button/Button';
import { useToast } from '../../ui/use-toast';

interface SaveDraftButtonProps {
  /**
   * The content to save
   */
  content: {
    text: string;
    media?: Array<{
      id: string;
      url: string;
      type: string;
    }>;
    platforms: string[];
  };
  /**
   * Handler for saving the draft
   */
  onSave: (content: any) => Promise<void>;
  /**
   * Whether to show the auto-save feature
   */
  enableAutoSave?: boolean;
  /**
   * How often to auto-save in milliseconds (default: 30000 - 30 seconds)
   */
  autoSaveInterval?: number;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Optional CSS class name
   */
  className?: string;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const SaveDraftButton: React.FC<SaveDraftButtonProps> = ({
  content,
  onSave,
  enableAutoSave = true,
  autoSaveInterval = 30000,
  isDisabled = false,
  className = '',
  size = 'md',
  variant = 'outline',
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(enableAutoSave);
  
  const { toast } = useToast();

  // Function to save the draft
  const saveDraft = async () => {
    if (isDisabled || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(content);
      setLastSaved(new Date());
      
      // Only show toast for manual saves, not auto-saves
      if (!autoSaveEnabled) {
        toast({
          title: "Draft saved",
          description: "Your content has been saved as a draft.",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Failed to save draft",
        description: "There was an error saving your draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle auto-save
  const toggleAutoSave = () => {
    setAutoSaveEnabled(!autoSaveEnabled);
    toast({
      title: !autoSaveEnabled ? "Auto-save enabled" : "Auto-save disabled",
      description: !autoSaveEnabled 
        ? `Your draft will be saved automatically every ${autoSaveInterval / 1000} seconds.` 
        : "Remember to save your draft manually.",
      variant: "default",
    });
  };

  // Auto-save effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoSaveEnabled && content.text.trim().length > 0) {
      interval = setInterval(() => {
        saveDraft();
      }, autoSaveInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoSaveEnabled, content, autoSaveInterval]);

  // Format last saved time
  const getLastSavedText = () => {
    if (!lastSaved) return null;
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSaved.getTime()) / 60000);
    
    if (diffInMinutes < 1) {
      return "Saved just now";
    } else if (diffInMinutes === 1) {
      return "Saved 1 minute ago";
    } else if (diffInMinutes < 60) {
      return `Saved ${diffInMinutes} minutes ago`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      if (hours === 1) {
        return "Saved 1 hour ago";
      } else {
        return `Saved ${hours} hours ago`;
      }
    }
  };

  return (
    <div className="flex flex-col">
      <Button
        onClick={saveDraft}
        disabled={isDisabled || content.text.trim().length === 0}
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        aria-label="Save draft"
      >
        {isSaving ? (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        )}
        Save Draft
      </Button>
      
      {lastSaved && (
        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
          <span>{getLastSavedText()}</span>
          <button 
            onClick={toggleAutoSave}
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center"
            type="button"
          >
            <span className={`w-3 h-3 rounded-full mr-1 ${autoSaveEnabled ? 'bg-[#00FF6A]' : 'bg-gray-400'}`}></span>
            Auto-save {autoSaveEnabled ? 'on' : 'off'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SaveDraftButton; 