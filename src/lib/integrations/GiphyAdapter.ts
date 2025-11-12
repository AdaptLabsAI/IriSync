import axios from 'axios';

export interface GiphyGif {
  type: string;
  id: string;
  url: string;
  slug: string;
  bitly_gif_url: string;
  bitly_url: string;
  embed_url: string;
  username: string;
  source: string;
  title: string;
  rating: string;
  content_url: string;
  source_tld: string;
  source_post_url: string;
  is_sticker: number;
  import_datetime: string;
  trending_datetime: string;
  images: {
    original: {
      height: string;
      width: string;
      size: string;
      url: string;
      mp4_size: string;
      mp4: string;
      webp_size: string;
      webp: string;
      frames: string;
      hash: string;
    };
    downsized: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    downsized_large: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    downsized_medium: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    downsized_small: {
      height: string;
      width: string;
      mp4_size: string;
      mp4: string;
    };
    downsized_still: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    fixed_height: {
      height: string;
      width: string;
      size: string;
      url: string;
      mp4_size: string;
      mp4: string;
      webp_size: string;
      webp: string;
    };
    fixed_height_downsampled: {
      height: string;
      width: string;
      size: string;
      url: string;
      webp_size: string;
      webp: string;
    };
    fixed_height_small: {
      height: string;
      width: string;
      size: string;
      url: string;
      mp4_size: string;
      mp4: string;
      webp_size: string;
      webp: string;
    };
    fixed_height_small_still: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    fixed_height_still: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    fixed_width: {
      height: string;
      width: string;
      size: string;
      url: string;
      mp4_size: string;
      mp4: string;
      webp_size: string;
      webp: string;
    };
    fixed_width_downsampled: {
      height: string;
      width: string;
      size: string;
      url: string;
      webp_size: string;
      webp: string;
    };
    fixed_width_small: {
      height: string;
      width: string;
      size: string;
      url: string;
      mp4_size: string;
      mp4: string;
      webp_size: string;
      webp: string;
    };
    fixed_width_small_still: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    fixed_width_still: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    looping: {
      mp4_size: string;
      mp4: string;
    };
    original_still: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    original_mp4: {
      height: string;
      width: string;
      mp4_size: string;
      mp4: string;
    };
    preview: {
      height: string;
      width: string;
      mp4_size: string;
      mp4: string;
    };
    preview_gif: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    preview_webp: {
      height: string;
      width: string;
      size: string;
      url: string;
    };
    hd?: {
      height: string;
      width: string;
      mp4_size: string;
      mp4: string;
    };
  };
  user?: {
    avatar_url: string;
    banner_image: string;
    banner_url: string;
    profile_url: string;
    username: string;
    display_name: string;
    description: string;
    instagram_url: string;
    website_url: string;
    is_verified: boolean;
  };
  analytics_response_payload: string;
  analytics: {
    onload: {
      url: string;
    };
    onclick: {
      url: string;
    };
    onsent: {
      url: string;
    };
  };
}

export interface GiphySearchResult {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
}

export interface GiphySticker {
  type: string;
  id: string;
  url: string;
  slug: string;
  bitly_gif_url: string;
  bitly_url: string;
  embed_url: string;
  username: string;
  source: string;
  title: string;
  rating: string;
  content_url: string;
  source_tld: string;
  source_post_url: string;
  is_sticker: number;
  import_datetime: string;
  trending_datetime: string;
  images: GiphyGif['images'];
}

export class GiphyAdapter {
  private static readonly BASE_URL = 'https://api.giphy.com/v1';
  private static readonly API_KEY = process.env.GIPHY_API_KEY;

