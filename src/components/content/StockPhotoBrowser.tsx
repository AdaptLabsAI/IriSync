'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  Tooltip,
  Badge,
  Stack,
  Divider,
  Paper,
  Skeleton
} from '@mui/material';
import {
  Search,
  Download,
  Favorite,
  FavoriteBorder,
  FilterList,
  ViewModule,
  ViewList,
  Info,
  PhotoLibrary,
  Person,
  AspectRatio,
  Palette,
  Sort,
  Close,
  CheckCircle
} from '@mui/icons-material';
import { useToast } from '@/components/ui/use-toast';
import { StockPhoto, StockPhotoFilters, StockPhotoSearchResult } from '@/lib/features/content/StockPhotoService';

interface StockPhotoBrowserProps {
  onPhotoSelect?: (photo: StockPhoto, downloadInfo?: any) => void;
  selectionMode?: boolean;
  maxSelections?: number;
  initialFilters?: Partial<StockPhotoFilters>;
  showDownloadButton?: boolean;
  showFavorites?: boolean;
}

const StockPhotoBrowser: React.FC<StockPhotoBrowserProps> = ({
  onPhotoSelect,
  selectionMode = false,
  maxSelections = 1,
  initialFilters = {},
  showDownloadButton = true,
  showFavorites = true
}) => {
  const [searchResult, setSearchResult] = useState<StockPhotoSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [downloadDialog, setDownloadDialog] = useState<{
    open: boolean;
    photo: StockPhoto | null;
  }>({ open: false, photo: null });
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<StockPhotoFilters>({
    query: '',
    provider: 'all',
    orientation: 'all',
    sortBy: 'relevance',
    page: 1,
    perPage: 20,
    ...initialFilters
  });

  const { showErrorToast, showSuccessToast } = useToast();

  // Search photos
  const searchPhotos = useCallback(async (newFilters?: Partial<StockPhotoFilters>) => {
    setLoading(true);
    setError(null);

    try {
      const searchFilters = { ...filters, ...newFilters };
      
      const response = await fetch('/api/content/stock-photos/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchFilters)
      });

      if (!response.ok) {
        throw new Error('Failed to search photos');
      }

      const result = await response.json();
      setSearchResult(result.data);
      setFilters(searchFilters);
    } catch (error) {
      console.error('Error searching photos:', error);
      setError('Failed to search photos. Please try again.');
      showErrorToast({
        title: 'Search failed',
        description: 'Unable to search for photos. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, showErrorToast]);

  // Load featured photos on mount
  useEffect(() => {
    if (!filters.query) {
      loadFeaturedPhotos();
    }
  }, []);

  const loadFeaturedPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/content/stock-photos/search?provider=${filters.provider}&page=${filters.page}&perPage=${filters.perPage}`);
      if (!response.ok) throw new Error('Failed to load featured photos');
      
      const result = await response.json();
      setSearchResult({
        photos: result.data.photos,
        pagination: result.data.pagination,
        filters: filters,
        searchTime: 0
      });
    } catch (error) {
      setError('Failed to load featured photos');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    searchPhotos({ query, page: 1 });
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<StockPhotoFilters>) => {
    searchPhotos({ ...newFilters, page: 1 });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    searchPhotos({ page });
  };

  // Handle photo selection
  const handlePhotoSelect = (photo: StockPhoto) => {
    if (selectionMode) {
      const newSelected = new Set(selectedPhotos);
      
      if (newSelected.has(photo.id)) {
        newSelected.delete(photo.id);
      } else if (newSelected.size < maxSelections) {
        newSelected.add(photo.id);
      } else {
        showErrorToast({
          title: 'Selection limit reached',
          description: `You can only select up to ${maxSelections} photo(s).`
        });
        return;
      }
      
      setSelectedPhotos(newSelected);
      onPhotoSelect?.(photo);
    } else {
      onPhotoSelect?.(photo);
    }
  };

  // Handle photo download
  const handleDownload = async (photo: StockPhoto, size: string = 'medium', purpose: string = 'content_creation') => {
    const photoKey = `${photo.provider}_${photo.originalId}`;
    setDownloading(prev => new Set(prev).add(photoKey));

    try {
      const response = await fetch('/api/content/stock-photos/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: photo.originalId,
          provider: photo.provider,
          size,
          purpose
        })
      });

      if (!response.ok) {
        throw new Error('Failed to download photo');
      }

      const result = await response.json();
      
      showSuccessToast({
        title: 'Photo downloaded',
        description: 'Photo downloaded successfully. Remember to include attribution.'
      });

      // Open download URL in new tab
      window.open(result.data.downloadUrl, '_blank');

      // Close dialog and notify parent
      setDownloadDialog({ open: false, photo: null });
      onPhotoSelect?.(photo, result.data);

    } catch (error) {
      console.error('Error downloading photo:', error);
      showErrorToast({
        title: 'Download failed',
        description: 'Failed to download photo. Please try again.'
      });
    } finally {
      setDownloading(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoKey);
        return newSet;
      });
    }
  };

  // Toggle favorite
  const toggleFavorite = (photoId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(photoId)) {
      newFavorites.delete(photoId);
    } else {
      newFavorites.add(photoId);
    }
    setFavorites(newFavorites);
  };

  // Render photo card
  const renderPhotoCard = (photo: StockPhoto) => {
    const isSelected = selectedPhotos.has(photo.id);
    const isFavorite = favorites.has(photo.id);
    const photoKey = `${photo.provider}_${photo.originalId}`;
    const isDownloading = downloading.has(photoKey);

    return (
      <Card
        key={photo.id}
        sx={{
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4
          }
        }}
        onClick={() => handlePhotoSelect(photo)}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height={viewMode === 'grid' ? 200 : 120}
            image={photo.urls.small}
            alt={photo.title}
            sx={{ objectFit: 'cover' }}
          />
          
          {/* Overlay with actions */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 1
            }}
          >
            {showFavorites && (
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(photo.id);
                }}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' }
                }}
              >
                {isFavorite ? (
                  <Favorite color="error" fontSize="small" />
                ) : (
                  <FavoriteBorder fontSize="small" />
                )}
              </IconButton>
            )}
            
            {showDownloadButton && (
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDownloadDialog({ open: true, photo });
                }}
                disabled={isDownloading}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' }
                }}
              >
                {isDownloading ? (
                  <CircularProgress size={16} />
                ) : (
                  <Download fontSize="small" />
                )}
              </IconButton>
            )}
          </Box>

          {/* Selection indicator */}
          {selectionMode && isSelected && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                bgcolor: 'primary.main',
                borderRadius: '50%',
                p: 0.5
              }}
            >
              <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
            </Box>
          )}

          {/* Provider badge */}
          <Chip
            label={photo.provider}
            size="sm"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              textTransform: 'capitalize'
            }}
          />
        </Box>

        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" noWrap>
            {photo.title}
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Person fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary" noWrap>
              {photo.photographer.name}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip
              label={`${photo.width}×${photo.height}`}
              size="sm"
              variant="outlined"
            />
            <Chip
              label={photo.metadata.orientation}
              size="sm"
              variant="outlined"
            />
          </Stack>

          {photo.tags.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {photo.tags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="sm"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <Grid container spacing={2}>
      {Array.from({ length: 12 }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Card>
            <Skeleton variant="rectangular" height={200} />
            <CardContent>
              <Skeleton variant="ghost" />
              <Skeleton variant="ghost" width="60%" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          {/* Search Bar */}
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Search for photos..."
              value={filters.query || ''}
              onChange={(e: any) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(filters.query || '')}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
            <Button
              variant="primary"
              onClick={() => handleSearch(filters.query || '')}
              disabled={loading}
            >
              Search
            </Button>
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterList />
            </IconButton>
          </Stack>

          {/* Filters */}
          {showFilters && (
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControl size="sm" sx={{ minWidth: 120 }}>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={filters.provider || 'all'}
                  label="Provider"
                  onChange={(e: any) => handleFilterChange({ provider: e.target.value as any })}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="unsplash">Unsplash</MenuItem>
                  <MenuItem value="pexels">Pexels</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="sm" sx={{ minWidth: 120 }}>
                <InputLabel>Orientation</InputLabel>
                <Select
                  value={filters.orientation || 'all'}
                  label="Orientation"
                  onChange={(e: any) => handleFilterChange({ orientation: e.target.value as any })}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="landscape">Landscape</MenuItem>
                  <MenuItem value="portrait">Portrait</MenuItem>
                  <MenuItem value="square">Square</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="sm" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy || 'relevance'}
                  label="Sort By"
                  onChange={(e: any) => handleFilterChange({ sortBy: e.target.value as any })}
                >
                  <MenuItem value="relevance">Relevance</MenuItem>
                  <MenuItem value="popular">Popular</MenuItem>
                  <MenuItem value="latest">Latest</MenuItem>
                  <MenuItem value="trending">Trending</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          {/* View Controls */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <ViewModule />
              </IconButton>
              <IconButton
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <ViewList />
              </IconButton>
              
              {selectionMode && (
                <Badge badgeContent={selectedPhotos.size} color="primary">
                  <PhotoLibrary />
                </Badge>
              )}
            </Stack>

            {searchResult && (
              <Typography variant="body2" color="text.secondary">
                {searchResult.pagination.total} photos found
                {searchResult.searchTime > 0 && ` in ${searchResult.searchTime}ms`}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Photos Grid */}
      {loading ? (
        renderSkeleton()
      ) : searchResult?.photos.length ? (
        <>
          <Grid container spacing={2}>
            {searchResult.photos.map((photo) => (
              <Grid
                item
                xs={12}
                sm={viewMode === 'grid' ? 6 : 12}
                md={viewMode === 'grid' ? 4 : 12}
                lg={viewMode === 'grid' ? 3 : 12}
                key={photo.id}
              >
                {renderPhotoCard(photo)}
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {searchResult.pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={searchResult.pagination.totalPages}
                page={searchResult.pagination.page}
                onChange={(_, page) => handlePageChange(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PhotoLibrary sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No photos found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or filters
          </Typography>
        </Box>
      )}

      {/* Download Dialog */}
      <Dialog
        open={downloadDialog.open}
        onClose={() => setDownloadDialog({ open: false, photo: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Download Photo
          <IconButton
            onClick={() => setDownloadDialog({ open: false, photo: null })}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        {downloadDialog.photo && (
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <img
                src={downloadDialog.photo.urls.small}
                alt={downloadDialog.photo.title}
                style={{ width: '100%', borderRadius: 8 }}
              />
            </Box>
            
            <Typography variant="h6" gutterBottom>
              {downloadDialog.photo.title}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              By {downloadDialog.photo.photographer.name} on {downloadDialog.photo.provider}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Attribution Required:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
              Photo by {downloadDialog.photo.photographer.name} on {downloadDialog.photo.provider}
            </Typography>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Size</InputLabel>
              <Select defaultValue="medium" label="Size">
                <MenuItem value="thumbnail">Thumbnail (150px)</MenuItem>
                <MenuItem value="small">Small (400px)</MenuItem>
                <MenuItem value="medium">Medium (800px)</MenuItem>
                <MenuItem value="large">Large (1200px)</MenuItem>
                <MenuItem value="original">Original</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Purpose</InputLabel>
              <Select defaultValue="content_creation" label="Purpose">
                <MenuItem value="content_creation">Content Creation</MenuItem>
                <MenuItem value="design">Design</MenuItem>
                <MenuItem value="marketing">Marketing</MenuItem>
                <MenuItem value="social_media">Social Media</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
        )}
        
        <DialogActions>
          <Button onClick={() => setDownloadDialog({ open: false, photo: null })}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => downloadDialog.photo && handleDownload(downloadDialog.photo)}
            disabled={!downloadDialog.photo}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockPhotoBrowser; 