import React, { useState } from 'react';
import { Button } from '../../ui/button/Button';
import Dialog from '../../ui/dialog';
import { PinturaEditor } from '@pqina/react-pintura';
import '@pqina/pintura/pintura.css';

interface ImageEditorButtonProps {
  /**
   * Media ID for the image to edit
   */
  mediaId: string;
  /**
   * Image URL to edit
   */
  imageUrl: string;
  /**
   * Original image width
   */
  imageWidth?: number;
  /**
   * Original image height
   */
  imageHeight?: number;
  /**
   * Callback for when the image is edited successfully
   */
  onSave: (editedImageData: { id: string; url: string; thumbnailUrl: string; filename: string }) => void;
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
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Optional CSS class name
   */
  className?: string;
}

export const ImageEditorButton: React.FC<ImageEditorButtonProps> = ({
  mediaId,
  imageUrl,
  imageWidth,
  imageHeight,
  onSave,
  isDisabled = false,
  size = 'md',
  variant = 'outline',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleProcess = async (output: any) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Convert Pintura output to base64 data URL
      const blob = output.dest;
      const reader = new FileReader();
      
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read edited image'));
        reader.readAsDataURL(blob);
      });

      // Send to the real image editing API
      const response = await fetch('/api/content/media/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaId,
          editedImageData: dataUrl,
          edits: {
            // Extract Pintura edit data
            crop: output.data?.crop,
            rotation: output.data?.rotation,
            flipX: output.data?.flipX,
            flipY: output.data?.flipY,
            filter: output.data?.filter,
            colorMatrix: output.data?.colorMatrix,
            convolutionMatrix: output.data?.convolutionMatrix,
            gamma: output.data?.gamma,
            vignette: output.data?.vignette,
            size: output.data?.size,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save edited image');
      }

      const result = await response.json();
      
      if (result.success && result.editedImage) {
        // Call the onSave callback with the new image data
        onSave({
          id: result.editedImage.id,
          url: result.editedImage.url,
          thumbnailUrl: result.editedImage.thumbnailUrl,
          filename: result.editedImage.filename
        });
        
        setIsOpen(false);
      } else {
        throw new Error(result.message || 'Unexpected response from server');
      }
      
    } catch (err: any) {
      console.error('Error processing image edit:', err);
      setError(err.message || 'Failed to process image edit');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        aria-label="Edit image"
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
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit Image
      </Button>
      
      <Dialog isOpen={isOpen} onClose={handleClose} title="Image Editor" size="lg">
        <div className="flex flex-col min-h-[500px]">
          {error && (
            <div className="m-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              <strong>Error:</strong> {error}
              <button 
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}
          
          {isProcessing && (
            <div className="m-2 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm">
              <div className="flex items-center">
                <div className="animate-spin mr-2">⟳</div>
                Processing and saving your edited image...
              </div>
            </div>
          )}
          
          <div style={{ width: '100%', height: 500 }}>
            <PinturaEditor
              src={imageUrl}
              imageCropLimitToImage={true}
              imageCropMinSize={{ width: 100, height: 100 }}
              imageCropMaxSize={{ width: 4096, height: 4096 }}
              enableToolbar={true}
              enableButtonExport={true}
              enableButtonClose={true}
              enableUtils={true}
              utils={[
                'crop',
                'filter', 
                'finetune',
                'annotate',
                'decorate',
                'frame',
                'resize'
              ]}
              onProcess={handleProcess}
              onLoad={() => setIsProcessing(false)}
              onLoaderror={(e: any) => setError(e?.message || 'Failed to load image in editor')}
              locale={{
                labelButtonExport: 'Save Edited Image',
                labelButtonCancel: 'Cancel',
                labelButtonClose: 'Close'
              }}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default ImageEditorButton; 