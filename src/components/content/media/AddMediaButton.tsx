import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../ui/button/Button';
import Dialog from '../../ui/dialog';
import { Dialog as MuiDialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useSubscription } from '../../../hooks/useSubscription';
import AssetPicker from './AssetPicker';
import { CircularProgress } from '@mui/material';
import { Alert } from '@mui/material';
import { MediaFilterButton, MediaFilters } from './MediaFilterButton';
import { MediaSearchBar } from './MediaSearchBar';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'gif';
  name: string;
  size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnailUrl?: string;
  createdAt: string;
  tags?: string[];
}

interface AddMediaButtonProps {
  /**
   * Callback when media items are selected
   */
  onMediaSelected: (media: MediaItem[]) => void;
  /**
   * Maximum number of files allowed to be selected
   */
  maxFiles?: number;
  /**
   * Allowed file types
   */
  allowedTypes?: ('image' | 'video' | 'gif')[];
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Optional CSS classes
   */
  className?: string;
  /**
   * Label text for the button
   */
  label?: string;
}

export const AddMediaButton: React.FC<AddMediaButtonProps> = ({
  onMediaSelected,
  maxFiles = 10,
  allowedTypes = ['image', 'video', 'gif'],
  isDisabled = false,
  variant = 'outline',
  size = 'md',
  className = '',
  label = 'Add Media',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLibraryItems, setSelectedLibraryItems] = useState<MediaItem[]>([]);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MediaFilters>({ types: ['all'], dateRange: 'all', sortBy: 'newest', tags: [] });
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionDialogItem, setVersionDialogItem] = useState<MediaItem | null>(null);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [finalTags, setFinalTags] = useState<string[]>([]);
  const [useSmartSearch, setUseSmartSearch] = useState(false);
  const [smartSearchResults, setSmartSearchResults] = useState<MediaItem[] | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { subscription } = useSubscription();
  
  useEffect(() => {
    // Fetch media items from the backend API
    const fetchMedia = async () => {
      try {
        const res = await fetch('/api/content/media');
        if (res.ok) {
          const data = await res.json();
          setLibraryItems(data.media || []);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchMedia();
  }, []);
  
  // Check if user can use video
  const canUseVideo = subscription?.tier === 'influencer' || subscription?.tier === 'enterprise';
  
  // Filter allowed types based on subscription
  const effectiveAllowedTypes = allowedTypes.filter(type => {
    if (type === 'video' && !canUseVideo) {
      return false;
    }
    return true;
  });
  
  // Filter library items by allowed types and search query
  const filteredLibraryItems = libraryItems.filter(item => {
    // Filter by type
    if (filters.types && !filters.types.includes('all') && !filters.types.includes(item.type)) {
      return false;
    }
    // Filter by tags
    if (filters.tags && filters.tags.length > 0 && (!item.tags || !filters.tags.some(tag => item.tags.includes(tag)))) {
      return false;
    }
    // Filter by search query
    if (searchQuery.trim() !== '' && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // TODO: Add dateRange and sortBy logic if needed
    return true;
  });
  
  const handleOpen = () => {
    setIsOpen(true);
    setErrorMessage(null);
  };
  
  const handleClose = () => {
    setIsOpen(false);
    setSelectedFiles([]);
    setSelectedLibraryItems([]);
    setUploadProgress({});
    setErrorMessage(null);
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    
    // Validate file count
    if (newFiles.length > maxFiles) {
      setErrorMessage(`You can only upload a maximum of ${maxFiles} files at once.`);
      return;
    }
    
    // Validate file types
    const validFiles = newFiles.filter(file => {
      const fileType = file.type.split('/')[0];
      
      if (fileType === 'image') {
        // Check if it's a GIF
        if (file.type === 'image/gif') {
          return effectiveAllowedTypes.includes('gif');
        }
        return effectiveAllowedTypes.includes('image');
      }
      
      if (fileType === 'video') {
        return effectiveAllowedTypes.includes('video');
      }
      
      return false;
    });
    
    if (validFiles.length !== newFiles.length) {
      setErrorMessage(`Some files were not accepted. Allowed types: ${effectiveAllowedTypes.join(', ')}`);
    } else {
      setErrorMessage(null);
    }
    
    setSelectedFiles(validFiles);
    
    // Reset file input
    e.target.value = '';
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    // Initialize progress for each file
    const initialProgress: Record<string, number> = {};
    selectedFiles.forEach(file => {
      initialProgress[file.name] = 0;
    });
    setUploadProgress(initialProgress);
    
    try {
      // Simulate file upload with progress
      await Promise.all(
        selectedFiles.map(async (file) => {
          // Create a simulated async upload with progress
          return new Promise<void>((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
              progress += 10;
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: progress,
              }));
              
              if (progress >= 100) {
                clearInterval(interval);
                resolve();
              }
            }, 300);
          });
        })
      );
      
      // AI auto-tagging and moderation
      try {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));
        const res = await fetch('/api/ai/media/auto-tag', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          setSuggestedTags(data.tags || []);
          setModerationResult(data.moderation || null);
          setShowTagDialog(true);
          setFinalTags(data.tags || []);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // Fallback: no AI tags
        setSuggestedTags([]);
        setModerationResult(null);
        setShowTagDialog(true);
        setFinalTags([]);
        setIsLoading(false);
        return;
      }
      
      // Convert selected files to MediaItems
      const uploadedItems: MediaItem[] = selectedFiles.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        const isGif = file.type === 'image/gif';
        const isVideo = file.type.startsWith('video/');
        
        return {
          id: `temp-${Date.now()}-${index}`,
          url: URL.createObjectURL(file),
          type: isGif ? 'gif' : isImage ? 'image' : 'video',
          name: file.name,
          size: file.size,
          createdAt: new Date().toISOString(),
          tags: finalTags,
        };
      });
      
      // Call the callback with the uploaded items
      onMediaSelected(uploadedItems);
      handleClose();
    } catch (error) {
      console.error('Error uploading files:', error);
      setErrorMessage('An error occurred while uploading files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAcceptTags = () => {
    // Convert selected files to MediaItems with tags
    const uploadedItems: MediaItem[] = selectedFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      type: file.type === 'image/gif' ? 'gif' : file.type.startsWith('image/') ? 'image' : 'video',
      name: file.name,
      size: file.size,
      createdAt: new Date().toISOString(),
      tags: finalTags,
    }));
    onMediaSelected(uploadedItems);
    setShowTagDialog(false);
    handleClose();
  };
  
  const toggleLibraryItemSelection = (item: MediaItem) => {
    if (selectedLibraryItems.find(selected => selected.id === item.id)) {
      setSelectedLibraryItems(selectedLibraryItems.filter(selected => selected.id !== item.id));
    } else {
      if (selectedLibraryItems.length >= maxFiles) {
        setErrorMessage(`You can only select a maximum of ${maxFiles} files.`);
        return;
      }
      setSelectedLibraryItems([...selectedLibraryItems, item]);
    }
  };
  
  const handleLibrarySelect = () => {
    if (selectedLibraryItems.length === 0) {
      setErrorMessage('Please select at least one item from your library.');
      return;
    }
    
    onMediaSelected(selectedLibraryItems);
    handleClose();
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAssetSelect = async (fileOrDrive: File | { source: 'google-drive', file: any }) => {
    setImporting(true);
    setImportError(null);
    try {
      if (fileOrDrive instanceof File) {
        // Local upload logic (existing)
        await handleUpload(fileOrDrive);
      } else if (fileOrDrive.source === 'google-drive') {
        // Download from Google Drive and upload to Irisync
        const res = await fetch('/api/integration/design/google-drive-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: fileOrDrive.file.tokens, // You may need to persist tokens per user/session
            fileId: fileOrDrive.file.id,
          }),
        });
        if (!res.body) throw new Error('No file stream');
        // Convert stream to Blob/File
        const blob = await res.blob();
        const file = new File([blob], fileOrDrive.file.name, { type: fileOrDrive.file.mimeType });
        await handleUpload(file);
      }
      setAssetPickerOpen(false);
    } catch (err: any) {
      setImportError(err.message || 'Failed to import media');
    } finally {
      setImporting(false);
    }
  };

  const openVersionDialog = async (item: MediaItem) => {
    setVersionDialogItem(item);
    setVersionDialogOpen(true);
    setVersionLoading(true);
    try {
      const res = await fetch(`/api/content/media/${item.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersionHistory(data.versions || []);
      } else {
        setVersionHistory([]);
      }
    } catch (err) {
      setVersionHistory([]);
    } finally {
      setVersionLoading(false);
    }
  };

  const handleRevertVersion = async (version: any) => {
    if (!versionDialogItem) return;
    setVersionLoading(true);
    try {
      await fetch(`/api/content/media/${versionDialogItem.id}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version.version }),
      });
      // Optionally refetch library items or show a success message
      closeVersionDialog();
    } catch (err) {
      // Optionally show error
      setVersionLoading(false);
    }
  };

  const closeVersionDialog = () => {
    setVersionDialogOpen(false);
    setVersionDialogItem(null);
    setVersionHistory([]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (useSmartSearch && query.trim() !== '') {
      try {
        const res = await fetch('/api/ai/media/smart-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters }),
        });
        if (res.ok) {
          const data = await res.json();
          setSmartSearchResults(data.results || []);
        } else {
          setSmartSearchResults([]);
        }
      } catch (err) {
        setSmartSearchResults([]);
      }
    } else {
      setSmartSearchResults(null);
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
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        {label}
      </Button>
      
      <Button variant="outlined" onClick={() => setAssetPickerOpen(true)} sx={{ ml: 2 }}>
        Import Media
      </Button>
      
      <MuiDialog open={isOpen} onClose={handleClose} maxWidth="lg" fullWidth>
        <div className="flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center border-b p-4">
            <div className="text-xl font-semibold">Add Media</div>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {errorMessage && (
            <div className="m-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {errorMessage}
            </div>
          )}
          
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col h-full">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 ${activeTab === 'upload' ? 'border-b-2 border-[#00CC44] font-medium' : ''}`}
                >
                  Upload
                </button>
                <button
                  onClick={() => setActiveTab('library')}
                  className={`px-4 py-2 ${activeTab === 'library' ? 'border-b-2 border-[#00CC44] font-medium' : ''}`}
                >
                  Media Library
                </button>
              </div>
              
              {activeTab === 'upload' && (
                <div className="p-4 flex flex-col h-full">
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 mb-4 text-center flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                    onClick={triggerFileInput}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      multiple
                      accept={effectiveAllowedTypes.map(type => {
                        if (type === 'image') return 'image/jpeg,image/png,image/webp';
                        if (type === 'gif') return 'image/gif';
                        if (type === 'video') return 'video/mp4,video/webm';
                        return '';
                      }).join(',')}
                    />
                    
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="32" 
                      height="32" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="text-gray-400 mb-3"
                    >
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 1 1 0 9h-1"></path>
                      <path d="M12 12v9"></path>
                      <path d="m16 16-4-4-4 4"></path>
                    </svg>
                    
                    <p className="text-sm font-medium mb-1">Drag and drop or click to upload</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Supports: {effectiveAllowedTypes.map(type => type.toUpperCase()).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Maximum {maxFiles} files - 10MB per file
                    </p>
                    
                    {!canUseVideo && effectiveAllowedTypes.includes('video') && (
                      <div className="mt-3 p-2 bg-amber-50 text-amber-700 text-xs rounded-md inline-flex items-center">
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
                          className="mr-1"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Video upload requires Influencer plan or higher
                      </div>
                    )}
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Selected Files ({selectedFiles.length})</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                {file.type.startsWith('image/') ? '🖼️' : '🎬'}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            
                            <div className="w-20">
                              {uploadProgress[file.name] > 0 && (
                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#00CC44] rounded-full"
                                    style={{ width: `${uploadProgress[file.name]}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                              className="text-red-500 p-1"
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
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'library' && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MediaSearchBar onSearch={handleSearch} />
                    <MediaFilterButton activeFilters={filters} onFiltersChange={setFilters} availableTags={[]} />
                    <label className="flex items-center gap-1 text-xs ml-2">
                      <input type="checkbox" checked={useSmartSearch} onChange={e => setUseSmartSearch(e.target.checked)} />
                      Smart Search
                    </label>
                  </div>
                  
                  {(smartSearchResults !== null ? smartSearchResults : filteredLibraryItems).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No media found matching your criteria
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {(smartSearchResults !== null ? smartSearchResults : filteredLibraryItems).map((item) => (
                        <div
                          key={item.id}
                          className={`
                            relative border rounded-md overflow-hidden cursor-pointer group
                            ${selectedLibraryItems.some(selected => selected.id === item.id) ? 'ring-2 ring-[#00CC44]' : ''}
                          `}
                          onClick={() => toggleLibraryItemSelection(item)}
                        >
                          <div className="aspect-square bg-gray-100">
                            {item.type === 'image' || item.type === 'gif' ? (
                              <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center relative">
                                <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-black bg-opacity-50 flex items-center justify-center text-white">
                                    ▶️
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-2">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.type.toUpperCase()}
                              {item.size && ` • ${formatFileSize(item.size)}`}
                            </p>
                          </div>
                          
                          <div className={`
                            absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center
                            ${selectedLibraryItems.some(selected => selected.id === item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            transition-opacity
                          `}>
                            {selectedLibraryItems.some(selected => selected.id === item.id) ? (
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
                                className="text-[#00CC44]"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
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
                                className="text-gray-500"
                              >
                                <circle cx="12" cy="12" r="10"></circle>
                              </svg>
                            )}
                          </div>
                          <button
                            className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded shadow px-2 py-1 text-xs text-[#00CC44] hover:underline"
                            onClick={e => { e.stopPropagation(); openVersionDialog(item); }}
                          >
                            Version History
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="border-t p-4 flex justify-between">
              <Button 
                onClick={handleClose} 
                variant="outline" 
                size="sm"
              >
                Cancel
              </Button>
              
              {activeTab === 'upload' ? (
                <Button
                  onClick={handleUpload}
                  variant="primary"
                  size="sm"
                  disabled={isLoading || selectedFiles.length === 0}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1" />
                      Uploading...
                    </>
                  ) : 'Upload'}
                </Button>
              ) : (
                <Button
                  onClick={handleLibrarySelect}
                  variant="primary"
                  size="sm"
                  disabled={selectedLibraryItems.length === 0}
                >
                  Select ({selectedLibraryItems.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </MuiDialog>
      {assetPickerOpen && (
        <AssetPicker
          onSelect={handleAssetSelect}
          onClose={() => setAssetPickerOpen(false)}
        />
      )}
      {importing && <CircularProgress />}
      {importError && <Alert severity="error">{importError}</Alert>}
      <MuiDialog open={versionDialogOpen} onClose={closeVersionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Version History</DialogTitle>
        <DialogContent>
          {versionLoading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : versionHistory.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No version history found.</div>
          ) : (
            <ul>
              {versionHistory.map((version, idx) => (
                <li key={version.id} className="flex items-center justify-between border-b py-2">
                  <span>Version {version.version} - {version.createdAt}</span>
                  <Button size="sm" onClick={() => handleRevertVersion(version)}>Revert</Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeVersionDialog}>Close</Button>
        </DialogActions>
      </MuiDialog>
      {showTagDialog && (
        <MuiDialog open={showTagDialog} onClose={() => setShowTagDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Suggested Tags & Moderation</DialogTitle>
          <DialogContent>
            {moderationResult && moderationResult.flagged && (
              <Alert severity="warning">This media may violate content guidelines: {moderationResult.reason}</Alert>
            )}
            <div className="my-4">
              <div className="mb-2 font-medium">Suggested Tags:</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {suggestedTags.length > 0 ? suggestedTags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-[#00FF6A]/10 text-[#00CC44] rounded-full text-xs">{tag}</span>
                )) : <span className="text-gray-500">No tags suggested</span>}
              </div>
              <input
                type="text"
                value={finalTags.join(', ')}
                onChange={e => setFinalTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                className="w-full border rounded p-2 text-sm"
                placeholder="Edit tags (comma separated)"
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTagDialog(false)}>Cancel</Button>
            <Button onClick={handleAcceptTags} variant="primary">Accept & Upload</Button>
          </DialogActions>
        </MuiDialog>
      )}
    </>
  );
};

export default AddMediaButton; 