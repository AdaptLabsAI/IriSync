import { UnsplashAdapter, UnsplashPhoto } from '../integrations/UnsplashAdapter';
import { PexelsAdapter, PexelsPhoto } from '../integrations/PexelsAdapter';
import { firestore } from '../core/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

/**
 * Unified interface for stock photos from all providers
 */
export interface StockPhoto {
  id: string;
  provider: 'unsplash' | 'pexels' | 'shutterstock' | 'pixabay';
  originalId: string;
  title: string;
  description?: string;
  altText?: string;
  width: number;
  height: number;
  aspectRatio: number;
  color?: string;
  urls: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
    download?: string;
  };
  photographer: {
    name: string;
    username?: string;
    profileUrl?: string;
    profileImage?: string;
  };
  tags: string[];
  likes?: number;
  downloads?: number;
  views?: number;
  license: {
    type: 'free' | 'premium' | 'editorial';
    attribution: boolean;
    commercial: boolean;
    modification: boolean;
    url?: string;
  };
  metadata: {
    orientation: 'landscape' | 'portrait' | 'square';
    category?: string;
    keywords?: string[];
    uploadDate?: Date;
    featured?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search filters for stock photos
 */
export interface StockPhotoFilters {
  query?: string;
  provider?: 'unsplash' | 'pexels' | 'shutterstock' | 'pixabay' | 'all';
  orientation?: 'landscape' | 'portrait' | 'square' | 'all';
  color?: string;
  category?: string;
  license?: 'free' | 'premium' | 'all';
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: string; // e.g., "16:9", "1:1", "4:3"
  sortBy?: 'relevance' | 'popular' | 'latest' | 'trending';
  page?: number;
  perPage?: number;
}

/**
 * Search result with pagination
 */
export interface StockPhotoSearchResult {
  photos: StockPhoto[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: StockPhotoFilters;
  searchTime: number;
}

/**
 * Download tracking for analytics and compliance
 */
export interface StockPhotoDownload {
  id: string;
  organizationId: string;
  userId: string;
  photoId: string;
  provider: string;
  originalId: string;
  downloadUrl: string;
  size: string;
  purpose: 'content_creation' | 'design' | 'marketing' | 'social_media' | 'other';
  attribution: {
    required: boolean;
    text?: string;
    url?: string;
  };
  downloadedAt: Date;
  usedAt?: Date;
  contentIds?: string[]; // Track which content pieces use this photo
}

/**
 * Usage analytics for stock photos
 */
export interface StockPhotoAnalytics {
  organizationId: string;
  period: { start: Date; end: Date };
  totalDownloads: number;
  downloadsByProvider: Record<string, number>;
  downloadsByCategory: Record<string, number>;
  downloadsByUser: Record<string, number>;
  popularPhotos: Array<{
    photoId: string;
    downloads: number;
    photo: StockPhoto;
  }>;
  topKeywords: Array<{
    keyword: string;
    searches: number;
  }>;
  averageSearchTime: number;
  conversionRate: number; // searches to downloads
}

/**
 * Stock Photo Service - Unified interface for all stock photo providers
 */
export class StockPhotoService {
  private readonly COLLECTION = 'stock_photos';
  private readonly DOWNLOADS_COLLECTION = 'stock_photo_downloads';
  private readonly SEARCHES_COLLECTION = 'stock_photo_searches';

  /**
   * Search for stock photos across all providers
   */
  async searchPhotos(
    filters: StockPhotoFilters,
    organizationId: string,
    userId: string
  ): Promise<StockPhotoSearchResult> {
    const startTime = Date.now();
    
    try {
      const {
        query = '',
        provider = 'all',
        orientation,
        color,
        sortBy = 'relevance',
        page = 1,
        perPage = 20
      } = filters;

      let allPhotos: StockPhoto[] = [];
      const providers = provider === 'all' ? ['unsplash', 'pexels'] : [provider];

      // Search each provider
      for (const providerName of providers) {
        try {
          let providerPhotos: StockPhoto[] = [];

          switch (providerName) {
            case 'unsplash':
              const unsplashResult = await UnsplashAdapter.searchPhotos(
                query,
                page,
                Math.ceil(perPage / providers.length),
                orientation as any,
                color as any,
                sortBy === 'latest' ? 'latest' : 'relevant'
              );
              providerPhotos = unsplashResult.results.map(photo => this.convertUnsplashPhoto(photo));
              break;

            case 'pexels':
              const pexelsResult = await PexelsAdapter.searchPhotos(
                query,
                page,
                Math.ceil(perPage / providers.length),
                orientation as any,
                undefined, // size
                color as any
              );
              providerPhotos = pexelsResult.photos.map(photo => this.convertPexelsPhoto(photo));
              break;
          }

          allPhotos = [...allPhotos, ...providerPhotos];
        } catch (error) {
          console.error(`Error searching ${providerName}:`, error);
          // Continue with other providers
        }
      }

      // Apply additional filters
      allPhotos = this.applyFilters(allPhotos, filters);

      // Sort results
      allPhotos = this.sortPhotos(allPhotos, sortBy);

      // Paginate results
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedPhotos = allPhotos.slice(startIndex, endIndex);

      const searchTime = Date.now() - startTime;

      // Track search for analytics
      await this.trackSearch(organizationId, userId, filters, allPhotos.length, searchTime);

      return {
        photos: paginatedPhotos,
        pagination: {
          page,
          perPage,
          total: allPhotos.length,
          totalPages: Math.ceil(allPhotos.length / perPage),
          hasMore: endIndex < allPhotos.length
        },
        filters,
        searchTime
      };

    } catch (error) {
      console.error('Error searching stock photos:', error);
      throw new Error('Failed to search stock photos');
    }
  }

  /**
   * Get featured/curated photos
   */
  async getFeaturedPhotos(
    provider: 'unsplash' | 'pexels' | 'all' = 'all',
    page: number = 1,
    perPage: number = 20
  ): Promise<StockPhoto[]> {
    try {
      let allPhotos: StockPhoto[] = [];
      const providers = provider === 'all' ? ['unsplash', 'pexels'] : [provider];

      for (const providerName of providers) {
        try {
          let providerPhotos: StockPhoto[] = [];

          switch (providerName) {
            case 'unsplash':
              const unsplashPhotos = await UnsplashAdapter.getFeaturedPhotos(page, Math.ceil(perPage / providers.length));
              providerPhotos = unsplashPhotos.map(photo => this.convertUnsplashPhoto(photo));
              break;

            case 'pexels':
              const pexelsResult = await PexelsAdapter.getCuratedPhotos(page, Math.ceil(perPage / providers.length));
              providerPhotos = pexelsResult.photos.map(photo => this.convertPexelsPhoto(photo));
              break;
          }

          allPhotos = [...allPhotos, ...providerPhotos];
        } catch (error) {
          console.error(`Error getting featured photos from ${providerName}:`, error);
        }
      }

      return allPhotos.slice(0, perPage);
    } catch (error) {
      console.error('Error getting featured photos:', error);
      throw new Error('Failed to get featured photos');
    }
  }

  /**
   * Download a stock photo
   */
  async downloadPhoto(
    photoId: string,
    provider: string,
    size: string,
    organizationId: string,
    userId: string,
    purpose: StockPhotoDownload['purpose'] = 'content_creation'
  ): Promise<{
    downloadUrl: string;
    attribution: StockPhotoDownload['attribution'];
    downloadId: string;
  }> {
    try {
      let downloadUrl: string;
      let attribution: StockPhotoDownload['attribution'];
      let photo: StockPhoto | null = null;

      switch (provider) {
        case 'unsplash':
          const unsplashDownload = await UnsplashAdapter.downloadPhoto(photoId);
          const unsplashPhoto = await UnsplashAdapter.getPhoto(photoId);
          downloadUrl = this.getUnsplashSizeUrl(unsplashPhoto, size);
          photo = this.convertUnsplashPhoto(unsplashPhoto);
          attribution = {
            required: true,
            text: `Photo by ${unsplashPhoto.user.name} on Unsplash`,
            url: unsplashPhoto.links.html
          };
          break;

        case 'pexels':
          const pexelsPhoto = await PexelsAdapter.getPhotoById(parseInt(photoId));
          downloadUrl = this.getPexelsSizeUrl(pexelsPhoto, size);
          photo = this.convertPexelsPhoto(pexelsPhoto);
          attribution = {
            required: true,
            text: `Photo by ${pexelsPhoto.photographer} from Pexels`,
            url: pexelsPhoto.url
          };
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Track download
      const downloadId = uuidv4();
      const download: StockPhotoDownload = {
        id: downloadId,
        organizationId,
        userId,
        photoId: photo!.id,
        provider,
        originalId: photoId,
        downloadUrl,
        size,
        purpose,
        attribution,
        downloadedAt: new Date()
      };

      await setDoc(doc(firestore, this.DOWNLOADS_COLLECTION, downloadId), {
        ...download,
        downloadedAt: Timestamp.fromDate(download.downloadedAt)
      });

      return {
        downloadUrl,
        attribution,
        downloadId
      };

    } catch (error) {
      console.error('Error downloading stock photo:', error);
      throw new Error('Failed to download stock photo');
    }
  }

  /**
   * Track photo usage in content
   */
  async trackPhotoUsage(
    downloadId: string,
    contentId: string,
    contentType: 'post' | 'story' | 'design' | 'campaign'
  ): Promise<void> {
    try {
      const downloadDoc = await getDoc(doc(firestore, this.DOWNLOADS_COLLECTION, downloadId));
      
      if (downloadDoc.exists()) {
        const downloadData = downloadDoc.data() as StockPhotoDownload;
        const contentIds = downloadData.contentIds || [];
        
        if (!contentIds.includes(contentId)) {
          await updateDoc(doc(firestore, this.DOWNLOADS_COLLECTION, downloadId), {
            contentIds: [...contentIds, contentId],
            usedAt: Timestamp.fromDate(new Date())
          });
        }
      }
    } catch (error) {
      console.error('Error tracking photo usage:', error);
    }
  }

  /**
   * Get download history for organization
   */
  async getDownloadHistory(
    organizationId: string,
    limit: number = 50,
    startAfter?: string
  ): Promise<StockPhotoDownload[]> {
    try {
      let downloadsQuery = query(
        collection(firestore, this.DOWNLOADS_COLLECTION),
        where('organizationId', '==', organizationId),
        orderBy('downloadedAt', 'desc'),
        limit(limit)
      );

      const downloadsSnapshot = await getDocs(downloadsQuery);
      const downloads: StockPhotoDownload[] = [];

      downloadsSnapshot.forEach((doc) => {
        const data = doc.data();
        downloads.push({
          ...data,
          downloadedAt: data.downloadedAt.toDate(),
          usedAt: data.usedAt?.toDate()
        } as StockPhotoDownload);
      });

      return downloads;
    } catch (error) {
      console.error('Error getting download history:', error);
      throw new Error('Failed to get download history');
    }
  }

  /**
   * Get analytics for stock photo usage
   */
  async getAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StockPhotoAnalytics> {
    try {
      // Get downloads in date range
      const downloadsQuery = query(
        collection(firestore, this.DOWNLOADS_COLLECTION),
        where('organizationId', '==', organizationId),
        where('downloadedAt', '>=', Timestamp.fromDate(startDate)),
        where('downloadedAt', '<=', Timestamp.fromDate(endDate))
      );

      const downloadsSnapshot = await getDocs(downloadsQuery);
      const downloads: StockPhotoDownload[] = [];

      downloadsSnapshot.forEach((doc) => {
        const data = doc.data();
        downloads.push({
          ...data,
          downloadedAt: data.downloadedAt.toDate()
        } as StockPhotoDownload);
      });

      // Calculate analytics
      const downloadsByProvider: Record<string, number> = {};
      const downloadsByUser: Record<string, number> = {};
      const photoDownloadCounts: Record<string, number> = {};

      downloads.forEach(download => {
        downloadsByProvider[download.provider] = (downloadsByProvider[download.provider] || 0) + 1;
        downloadsByUser[download.userId] = (downloadsByUser[download.userId] || 0) + 1;
        photoDownloadCounts[download.photoId] = (photoDownloadCounts[download.photoId] || 0) + 1;
      });

      // Get search data for conversion rate
      const searchesQuery = query(
        collection(firestore, this.SEARCHES_COLLECTION),
        where('organizationId', '==', organizationId),
        where('searchedAt', '>=', Timestamp.fromDate(startDate)),
        where('searchedAt', '<=', Timestamp.fromDate(endDate))
      );

      const searchesSnapshot = await getDocs(searchesQuery);
      const totalSearches = searchesSnapshot.size;
      const conversionRate = totalSearches > 0 ? (downloads.length / totalSearches) * 100 : 0;

      return {
        organizationId,
        period: { start: startDate, end: endDate },
        totalDownloads: downloads.length,
        downloadsByProvider,
        downloadsByCategory: {}, // Would need category tracking
        downloadsByUser,
        popularPhotos: [], // Would need to fetch photo details
        topKeywords: [], // Would need keyword tracking
        averageSearchTime: 0, // Would calculate from search data
        conversionRate
      };

    } catch (error) {
      console.error('Error getting stock photo analytics:', error);
      throw new Error('Failed to get analytics');
    }
  }

  /**
   * Convert Unsplash photo to unified format
   */
  private convertUnsplashPhoto(photo: UnsplashPhoto): StockPhoto {
    return {
      id: `unsplash_${photo.id}`,
      provider: 'unsplash',
      originalId: photo.id,
      title: photo.alt_description || photo.description || `Unsplash Photo ${photo.id}`,
      description: photo.description || undefined,
      altText: photo.alt_description || undefined,
      width: photo.width,
      height: photo.height,
      aspectRatio: photo.width / photo.height,
      color: photo.color,
      urls: {
        thumbnail: photo.urls.thumb,
        small: photo.urls.small,
        medium: photo.urls.regular,
        large: photo.urls.full,
        original: photo.urls.raw,
        download: photo.links.download_location
      },
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        profileUrl: photo.user.links.html,
        profileImage: photo.user.profile_image.medium
      },
      tags: photo.tags?.map(tag => tag.title) || [],
      likes: photo.likes,
      downloads: photo.downloads,
      license: {
        type: 'free',
        attribution: true,
        commercial: true,
        modification: true,
        url: 'https://unsplash.com/license'
      },
      metadata: {
        orientation: this.getOrientation(photo.width, photo.height),
        keywords: photo.tags?.map(tag => tag.title) || [],
        uploadDate: new Date(photo.created_at),
        featured: false
      },
      createdAt: new Date(photo.created_at),
      updatedAt: new Date(photo.updated_at)
    };
  }

  /**
   * Convert Pexels photo to unified format
   */
  private convertPexelsPhoto(photo: PexelsPhoto): StockPhoto {
    return {
      id: `pexels_${photo.id}`,
      provider: 'pexels',
      originalId: photo.id.toString(),
      title: photo.alt || `Pexels Photo ${photo.id}`,
      description: photo.alt || undefined,
      altText: photo.alt || undefined,
      width: photo.width,
      height: photo.height,
      aspectRatio: photo.width / photo.height,
      color: photo.avg_color,
      urls: {
        thumbnail: photo.src.tiny,
        small: photo.src.small,
        medium: photo.src.medium,
        large: photo.src.large,
        original: photo.src.original
      },
      photographer: {
        name: photo.photographer,
        profileUrl: photo.photographer_url
      },
      tags: [],
      license: {
        type: 'free',
        attribution: true,
        commercial: true,
        modification: true,
        url: 'https://www.pexels.com/license/'
      },
      metadata: {
        orientation: this.getOrientation(photo.width, photo.height),
        featured: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Apply additional filters to photos
   */
  private applyFilters(photos: StockPhoto[], filters: StockPhotoFilters): StockPhoto[] {
    let filtered = [...photos];

    if (filters.minWidth) {
      filtered = filtered.filter(photo => photo.width >= filters.minWidth!);
    }

    if (filters.minHeight) {
      filtered = filtered.filter(photo => photo.height >= filters.minHeight!);
    }

    if (filters.aspectRatio) {
      const [width, height] = filters.aspectRatio.split(':').map(Number);
      const targetRatio = width / height;
      const tolerance = 0.1;
      
      filtered = filtered.filter(photo => 
        Math.abs(photo.aspectRatio - targetRatio) <= tolerance
      );
    }

    if (filters.license && filters.license !== 'all') {
      filtered = filtered.filter(photo => photo.license.type === filters.license);
    }

    return filtered;
  }

  /**
   * Sort photos by specified criteria
   */
  private sortPhotos(photos: StockPhoto[], sortBy: string): StockPhoto[] {
    switch (sortBy) {
      case 'popular':
        return photos.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'latest':
        return photos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'trending':
        return photos.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      case 'relevance':
      default:
        return photos; // Already sorted by relevance from providers
    }
  }

  /**
   * Get photo orientation
   */
  private getOrientation(width: number, height: number): 'landscape' | 'portrait' | 'square' {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return 'square';
    return ratio > 1 ? 'landscape' : 'portrait';
  }

  /**
   * Get Unsplash URL for specific size
   */
  private getUnsplashSizeUrl(photo: UnsplashPhoto, size: string): string {
    switch (size) {
      case 'thumbnail': return photo.urls.thumb;
      case 'small': return photo.urls.small;
      case 'medium': return photo.urls.regular;
      case 'large': return photo.urls.full;
      case 'original': return photo.urls.raw;
      default: return photo.urls.regular;
    }
  }

  /**
   * Get Pexels URL for specific size
   */
  private getPexelsSizeUrl(photo: PexelsPhoto, size: string): string {
    switch (size) {
      case 'thumbnail': return photo.src.tiny;
      case 'small': return photo.src.small;
      case 'medium': return photo.src.medium;
      case 'large': return photo.src.large;
      case 'original': return photo.src.original;
      default: return photo.src.medium;
    }
  }

  /**
   * Track search for analytics
   */
  private async trackSearch(
    organizationId: string,
    userId: string,
    filters: StockPhotoFilters,
    resultCount: number,
    searchTime: number
  ): Promise<void> {
    try {
      const searchId = uuidv4();
      const searchData = {
        id: searchId,
        organizationId,
        userId,
        query: filters.query || '',
        provider: filters.provider || 'all',
        filters: JSON.stringify(filters),
        resultCount,
        searchTime,
        searchedAt: Timestamp.fromDate(new Date())
      };

      await setDoc(doc(firestore, this.SEARCHES_COLLECTION, searchId), searchData);
    } catch (error) {
      console.error('Error tracking search:', error);
      // Don't throw error for analytics tracking
    }
  }
}

// Create and export singleton instance
const stockPhotoService = new StockPhotoService();
export default stockPhotoService; 