  static async searchGifs(
    query: string,
    limit: number = 25,
    offset: number = 0,
    rating: 'y' | 'g' | 'pg' | 'pg-13' | 'r' = 'g',
    lang: string = 'en'
  ): Promise<GiphySearchResult> {
    try {
      const response = await axios.get(`${this.BASE_URL}/gifs/search`, {
        params: {
          api_key: this.API_KEY,
          q: query,
          limit: Math.min(limit, 50), // GIPHY max is 50
          offset,
          rating,
          lang
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error searching GIPHY GIFs:', error);
      throw new Error('Failed to search GIFs');
    }
  }

  static async searchStickers(
    query: string,
    limit: number = 25,
    offset: number = 0,
    rating: 'y' | 'g' | 'pg' | 'pg-13' | 'r' = 'g',
    lang: string = 'en'
  ): Promise<GiphySearchResult> {
    try {
      const response = await axios.get(`${this.BASE_URL}/stickers/search`, {
        params: {
          api_key: this.API_KEY,
          q: query,
          limit: Math.min(limit, 50),
          offset,
          rating,
          lang
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error searching GIPHY stickers:', error);
      throw new Error('Failed to search stickers');
    }
  }

  static async getTrendingGifs(
    limit: number = 25,
    offset: number = 0,
    rating: 'y' | 'g' | 'pg' | 'pg-13' | 'r' = 'g'
  ): Promise<GiphySearchResult> {
    try {
      const response = await axios.get(`${this.BASE_URL}/gifs/trending`, {
        params: {
          api_key: this.API_KEY,
          limit: Math.min(limit, 50),
          offset,
          rating
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting trending GIPHY GIFs:', error);
      throw new Error('Failed to get trending GIFs');
    }
  }

  static async getTrendingStickers(
    limit: number = 25,
    offset: number = 0,
    rating: 'y' | 'g' | 'pg' | 'pg-13' | 'r' = 'g'
  ): Promise<GiphySearchResult> {
    try {
      const response = await axios.get(`${this.BASE_URL}/stickers/trending`, {
        params: {
          api_key: this.API_KEY,
          limit: Math.min(limit, 50),
          offset,
          rating
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting trending GIPHY stickers:', error);
      throw new Error('Failed to get trending stickers');
    }
  }

  static async getGifById(gifId: string): Promise<{ data: GiphyGif }> {
    try {
      const response = await axios.get(`${this.BASE_URL}/gifs/${gifId}`, {
        params: {
          api_key: this.API_KEY
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting GIPHY GIF by ID:', error);
      throw new Error('Failed to get GIF');
    }
  }

  static async getRandomGif(
    tag?: string,
    rating: 'y' | 'g' | 'pg' | 'pg-13' | 'r' = 'g'
  ): Promise<{ data: GiphyGif }> {
    try {
      const params: any = {
        api_key: this.API_KEY,
        rating
      };

      if (tag) params.tag = tag;

      const response = await axios.get(`${this.BASE_URL}/gifs/random`, {
        params
      });

      return response.data;
    } catch (error) {
      console.error('Error getting random GIPHY GIF:', error);
      throw new Error('Failed to get random GIF');
    }
  }

  static async getCategories(): Promise<{ data: Array<{ name: string; name_encoded: string }> }> {
    try {
      const response = await axios.get(`${this.BASE_URL}/gifs/categories`, {
        params: {
          api_key: this.API_KEY
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting GIPHY categories:', error);
      throw new Error('Failed to get categories');
    }
  }

  static async searchSuggestions(term: string): Promise<{ data: Array<{ name: string }> }> {
    try {
      const response = await axios.get(`${this.BASE_URL}/gifs/search/tags`, {
        params: {
          api_key: this.API_KEY,
          q: term
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting GIPHY search suggestions:', error);
      throw new Error('Failed to get search suggestions');
    }
  }

  // Convert to our standard file format
  static formatAsFile(gif: GiphyGif, type: 'gif' | 'sticker' = 'gif') {
    return {
      id: gif.id,
      name: gif.title || `GIPHY ${type} ${gif.id}`,
      type: 'file',
      mimeType: 'image/gif',
      size: parseInt(gif.images.original.size) || 0,
      lastModified: gif.import_datetime,
      thumbnailUrl: gif.images.fixed_height_small_still.url,
      previewUrl: gif.images.fixed_height_small.url,
      downloadUrl: gif.images.original.url,
      fullUrl: gif.images.original.url,
      platform: 'giphy',
      metadata: {
        width: parseInt(gif.images.original.width),
        height: parseInt(gif.images.original.height),
        rating: gif.rating,
        username: gif.username,
        slug: gif.slug,
        isSticker: gif.is_sticker === 1,
        type: type,
        giphyUrl: gif.url,
        embedUrl: gif.embed_url,
        mp4Url: gif.images.original.mp4,
        webpUrl: gif.images.original.webp,
        user: gif.user ? {
          username: gif.user.username,
          displayName: gif.user.display_name,
          profileUrl: gif.user.profile_url,
          avatarUrl: gif.user.avatar_url,
          isVerified: gif.user.is_verified
        } : null,
        analytics: gif.analytics
      }
    };
  }

  static async listFiles(
    accessToken: string | null = null, 
    query: string = '', 
    page: number = 1,
    type: 'gifs' | 'stickers' | 'trending' = 'gifs'
  ) {
    try {
      const limit = 25;
      const offset = (page - 1) * limit;
      let result: GiphySearchResult;

      if (type === 'trending') {
        result = await this.getTrendingGifs(limit, offset);
      } else if (query && query.trim()) {
        if (type === 'stickers') {
          result = await this.searchStickers(query, limit, offset);
        } else {
          result = await this.searchGifs(query, limit, offset);
        }
      } else {
        // Default to trending if no query
        if (type === 'stickers') {
          result = await this.getTrendingStickers(limit, offset);
        } else {
          result = await this.getTrendingGifs(limit, offset);
        }
      }

      return result.data.map(gif => this.formatAsFile(gif, type === 'stickers' ? 'sticker' : 'gif'));
    } catch (error) {
      console.error('Error listing GIPHY files:', error);
      throw new Error('Failed to list GIPHY content');
    }
  }

  // Track analytics (required by GIPHY API terms)
  static async trackAnalytics(gif: GiphyGif, event: 'onload' | 'onclick' | 'onsent'): Promise<void> {
    try {
      if (gif.analytics && gif.analytics[event]) {
        await axios.get(gif.analytics[event].url);
      }
    } catch (error) {
      console.error('Error tracking GIPHY analytics:', error);
      // Don't throw error as this is just for tracking
    }
  }
} 