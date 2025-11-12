'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CircularProgress, Alert, Box, List, ListItem, ListItemText, Avatar, TextField, MenuItem, Select, InputLabel, FormControl, Button, Chip, Toolbar, Typography, Divider, Skeleton, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { getMediaContent, deleteMedia, getMediaDetails, updateMedia, assignMedia, addMediaNotes, uploadMedia, listMediaFolders, createMediaFolder, updateMediaFolder, deleteMediaFolder } from '@/lib/api/content';
import MediaGrid from '@/components/content/media/MediaGrid';
import type { MediaContent, MediaFolder } from '@/lib/content/models/media';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import Checkbox from '@mui/material/Checkbox';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import LabelIcon from '@mui/icons-material/Label';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
// Import react-dropzone with type safety
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import ImageEditorButton from '@/components/content/media/ImageEditorButton';
import { CreateFolderButton } from '@/components/content/media/CreateFolderButton';
import DeleteMediaButton from '@/components/content/media/DeleteMediaButton';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import AddMediaButton from '@/components/content/media/AddMediaButton';
import MediaFilterButton from '@/components/content/media/MediaFilterButton';

const MEDIA_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Document' },
];

// Helper to build a nested folder tree
function buildFolderTree(folders: MediaFolder[], parentId: string | null = null): MediaFolder[] {
  return folders.filter(f => (f.parentId || null) === parentId).map(f => ({
    ...f,
    children: buildFolderTree(folders, f.id)
  }));
}

// Folder tree item component
interface FolderTreeItemProps {
  folder: MediaFolder & { children?: MediaFolder[] };
  selectedFolderId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDropMedia: (mediaId: string, folderId: string) => void;
}
function FolderTreeItem({ folder, selectedFolderId, onSelect, onRename, onDelete, onDropMedia }: FolderTreeItemProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'MEDIA',
    drop: (item: { id: string }) => onDropMedia(item.id, folder.id),
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    })
  });
  const dropRef = useRef<HTMLDivElement>(null);
  drop(dropRef);
  
  return (
    <div ref={dropRef} style={{ background: isOver && canDrop ? '#e0f7fa' : undefined }}>
      <Button
        variant={selectedFolderId === folder.id ? 'contained' : 'text'}
        onClick={() => onSelect(folder.id)}
        sx={{ flex: 1, justifyContent: 'flex-start' }}
        aria-current={selectedFolderId === folder.id}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(folder.id); }}
      >
        {folder.name}
      </Button>
      <IconButton size="small" onClick={() => onRename(folder.id, prompt('Rename folder:', folder.name) || folder.name)} title="Rename folder"><LabelIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={() => onDelete(folder.id)} title="Delete folder">
        <DeleteMediaButton
          mediaIds={[folder.id]}
          onDelete={async (ids) => ({ success: true })}
          iconOnly
          size="sm"
        />
      </IconButton>
      {folder.children && folder.children.length > 0 && (
        <div style={{ marginLeft: 16 }}>
          {folder.children.map((child: MediaFolder & { children?: MediaFolder[] }) => (
            <FolderTreeItem key={child.id} folder={child} selectedFolderId={selectedFolderId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} onDropMedia={onDropMedia} />
          ))}
        </div>
      )}
    </div>
  );
}

// Folder sidebar tree
interface FolderSidebarTreeProps {
  folders: MediaFolder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDropMedia: (mediaId: string, folderId: string) => void;
}
function FolderSidebarTree({ folders, selectedFolderId, onSelect, onCreate, onRename, onDelete, onDropMedia }: FolderSidebarTreeProps) {
  const tree = buildFolderTree(folders);
  return (
    <Box sx={{ width: 240, pr: 2, borderRight: '1px solid #eee', minHeight: 600 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Folders</Typography>
      <Button variant={selectedFolderId === null ? 'contained' : 'text'} onClick={() => onSelect(null)} sx={{ mb: 1, width: '100%' }} aria-current={selectedFolderId === null} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(null); }}>All Media</Button>
      {tree.map((folder: MediaFolder & { children?: MediaFolder[] }) => (
        <FolderTreeItem key={folder.id} folder={folder} selectedFolderId={selectedFolderId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} onDropMedia={onDropMedia} />
      ))}
      <Box mt={2}>
        <CreateFolderButton onFolderCreate={onCreate} />
      </Box>
    </Box>
  );
}

