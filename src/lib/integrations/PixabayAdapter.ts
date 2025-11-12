import axios from 'axios';

export interface PixabayImage {
  id: number;
  pageURL: string;
  type: 'photo' | 'illustration' | 'vector';
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  fullHDURL?: string;
  vectorURL?: string;
  views: number;
  downloads: number;
  collections: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface PixabayVideo {
  id: number;
  pageURL: string;
  type: 'film' | 'animation';
  tags: string;
  duration: number;
  picture_id: string;
  videos: {
    large: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    medium: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    small: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    tiny: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface PixabaySearchResult {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

export interface PixabayVideoSearchResult {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

export class PixabayAdapter {
  private static readonly BASE_URL = 'https://pixabay.com/api';
  private static readonly VIDEO_BASE_URL = 'https://pixabay.com/api/videos';
  private static readonly API_KEY = process.env.PIXABAY_API_KEY;

  static async searchImages(
    query: string = '',
    page: number = 1,
    perPage: number = 20,
    imageType: 'all' | 'photo' | 'illustration' | 'vector' = 'all',
    orientation: 'all' | 'horizontal' | 'vertical' = 'all',
    category: 'backgrounds' | 'fashion' | 'nature' | 'science' | 'education' | 'feelings' | 'health' | 'people' | 'religion' | 'places' | 'animals' | 'industry' | 'computer' | 'food' | 'sports' | 'transportation' | 'travel' | 'buildings' | 'business' | 'music' = 'backgrounds',
    minWidth: number = 0,
    minHeight: number = 0,
    colors: 'grayscale' | 'transparent' | 'red' | 'orange' | 'yellow' | 'green' | 'turquoise' | 'blue' | 'lilac' | 'pink' | 'white' | 'gray' | 'black' | 'brown' = 'grayscale',
    editorsChoice: boolean = false,
    safeSearch: boolean = true,
    order: 'popular' | 'latest' | 'ec' = 'popular'
  ): Promise<PixabaySearchResult> {
    try {
      const params: any = {
        key: this.API_KEY,
        q: encodeURIComponent(query),
        image_type: imageType,
        orientation,
        category,
        min_width: minWidth,
        min_height: minHeight,
        colors,
        editors_choice: editorsChoice,
        safesearch: safeSearch,
        order,
        page,
        per_page: Math.min(perPage, 200), // Pixabay max is 200
        pretty: true
      };

      const response = await axios.get(this.BASE_URL, { params });
      return response.data;
    } catch (error) {
      console.error('Error searching Pixabay images:', error);
      throw new Error('Failed to search images');
    }
  }

  static async searchVideos(
    query: string = '',
    page: number = 1,
    perPage: number = 20,
    videoType: 'all' | 'film' | 'animation' = 'all',
    category: 'backgrounds' | 'fashion' | 'nature' | 'science' | 'education' | 'feelings' | 'health' | 'people' | 'religion' | 'places' | 'animals' | 'industry' | 'computer' | 'food' | 'sports' | 'transportation' | 'travel' | 'buildings' | 'business' | 'music' = 'backgrounds',
    minWidth: number = 0,
    minHeight: number = 0,
    editorsChoice: boolean = false,
    safeSearch: boolean = true,
    order: 'popular' | 'latest' | 'ec' = 'popular'
  ): Promise<PixabayVideoSearchResult> {
    try {
      const params: any = {
        key: this.API_KEY,
        q: encodeURIComponent(query),
        video_type: videoType,
        category,
        min_width: minWidth,
        min_height: minHeight,
        editors_choice: editorsChoice,
        safesearch: safeSearch,
        order,
        page,
        per_page: Math.min(perPage, 200),
        pretty: true
      };

      const response = await axios.get(this.VIDEO_BASE_URL, { params });
      return response.data;
    } catch (error) {
      console.error('Error searching Pixabay videos:', error);
      throw new Error('Failed to search videos');
    }
  }

  static async getImageById(imageId: number): Promise<PixabayImage | null> {
    try {
      const result = await this.searchImages('', 1, 1);
      return result.hits.find(image => image.id === imageId) || null;
    } catch (error) {
      console.error('Error getting Pixabay image by ID:', error);
      throw new Error('Failed to get image');
    }
  }

  static async getVideoById(videoId: number): Promise<PixabayVideo | null> {
    try {
      const result = await this.searchVideos('', 1, 1);
      return result.hits.find(video => video.id === videoId) || null;
    } catch (error) {
      console.error('Error getting Pixabay video by ID:', error);
      throw new Error('Failed to get video');
    }
  }

  static async getPopularImages(
    page: number = 1,
    perPage: number = 20,
    imageType: 'all' | 'photo' | 'illustration' | 'vector' = 'all'
  ): Promise<PixabaySearchResult> {
    try {
      return await this.searchImages('', page, perPage, imageType, 'all', 'backgrounds', 0, 0, 'grayscale', false, true, 'popular');
    } catch (error) {
      console.error('Error getting popular Pixabay images:', error);
      throw new Error('Failed to get popular images');
    }
  }

  static async getPopularVideos(
    page: number = 1,
    perPage: number = 20,
    videoType: 'all' | 'film' | 'animation' = 'all'
  ): Promise<PixabayVideoSearchResult> {
    try {
      return await this.searchVideos('', page, perPage, videoType, 'backgrounds', 0, 0, false, true, 'popular');
    } catch (error) {
      console.error('Error getting popular Pixabay videos:', error);
      throw new Error('Failed to get popular videos');
    }
  }

  static async getEditorsChoiceImages(
    page: number = 1,
    perPage: number = 20
  ): Promise<PixabaySearchResult> {
    try {
      return await this.searchImages('', page, perPage, 'all', 'all', 'backgrounds', 0, 0, 'grayscale', true, true, 'ec');
    } catch (error) {
      console.error('Error getting editors choice Pixabay images:', error);
      throw new Error('Failed to get editors choice images');
    }
  }

  static async getEditorsChoiceVideos(
    page: number = 1,
    perPage: number = 20
  ): Promise<PixabayVideoSearchResult> {
    try {
      return await this.searchVideos('', page, perPage, 'all', 'backgrounds', 0, 0, true, true, 'ec');
    } catch (error) {
      console.error('Error getting editors choice Pixabay videos:', error);
      throw new Error('Failed to get editors choice videos');
    }
  }

  // Convert image to our standard file format
  static formatImageAsFile(image: PixabayImage) {
    const mimeType = image.type === 'vector' ? 'image/svg+xml' : 'image/jpeg';
    const downloadUrl = image.vectorURL || image.largeImageURL || image.webformatURL;

    return {
      id: image.id.toString(),
      name: image.tags.split(',')[0]?.trim() || `Pixabay ${image.type} ${image.id}`,
      type: 'file',
      mimeType,
      size: 0, // Pixabay doesn't provide file size
      lastModified: new Date().toISOString(), // Pixabay doesn't provide modification date
      thumbnailUrl: image.previewURL,
      previewUrl: image.webformatURL,
      downloadUrl,
      fullUrl: downloadUrl,
      platform: 'pixabay',
      metadata: {
        width: image.webformatWidth,
        height: image.webformatHeight,
        type: image.type,
        tags: image.tags.split(',').map(tag => tag.trim()),
        views: image.views,
        downloads: image.downloads,
        collections: image.collections,
        likes: image.likes,
        comments: image.comments,
        user: {
          id: image.user_id,
          name: image.user,
          imageUrl: image.userImageURL
        },
        pixabayUrl: image.pageURL,
        sizes: {
          preview: {
            url: image.previewURL,
            width: image.previewWidth,
            height: image.previewHeight
          },
          webformat: {
            url: image.webformatURL,
            width: image.webformatWidth,
            height: image.webformatHeight
          },
          large: image.largeImageURL,
          fullHD: image.fullHDURL,
          vector: image.vectorURL
        }
      }
    };
  }

  // Convert video to our standard file format
  static formatVideoAsFile(video: PixabayVideo) {
    const bestQuality = video.videos.large || video.videos.medium || video.videos.small || video.videos.tiny;

    return {
      id: video.id.toString(),
      name: video.tags.split(',')[0]?.trim() || `Pixabay Video ${video.id}`,
      type: 'file',
      mimeType: 'video/mp4',
      size: bestQuality.size || 0,
      lastModified: new Date().toISOString(),
      thumbnailUrl: `https://i.vimeocdn.com/video/${video.picture_id}_295x166.jpg`,
      previewUrl: `https://i.vimeocdn.com/video/${video.picture_id}_295x166.jpg`,
      downloadUrl: bestQuality.url,
      fullUrl: bestQuality.url,
      platform: 'pixabay',
      metadata: {
        width: bestQuality.width,
        height: bestQuality.height,
        duration: video.duration,
        type: video.type,
        tags: video.tags.split(',').map(tag => tag.trim()),
        views: video.views,
        downloads: video.downloads,
        likes: video.likes,
        comments: video.comments,
        user: {
          id: video.user_id,
          name: video.user,
          imageUrl: video.userImageURL
        },
        pixabayUrl: video.pageURL,
        pictureId: video.picture_id,
        videoSizes: {
          large: video.videos.large,
          medium: video.videos.medium,
          small: video.videos.small,
          tiny: video.videos.tiny
        }
      }
    };
  }

  static async listFiles(
    accessToken: string | null = null,
    query: string = '',
    page: number = 1,
    type: 'images' | 'videos' | 'photos' | 'illustrations' | 'vectors' | 'editors_choice' = 'images'
  ) {
    try {
      const perPage = 20;

      if (type === 'videos') {
        let result: PixabayVideoSearchResult;
        
        if (query && query.trim()) {
          result = await this.searchVideos(query, page, perPage);
        } else {
          result = await this.getPopularVideos(page, perPage);
        }

        return result.hits.map(video => this.formatVideoAsFile(video));
      } else {
        let result: PixabaySearchResult;
        let imageType: 'all' | 'photo' | 'illustration' | 'vector' = 'all';

        // Map type to imageType
        if (type === 'photos') imageType = 'photo';
        else if (type === 'illustrations') imageType = 'illustration';
        else if (type === 'vectors') imageType = 'vector';

        if (type === 'editors_choice') {
          result = await this.getEditorsChoiceImages(page, perPage);
        } else if (query && query.trim()) {
          result = await this.searchImages(query, page, perPage, imageType);
        } else {
          result = await this.getPopularImages(page, perPage, imageType);
        }

        return result.hits.map(image => this.formatImageAsFile(image));
      }
    } catch (error) {
      console.error('Error listing Pixabay files:', error);
      throw new Error('Failed to list Pixabay content');
    }
  }

  // Get available categories
  static getCategories() {
    return [
      'backgrounds', 'fashion', 'nature', 'science', 'education', 
      'feelings', 'health', 'people', 'religion', 'places', 
      'animals', 'industry', 'computer', 'food', 'sports', 
      'transportation', 'travel', 'buildings', 'business', 'music'
    ];
  }

  // Get available colors
  static getColors() {
    return [
      'grayscale', 'transparent', 'red', 'orange', 'yellow', 
      'green', 'turquoise', 'blue', 'lilac', 'pink', 
      'white', 'gray', 'black', 'brown'
    ];
  }
} 