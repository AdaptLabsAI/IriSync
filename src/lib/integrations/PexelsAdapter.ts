import axios from 'axios';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
  video_pictures: Array<{
    id: number;
    picture: string;
    nr: number;
  }>;
}

export interface PexelsSearchResult {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
  prev_page?: string;
}

export interface PexelsVideoSearchResult {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideo[];
  url: string;
  next_page?: string;
  prev_page?: string;
}

export interface PexelsCollection {
  id: string;
  title: string;
  description: string;
  private: boolean;
  media_count: number;
  photos_count: number;
  videos_count: number;
}

export class PexelsAdapter {
  private static readonly BASE_URL = 'https://api.pexels.com/v1';
  private static readonly VIDEO_BASE_URL = 'https://api.pexels.com/videos';
  private static readonly API_KEY = process.env.PEXELS_API_KEY;

  private static getHeaders() {
    return {
      'Authorization': this.API_KEY || '',
      'User-Agent': 'IriSync/1.0.0'
    };
  }

  static async searchPhotos(
    query: string,
    page: number = 1,
    perPage: number = 15,
    orientation?: 'landscape' | 'portrait' | 'square',
    size?: 'large' | 'medium' | 'small',
    color?: 'red' | 'orange' | 'yellow' | 'green' | 'turquoise' | 'blue' | 'violet' | 'pink' | 'brown' | 'black' | 'gray' | 'white',
    locale?: string
  ): Promise<PexelsSearchResult> {
    try {
      const params: any = {
        query,
        page,
        per_page: Math.min(perPage, 80), // Pexels max is 80
      };

      if (orientation) params.orientation = orientation;
      if (size) params.size = size;
      if (color) params.color = color;
      if (locale) params.locale = locale;

      const response = await axios.get(`${this.BASE_URL}/search`, {
        params,
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error searching Pexels photos:', error);
      throw new Error('Failed to search photos');
    }
  }

  static async searchVideos(
    query: string,
    page: number = 1,
    perPage: number = 15,
    orientation?: 'landscape' | 'portrait' | 'square',
    size?: 'large' | 'medium' | 'small',
    locale?: string
  ): Promise<PexelsVideoSearchResult> {
    try {
      const params: any = {
        query,
        page,
        per_page: Math.min(perPage, 80),
      };

      if (orientation) params.orientation = orientation;
      if (size) params.size = size;
      if (locale) params.locale = locale;

      const response = await axios.get(`${this.VIDEO_BASE_URL}/search`, {
        params,
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error searching Pexels videos:', error);
      throw new Error('Failed to search videos');
    }
  }

  static async getCuratedPhotos(
    page: number = 1,
    perPage: number = 15
  ): Promise<PexelsSearchResult> {
    try {
      const response = await axios.get(`${this.BASE_URL}/curated`, {
        params: {
          page,
          per_page: Math.min(perPage, 80)
        },
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting curated Pexels photos:', error);
      throw new Error('Failed to get curated photos');
    }
  }

  static async getPopularVideos(
    page: number = 1,
    perPage: number = 15,
    minWidth?: number,
    minHeight?: number,
    minDuration?: number,
    maxDuration?: number
  ): Promise<PexelsVideoSearchResult> {
    try {
      const params: any = {
        page,
        per_page: Math.min(perPage, 80)
      };

      if (minWidth) params.min_width = minWidth;
      if (minHeight) params.min_height = minHeight;
      if (minDuration) params.min_duration = minDuration;
      if (maxDuration) params.max_duration = maxDuration;

      const response = await axios.get(`${this.VIDEO_BASE_URL}/popular`, {
        params,
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting popular Pexels videos:', error);
      throw new Error('Failed to get popular videos');
    }
  }

  static async getPhotoById(photoId: number): Promise<PexelsPhoto> {
    try {
      const response = await axios.get(`${this.BASE_URL}/photos/${photoId}`, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Pexels photo by ID:', error);
      throw new Error('Failed to get photo');
    }
  }

  static async getVideoById(videoId: number): Promise<PexelsVideo> {
    try {
      const response = await axios.get(`${this.VIDEO_BASE_URL}/videos/${videoId}`, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Pexels video by ID:', error);
      throw new Error('Failed to get video');
    }
  }

  static async getCollections(
    page: number = 1,
    perPage: number = 15
  ): Promise<{ collections: PexelsCollection[] }> {
    try {
      const response = await axios.get(`${this.BASE_URL}/collections`, {
        params: {
          page,
          per_page: Math.min(perPage, 80)
        },
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Pexels collections:', error);
      throw new Error('Failed to get collections');
    }
  }

  static async getCollectionMedia(
    collectionId: string,
    type: 'photos' | 'videos' = 'photos',
    page: number = 1,
    perPage: number = 15
  ): Promise<PexelsSearchResult | PexelsVideoSearchResult> {
    try {
      const endpoint = type === 'videos' 
        ? `${this.VIDEO_BASE_URL}/collections/${collectionId}`
        : `${this.BASE_URL}/collections/${collectionId}`;

      const response = await axios.get(endpoint, {
        params: {
          page,
          per_page: Math.min(perPage, 80)
        },
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Pexels collection media:', error);
      throw new Error('Failed to get collection media');
    }
  }

  // Convert photo to our standard file format
  static formatPhotoAsFile(photo: PexelsPhoto) {
    return {
      id: photo.id.toString(),
      name: photo.alt || `Pexels Photo ${photo.id}`,
      type: 'file',
      mimeType: 'image/jpeg',
      size: 0, // Pexels doesn't provide file size
      lastModified: new Date().toISOString(), // Pexels doesn't provide modification date
      thumbnailUrl: photo.src.tiny,
      previewUrl: photo.src.small,
      downloadUrl: photo.src.original,
      fullUrl: photo.src.original,
      platform: 'pexels',
      metadata: {
        width: photo.width,
        height: photo.height,
        avgColor: photo.avg_color,
        photographer: {
          name: photo.photographer,
          url: photo.photographer_url,
          id: photo.photographer_id
        },
        pexelsUrl: photo.url,
        liked: photo.liked,
        sizes: {
          large2x: photo.src.large2x,
          large: photo.src.large,
          medium: photo.src.medium,
          small: photo.src.small,
          portrait: photo.src.portrait,
          landscape: photo.src.landscape,
          tiny: photo.src.tiny
        }
      }
    };
  }

  // Convert video to our standard file format
  static formatVideoAsFile(video: PexelsVideo) {
    const bestQuality = video.video_files.find(file => file.quality === 'hd') || 
                       video.video_files.find(file => file.quality === 'sd') ||
                       video.video_files[0];

    return {
      id: video.id.toString(),
      name: `Pexels Video ${video.id}`,
      type: 'file',
      mimeType: 'video/mp4',
      size: 0, // Pexels doesn't provide file size
      lastModified: new Date().toISOString(),
      thumbnailUrl: video.image,
      previewUrl: video.image,
      downloadUrl: bestQuality?.link || '',
      fullUrl: bestQuality?.link || '',
      platform: 'pexels',
      metadata: {
        width: video.width,
        height: video.height,
        duration: video.duration,
        user: {
          name: video.user.name,
          url: video.user.url,
          id: video.user.id
        },
        pexelsUrl: video.url,
        videoFiles: video.video_files.map(file => ({
          id: file.id,
          quality: file.quality,
          fileType: file.file_type,
          width: file.width,
          height: file.height,
          link: file.link
        })),
        videoPictures: video.video_pictures.map(pic => ({
          id: pic.id,
          picture: pic.picture,
          nr: pic.nr
        }))
      }
    };
  }

  static async listFiles(
    accessToken: string | null = null,
    query: string = '',
    page: number = 1,
    type: 'photos' | 'videos' | 'curated' = 'photos'
  ) {
    try {
      const perPage = 20;

      if (type === 'videos') {
        let result: PexelsVideoSearchResult;
        
        if (query && query.trim()) {
          result = await this.searchVideos(query, page, perPage);
        } else {
          result = await this.getPopularVideos(page, perPage);
        }

        return result.videos.map(video => this.formatVideoAsFile(video));
      } else {
        let result: PexelsSearchResult;

        if (type === 'curated') {
          result = await this.getCuratedPhotos(page, perPage);
        } else if (query && query.trim()) {
          result = await this.searchPhotos(query, page, perPage);
        } else {
          result = await this.getCuratedPhotos(page, perPage);
        }

        return result.photos.map(photo => this.formatPhotoAsFile(photo));
      }
    } catch (error) {
      console.error('Error listing Pexels files:', error);
      throw new Error('Failed to list Pexels content');
    }
  }
} 