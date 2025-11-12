// Twitter-specific types for enhanced API support

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  verified?: boolean;
  protected?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  created_at?: string;
  location?: string;
  url?: string;
  entities?: {
    url?: {
      urls: Array<{
        start: number;
        end: number;
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
    };
    description?: {
      urls: Array<{
        start: number;
        end: number;
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
      hashtags: Array<{
        start: number;
        end: number;
        tag: string;
      }>;
      mentions: Array<{
        start: number;
        end: number;
        username: string;
      }>;
    };
  };
}

export interface TwitterTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  entities?: {
    hashtags?: Array<{
      start: number;
      end: number;
      tag: string;
    }>;
    mentions?: Array<{
      start: number;
      end: number;
      username: string;
      id: string;
    }>;
    urls?: Array<{
      start: number;
      end: number;
      url: string;
      expanded_url: string;
      display_url: string;
      images?: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    }>;
  };
  attachments?: {
    media_keys?: string[];
  };
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
      description: string;
    };
    entity: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

export interface TwitterDirectMessage {
  id: string;
  text: string;
  event_type: 'MessageCreate' | 'ParticipantsJoin' | 'ParticipantsLeave';
  created_at: string;
  sender_id?: string;
  dm_conversation_id: string;
  referenced_tweet?: {
    id: string;
    text: string;
  };
  media_keys?: string[];
  attachments?: {
    media_keys: string[];
  };
}

export interface TwitterMention {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  conversation_id: string;
  in_reply_to_user_id?: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  entities?: {
    mentions: Array<{
      start: number;
      end: number;
      username: string;
      id: string;
    }>;
  };
}

export interface TwitterSearchOptions {
  query: string;
  max_results?: number;
  since_id?: string;
  until_id?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: 'recency' | 'relevancy';
  next_token?: string;
}

export interface TwitterTrend {
  trend: string;
  volume?: number;
  description?: string;
  tweet_volume?: number;
}

export interface TwitterTweetCounts {
  start: string;
  end: string;
  tweet_count: number;
}

export interface TwitterApiResponse<T> {
  data?: T;
  includes?: {
    users?: TwitterUser[];
    tweets?: TwitterTweet[];
    media?: Array<{
      media_key: string;
      type: string;
      url?: string;
      preview_image_url?: string;
      public_metrics?: {
        view_count?: number;
      };
    }>;
  };
  meta?: {
    result_count?: number;
    next_token?: string;
    previous_token?: string;
    newest_id?: string;
    oldest_id?: string;
  };
  errors?: Array<{
    title: string;
    detail: string;
    type: string;
    value?: string;
  }>;
}

export interface TwitterRateLimitStatus {
  remaining: number;
  reset: number;
  limit: number;
}

export interface TwitterConversation {
  dm_conversation_id: string;
  participants?: TwitterUser[];
  last_message?: TwitterDirectMessage;
  created_at?: string;
} 