// MediaGrid with drag support
interface DraggableMediaGridProps {
  mediaItems: any[];
  [key: string]: any;
}
function DraggableMediaGrid({ mediaItems, ...props }: DraggableMediaGridProps) {
  // Create a wrapper component that properly uses hooks
  const DraggableMediaItem = ({ item }: { item: any }) => {
    const [, drag] = useDrag({ type: 'MEDIA', item: { id: item.id } });
    const dragRef = useRef<HTMLDivElement>(null);
    
    // Apply drag ref
    useEffect(() => {
      drag(dragRef);
    }, [drag]);
    
    return <div ref={dragRef} style={{ cursor: 'move' }}>{/* Media item content */}</div>;
  };
  
  // Map items without calling hooks inside map
  const mappedItems = mediaItems.map(item => ({
    ...item,
    draggable: true,
    DraggableComponent: DraggableMediaItem
  }));
  
  return <MediaGrid {...props} mediaItems={mappedItems} />;
}

// Bulk move dialog
interface BulkMoveDialogProps {
  open: boolean;
  onClose: () => void;
  folders: MediaFolder[];
  onMove: (targetFolderId: string) => void;
  selectedIds: string[];
}
function BulkMoveDialog({ open, onClose, folders, onMove, selectedIds }: BulkMoveDialogProps) {
  const [targetFolder, setTargetFolder] = useState<string | null>(null);
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Move Selected Media</DialogTitle>
      <DialogContent>
        <Select value={targetFolder || ''} onChange={e => setTargetFolder(e.target.value)} displayEmpty fullWidth>
          <MenuItem value="">Root (All Media)</MenuItem>
          {folders.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (targetFolder !== null) onMove(targetFolder); }}>Move</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function MediaPage() {
  const [mediaContent, setMediaContent] = useState<MediaContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMedia, setDetailsMedia] = useState<MediaContent | null>(null);
  const [filters, setFilters] = useState({ type: '', search: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const listRef = useRef<HTMLDivElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaContent | null>(null);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const folderList = await listMediaFolders();
        setFolders(folderList);
      } catch (err) {
        setError('Failed to load folders.');
      }
    };
    fetchFolders();
  }, []);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const content = await getMediaContent(selectedFolderId || undefined);
        setMediaContent(content);
      } catch (err) {
        setError('Failed to load media content. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedia();
  }, [selectedFolderId]);

  // Filtering
  const filteredMedia = mediaContent.filter(item =>
    (!filters.type || item.type === filters.type) &&
    (!filters.search || (item.title || item.filename).toLowerCase().includes(filters.search.toLowerCase()))
  );

  // Bulk actions
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(filteredMedia.map(m => m.id));
    } else {
      setSelected([]);
    }
  };
  const handleSelectOne = (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(prev => event.target.checked ? [...prev, id] : prev.filter(sid => sid !== id));
  };
  const allSelected = selected.length > 0 && selected.length === filteredMedia.length;
  const someSelected = selected.length > 0 && selected.length < filteredMedia.length;

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await deleteMedia(id);
    }
    setSelected([]);
    const content = await getMediaContent();
    setMediaContent(content);
    showSnackbar('Deleted selected media', 'success');
  };

  // Details drawer
  const openDetails = async (id: string) => {
    setDetailsOpen(true);
    setDetailsMedia(null);
    try {
      const details = await getMediaDetails(id);
      setDetailsMedia(details);
    } catch {
      showSnackbar('Failed to load media details', 'error');
    }
  };

  // Snackbar helpers
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'success') => setSnackbar({ open: true, message, severity });

  // Bulk assign
  const handleBulkAssign = async () => {
    for (const id of selected) {
      await assignMedia(id, selectedAssignee);
    }
    setSelected([]);
    showSnackbar('Assigned selected media', 'success');
    setAssignDialogOpen(false);
    const content = await getMediaContent();
    setMediaContent(content);
  };
  // Bulk label
  const handleBulkLabel = async () => {
    for (const id of selected) {
      await updateMedia(id, { tags: selectedLabels });
    }
    setSelected([]);
    showSnackbar('Labeled selected media', 'success');
    setLabelDialogOpen(false);
    const content = await getMediaContent();
    setMediaContent(content);
  };
  // Bulk download
  const handleBulkDownload = () => {
    selected.forEach(id => {
      const media = mediaContent.find(m => m.id === id);
      if (media) window.open(media.url, '_blank');
    });
    setSelected([]);
    showSnackbar('Downloaded selected media', 'info');
  };

  // Upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    let uploadedCount = 0;
    for (const file of acceptedFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        let width, height;
        if (file.type.startsWith('image/')) {
          await new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              width = img.width;
              height = img.height;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = base64;
          });
        }
        await uploadMedia({
          fileData: base64,
          originalFilename: file.name,
          type: file.type,
          size: file.size,
          width,
          height,
          folderId: selectedFolderId || null,
        });
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / acceptedFiles.length) * 100));
      } catch (err: any) {
        setError(`Failed to upload ${file.name}: ${err.message || err}`);
        showSnackbar(`Failed to upload ${file.name}`, 'error');
      }
    }
    setUploading(false);
    setUploadProgress(100);
    if (uploadedCount > 0) {
      showSnackbar('Upload complete', 'success');
      try {
        setIsLoading(true);
        const content = await getMediaContent(selectedFolderId || undefined);
        setMediaContent(content);
      } catch {
        setError('Failed to refresh media content after upload.');
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedFolderId]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // Analytics
  const totalCount = mediaContent.length;
  const typeStats = MEDIA_TYPES.filter(t => t.value).map(t => ({
    ...t,
    count: mediaContent.filter(m => m.type === t.value).length
  }));
  const totalSize = mediaContent.reduce((sum, m) => sum + (m.size || 0), 0);

  // Advanced analytics (usage over time, per-user, per-tag)
  const usageByDate: Record<string, number> = {};
  mediaContent.forEach(m => {
    const date = m.uploadedAt ? new Date(m.uploadedAt).toLocaleDateString() : 'Unknown';
    usageByDate[date] = (usageByDate[date] || 0) + 1;
  });
  const usageByTag: Record<string, number> = {};
  mediaContent.forEach(m => {
    (m.tags || []).forEach(tag => { usageByTag[tag] = (usageByTag[tag] || 0) + 1; });
  });

  // Image editor integration (button in details)
  const handleEditImage = (media: MediaContent) => {
    // Open the edit image dialog by setting state to show the ImageEditorButton
    setSelectedMedia(media);
    setDetailsOpen(true);
  };

  // Handle successful image edit
  const handleImageEditComplete = (editedImageData: { id: string; url: string; thumbnailUrl: string; filename: string }) => {
    showSnackbar(`Image edited successfully! New image: ${editedImageData.filename}`, 'success');
    
    // Refresh the media list to show the new edited image
    const fetchUpdatedMedia = async () => {
      try {
        const content = await getMediaContent(selectedFolderId || undefined);
        setMediaContent(content);
      } catch (err) {
        console.error('Failed to refresh media after edit:', err);
      }
    };
    
    fetchUpdatedMedia();
    setDetailsOpen(false);
  };

  // Folder CRUD handlers
  const handleCreateFolder = async (name: string) => {
    try {
      const folder = await createMediaFolder(name);
      setFolders(folders => [...folders, folder]);
    } catch (err) {
      setError('Failed to create folder.');
    }
  };
  const handleRenameFolder = async (id: string, name: string) => {
    try {
      const updated = await updateMediaFolder(id, { name });
      setFolders(folders => folders.map(f => f.id === id ? { ...f, name: updated.name } : f));
    } catch (err) {
      setError('Failed to rename folder.');
    }
  };
  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteMediaFolder(id);
      setFolders(folders => folders.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
    } catch (err) {
      setError('Failed to delete folder.');
    }
  };

  // Handle moving media to different folder
  const handleMoveMedia = async (mediaId: string, targetFolderId: string) => {
    try {
      await updateMedia(mediaId, { folderId: targetFolderId });
      showSnackbar(`Media moved to folder successfully`, 'success');
      // Refresh media content after moving
      const content = await getMediaContent(selectedFolderId || undefined);
      setMediaContent(content);
    } catch (err) {
      setError('Failed to move media to folder');
      showSnackbar('Failed to move media', 'error');
    }
  };

  // Wrapper for DeleteMediaButton to handle folder deletion
  const handleFolderDeleteWrapper = async (folderIds: string[]) => {
    try {
      if (folderIds.length === 1) {
        await deleteMediaFolder(folderIds[0]);
        setFolders(folders => folders.filter(f => f.id !== folderIds[0]));
        if (selectedFolderId === folderIds[0]) setSelectedFolderId(null);
        return { success: true, message: 'Folder deleted successfully' };
      }
      return { success: false, message: 'Can only delete one folder at a time' };
    } catch (err) {
      console.error('Failed to delete folder:', err);
      return { success: false, message: 'Failed to delete folder' };
    }
  };

  // Wrapper for bulk media deletion
  const handleBulkDeleteWrapper = async (mediaIds: string[]) => {
    try {
      for (const id of mediaIds) {
        await deleteMedia(id);
      }
      setSelected([]);
      const content = await getMediaContent();
      setMediaContent(content);
      return { success: true, message: `Deleted ${mediaIds.length} media items` };
    } catch (err) {
      console.error('Failed to delete media:', err);
      return { success: false, message: 'Failed to delete media items' };
    }
  };

  // Folder sidebar UI
  function FolderSidebar() {
    return (
      <Box sx={{ width: 220, pr: 2, borderRight: '1px solid #eee', minHeight: 600 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Folders</Typography>
        <Button variant={selectedFolderId === null ? 'contained' : 'text'} onClick={() => setSelectedFolderId(null)} sx={{ mb: 1, width: '100%' }}>All Media</Button>
        {folders.map(folder => (
          <Box key={folder.id} display="flex" alignItems="center" mb={1}>
            <Button
              variant={selectedFolderId === folder.id ? 'contained' : 'text'}
              onClick={() => setSelectedFolderId(folder.id)}
              sx={{ flex: 1, justifyContent: 'flex-start' }}
            >
              {folder.name}
            </Button>
            <IconButton size="small" onClick={() => handleRenameFolder(folder.id, prompt('Rename folder:', folder.name) || folder.name)} title="Rename folder"><LabelIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => handleDeleteFolder(folder.id)} title="Delete folder">
              <DeleteMediaButton
                mediaIds={[folder.id]}
                onDelete={handleFolderDeleteWrapper}
                isDanger
                variant="ghost"
                size="sm"
                className="ml-auto"
                iconOnly
              />
            </IconButton>
          </Box>
        ))}
        <Box mt={2}>
          <CreateFolderButton onFolderCreate={handleCreateFolder} />
        </Box>
      </Box>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box py={2} display="flex">
        <FolderSidebarTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelect={(id) => setSelectedFolderId(id)}
          onCreate={handleCreateFolder}
          onRename={handleRenameFolder}
          onDelete={handleDeleteFolder}
          onDropMedia={(id, newFolderId) => {
            handleMoveMedia(id, newFolderId);
          }}
        />
        <Box flex={1} pl={3}>
          <h1>Media Content</h1>
          {/* Analytics Bar */}
          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <Typography>Total: {totalCount}</Typography>
            {typeStats.map(t => (
              <Typography key={t.value}>{t.label}: {t.count}</Typography>
            ))}
            <Typography>Storage: {(totalSize / (1024 * 1024)).toFixed(2)} MB</Typography>
            <Box ml={2}>
              <Button startIcon={<CloudUploadIcon />} variant="contained" {...getRootProps()} disabled={uploading}>
                {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Media'}
                <input {...getInputProps()} />
              </Button>
            </Box>
          </Box>
          {/* Advanced Analytics */}
          <Box display="flex" gap={4} mb={2} flexWrap="wrap">
            <Box>
              <Typography variant="body2">Usage Over Time</Typography>
              <Box display="flex" gap={1} alignItems="flex-end">
                {Object.entries(usageByDate).map(([date, count]) => (
                  <Box key={date} textAlign="center">
                    <Box sx={{ width: 24, height: (count as number) * 4, bgcolor: 'primary.main', mb: 0.5 }} />
                    <Typography variant="caption">{date}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="body2">Usage by Tag</Typography>
              <Box display="flex" gap={1} alignItems="flex-end">
                {Object.entries(usageByTag).map(([tag, count]) => (
                  <Box key={tag} textAlign="center">
                    <Box sx={{ width: 24, height: (count as number) * 4, bgcolor: 'secondary.main', mb: 0.5 }} />
                    <Typography variant="caption">{tag}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
          {/* Bulk Action Bar */}
          {selected.length > 0 && (
            <Toolbar sx={{ background: '#f5f5f5', mb: 2, borderRadius: 1 }}>
              <Typography sx={{ flex: 1 }}>{selected.length} selected</Typography>
              <Button onClick={handleBulkDelete} color="error">Delete</Button>
              <Button onClick={() => setAssignDialogOpen(true)} startIcon={<AssignmentIndIcon />}>Assign</Button>
              <Button onClick={() => setLabelDialogOpen(true)} startIcon={<LabelIcon />}>Label</Button>
              <Button onClick={handleBulkDownload} startIcon={<DownloadIcon />}>Download</Button>
              <DeleteMediaButton
                mediaIds={selected}
                onDelete={handleBulkDeleteWrapper}
                isDanger
                size="sm"
                className="ml-2"
                isBulkAction
              />
            </Toolbar>
          )}
          {/* Filter Bar */}
          <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
            <Checkbox
              indeterminate={someSelected}
              checked={allSelected}
              onChange={handleSelectAll}
              inputProps={{ 'aria-label': 'select all media' }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              >
                {MEDIA_TYPES.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Search"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              sx={{ minWidth: 200 }}
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
          {isLoading ? (
            <Box py={8} textAlign="center">
              {[...Array(10)].map((_, i) => <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />)}
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : filteredMedia.length === 0 ? (
            <p>No media found.</p>
          ) : (
            <Box ref={listRef} sx={{ maxHeight: 600, overflow: 'auto' }}>
              <DraggableMediaGrid
                mediaItems={filteredMedia.map(item => ({
                  id: item.id,
                  url: item.url,
                  name: item.title || item.filename,
                  type: item.type as any,
                  size: item.size,
                  tags: item.tags,
                  dimensions: item.width && item.height ? { width: item.width, height: item.height } : undefined,
                  uploadedAt: item.uploadedAt,
                  thumbnailUrl: item.thumbnailUrl,
                }))}
                itemActions={[{
                  label: 'Details',
                  icon: <InfoIcon fontSize="small" />,
                  onClick: (id: string) => openDetails(id),
                }, {
                  label: 'Edit Image',
                  icon: <CloudUploadIcon fontSize="small" />,
                  onClick: (id: string) => {
                    const media = mediaContent.find(m => m.id === id);
                    if (media) handleEditImage(media);
                  },
                }]}
              />
            </Box>
          )}
          {/* Media Details Drawer */}
          {detailsOpen && detailsMedia && (
            <Box sx={{ width: isMobile ? '100vw' : 400, p: 2, bgcolor: 'background.paper', position: 'fixed', top: 0, right: 0, height: '100vh', zIndex: 1200, boxShadow: 3 }}>
              <Button onClick={() => setDetailsOpen(false)} sx={{ mb: 2 }}>Close</Button>
              <Typography variant="h6">{detailsMedia.title || detailsMedia.filename}</Typography>
              <Typography variant="body2" color="text.secondary">Type: {detailsMedia.type}</Typography>
              <Typography variant="body2" color="text.secondary">Size: {(detailsMedia.size / 1024).toFixed(2)} KB</Typography>
              <Typography variant="body2" color="text.secondary">Uploaded: {detailsMedia.uploadedAt ? new Date(detailsMedia.uploadedAt).toLocaleString() : ''}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">Tags</Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {detailsMedia.tags?.map(tag => <Chip key={tag} label={tag} />)}
              </Box>
              <Typography variant="subtitle2">Notes</Typography>
              <TextField
                label="Notes"
                value={detailsMedia.notes || ''}
                onChange={e => setDetailsMedia(dm => dm ? { ...dm, notes: e.target.value } : dm)}
                fullWidth
                size="small"
                multiline
                minRows={2}
                onBlur={async () => {
                  if (detailsMedia) {
                    await addMediaNotes(detailsMedia.id, detailsMedia.notes || '');
                    showSnackbar('Notes updated', 'success');
                  }
                }}
              />
              <Box mt={2}>
                <ImageEditorButton
                  mediaId={detailsMedia.id}
                  imageUrl={detailsMedia.url}
                  onSave={handleImageEditComplete}
                />
              </Box>
            </Box>
          )}
          {/* Snackbar */}
          <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
            <MuiAlert elevation={6} variant="filled" severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
              {snackbar.message}
            </MuiAlert>
          </Snackbar>
        </Box>
      </Box>
    </DndProvider>
  );
} 