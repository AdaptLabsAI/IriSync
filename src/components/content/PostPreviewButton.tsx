import React, { useState } from 'react';
import { Button } from '../../ui/button';
import Dialog from '../../ui/dialog';
import { DialogContent, DialogTitle } from '@mui/material';
import { useSubscription } from '../../hooks/useSubscription';

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface PostPreviewButtonProps {
  postContent: {
    text: string;
    media?: Array<{
      url: string;
      type: 'image' | 'video' | 'gif';
      alt?: string;
    }>;
  };
  selectedPlatforms: Platform[];
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PostPreviewButton: React.FC<PostPreviewButtonProps> = ({
  postContent,
  selectedPlatforms,
  isDisabled = false,
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform | null>(
    selectedPlatforms.length > 0 ? selectedPlatforms[0] : null
  );
  
  const { subscription } = useSubscription();
  const hasAdvancedPreview = subscription?.tier === 'enterprise' || subscription?.tier === 'influencer';

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const switchPlatform = (platform: Platform) => {
    setActivePlatform(platform);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={isDisabled || selectedPlatforms.length === 0}
        variant="secondary"
        size={size}
        className={`flex items-center gap-2 ${className}`}
        aria-label="Preview post"
      >
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
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Preview
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Post Preview"
      >
        <div className="p-0 min-w-[500px] max-w-3xl">
          {!activePlatform ? (
            <div className="p-6 text-center text-gray-500">
              No platforms selected for preview
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b p-2 gap-2 overflow-x-auto">
                {selectedPlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    className={`p-2 rounded-md transition-colors ${
                      activePlatform?.id === platform.id
                        ? 'bg-gray-100 font-medium'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => switchPlatform(platform)}
                  >
                    <span 
                      className="flex items-center gap-2"
                      style={{ color: platform.color }}
                    >
                      <img 
                        src={platform.icon} 
                        alt={platform.name} 
                        className="w-5 h-5" 
                      />
                      {platform.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div 
                  className={`border rounded-lg p-4 mx-auto ${
                    hasAdvancedPreview ? 'max-w-md platform-preview' : 'max-w-lg'
                  }`}
                  data-platform={activePlatform.id}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs">{activePlatform.name.substring(0, 2)}</span>
                    </div>
                    <div>
                      <div className="font-medium">Your Profile</div>
                      <div className="text-xs text-gray-500">Just now • {activePlatform.name}</div>
                    </div>
                  </div>

                  <p className="mb-4 whitespace-pre-wrap">{postContent.text}</p>

                  {postContent.media && postContent.media.length > 0 && (
                    <div className={`grid gap-2 ${
                      postContent.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                    }`}>
                      {postContent.media.map((item, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                          {item.type === 'image' && (
                            <img 
                              src={item.url} 
                              alt={item.alt || 'Post media'} 
                              className="w-full h-full object-cover"
                            />
                          )}
                          {item.type === 'video' && (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-3xl">▶️</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {hasAdvancedPreview && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-around">
                        <button className="text-gray-500 flex items-center gap-1">
                          <span>❤️</span> Like
                        </button>
                        <button className="text-gray-500 flex items-center gap-1">
                          <span>💬</span> Comment
                        </button>
                        <button className="text-gray-500 flex items-center gap-1">
                          <span>↗️</span> Share
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t p-4 flex justify-end">
                <Button onClick={handleClose} variant="outline" size="sm">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default PostPreviewButton; 