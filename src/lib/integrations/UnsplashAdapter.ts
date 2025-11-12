import axios from 'axios';

export interface UnsplashPhoto {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string | null;
    twitter_username: string | null;
    portfolio_url: string | null;
    bio: string | null;
    location: string | null;
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
      following: string;
      followers: string;
    };
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    instagram_username: string | null;
    total_collections: number;
    total_likes: number;
    total_photos: number;
  };
  tags: Array<{
    type: string;
    title: string;
  }>;
  likes: number;
  downloads: number;
}

export interface UnsplashSearchResult {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export class UnsplashAdapter {
  private static readonly BASE_URL = 'https://api.unsplash.com';
  private static readonly ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

  static getAuthUrl(state: string) {
    // Unsplash doesn't require OAuth for basic access - just API key
    // But we can implement OAuth for user-specific features if needed
    const params = new URLSearchParams({
      client_id: process.env.UNSPLASH_ACCESS_KEY || '',
      redirect_uri: process.env.UNSPLASH_CALLBACK_URL || '',
      response_type: 'code',
      scope: 'public+read_user+write_user+read_photos+write_photos+write_likes+write_followers+read_collections+write_collections',
      state
    });

    return `https://unsplash.com/oauth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForToken(code: string) {
    try {
      const response = await axios.post('https://unsplash.com/oauth/token', {
        client_id: process.env.UNSPLASH_ACCESS_KEY,
        client_secret: process.env.UNSPLASH_SECRET_KEY,
        redirect_uri: process.env.UNSPLASH_CALLBACK_URL,
        code,
        grant_type: 'authorization_code'
      });

      return {
        access_token: response.data.access_token,
        token_type: response.data.token_type,
        scope: response.data.scope,
        created_at: response.data.created_at
      };
    } catch (error) {
      console.error('Error exchanging Unsplash code for token:', error);
      throw new Error('Failed to exchange code for token');
    }
  }

  static async searchPhotos(
    query: string, 
    page: number = 1, 
    perPage: number = 20,
    orientation?: 'landscape' | 'portrait' | 'squarish',
    color?: 'black_and_white' | 'black' | 'white' | 'yellow' | 'orange' | 'red' | 'purple' | 'magenta' | 'green' | 'teal' | 'blue',
    orderBy?: 'relevant' | 'latest'
  ): Promise<UnsplashSearchResult> {
    try {
      const params: any = {
        query,
        page,
        per_page: Math.min(perPage, 30), // Unsplash max is 30
        client_id: this.ACCESS_KEY
      };

      if (orientation) params.orientation = orientation;
      if (color) params.color = color;
      if (orderBy) params.order_by = orderBy;

      const response = await axios.get(`${this.BASE_URL}/search/photos`, {
        params,
        headers: {
          'Accept-Version': 'v1'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error searching Unsplash photos:', error);
      throw new Error('Failed to search photos');
    }
  }

  static async getPhoto(photoId: string): Promise<UnsplashPhoto> {
    try {
      const response = await axios.get(`${this.BASE_URL}/photos/${photoId}`, {
        params: {
          client_id: this.ACCESS_KEY
        },
        headers: {
          'Accept-Version': 'v1'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Unsplash photo:', error);
      throw new Error('Failed to get photo');
    }
  }

  static async downloadPhoto(photoId: string): Promise<{ url: string; downloadLocation: string }> {
    try {
      // First get the download location
      const response = await axios.get(`${this.BASE_URL}/photos/${photoId}/download`, {
        params: {
          client_id: this.ACCESS_KEY
        },
        headers: {
          'Accept-Version': 'v1'
        }
      });

      return {
        url: response.data.url,
        downloadLocation: response.data.url
      };
    } catch (error) {
      console.error('Error getting Unsplash download URL:', error);
      throw new Error('Failed to get download URL');
    }
  }

  static async triggerDownload(downloadLocation: string): Promise<void> {
    try {
      // This endpoint is required by Unsplash API to track downloads
      await axios.get(downloadLocation, {
        params: {
          client_id: this.ACCESS_KEY
        }
      });
    } catch (error) {
      console.error('Error triggering Unsplash download:', error);
      // Don't throw error as this is just for tracking
    }
  }

  static async getFeaturedPhotos(page: number = 1, perPage: number = 20): Promise<UnsplashPhoto[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/photos`, {
        params: {
          page,
          per_page: Math.min(perPage, 30),
          order_by: 'popular',
          client_id: this.ACCESS_KEY
        },
        headers: {
          'Accept-Version': 'v1'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting featured Unsplash photos:', error);
      throw new Error('Failed to get featured photos');
    }
  }

  static async getCollections(page: number = 1, perPage: number = 20) {
    try {
      const response = await axios.get(`${this.BASE_URL}/collections`, {
        params: {
          page,
          per_page: Math.min(perPage, 30),
          client_id: this.ACCESS_KEY
        },
        headers: {
          'Accept-Version': 'v1'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Unsplash collections:', error);
      throw new Error('Failed to get collections');
    }
  }

  static async getCollectionPhotos(collectionId: string, page: number = 1, perPage: number = 20): Promise<UnsplashPhoto[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/collections/${collectionId}/photos`, {
        params: {
          page,
          per_page: Math.min(perPage, 30),
          client_id: this.ACCESS_KEY
        },
        headers: {
          'Accept-Version': 'v1'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Unsplash collection photos:', error);
      throw new Error('Failed to get collection photos');
    }
  }

  // Convert to our standard file format
  static formatAsFile(photo: UnsplashPhoto) {
    return {
      id: photo.id,
      name: photo.alt_description || photo.description || `Unsplash Photo ${photo.id}`,
      type: 'file',
      mimeType: 'image/jpeg',
      size: 0, // Unsplash doesn't provide file size
      lastModified: photo.updated_at,
      thumbnailUrl: photo.urls.thumb,
      previewUrl: photo.urls.small,
      downloadUrl: photo.urls.regular,
      fullUrl: photo.urls.full,
      platform: 'unsplash',
      metadata: {
        width: photo.width,
        height: photo.height,
        color: photo.color,
        likes: photo.likes,
        downloads: photo.downloads,
        photographer: {
          name: photo.user.name,
          username: photo.user.username,
          profileUrl: photo.user.links.html,
          profileImage: photo.user.profile_image.medium
        },
        tags: photo.tags?.map(tag => tag.title) || [],
        unsplashUrl: photo.links.html
      }
    };
  }

  static async listFiles(accessToken: string | null = null, query: string = '', page: number = 1) {
    try {
      let photos: UnsplashPhoto[];

      if (query && query.trim()) {
        // Search for specific photos
        const searchResult = await this.searchPhotos(query, page, 20);
        photos = searchResult.results;
      } else {
        // Get featured/popular photos
        photos = await this.getFeaturedPhotos(page, 20);
      }

      return photos.map(photo => this.formatAsFile(photo));
    } catch (error) {
      console.error('Error listing Unsplash files:', error);
      throw new Error('Failed to list Unsplash photos');
    }
  }
} 