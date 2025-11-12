// Define expected component props types
export type Post = {
  id: string;
  title: string;
  platform: string;
  scheduledFor: string;
  status: 'draft' | 'ready';
};

// Our internal types
export type DashboardActivityType = 
  | 'post_created'
  | 'post_published'
  | 'media_uploaded'
  | 'post_scheduled'
  | 'engagement_received'
  | 'comment_received'
  | 'new_follower'
  | 'message_received';

export interface DashboardActivity {
  id: string;
  type: DashboardActivityType;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: string;
  content: string;
  platform?: string;
  additionalInfo?: string;
  isNew?: boolean;
}

export type DashboardNotificationPriority = 'high' | 'medium' | 'low';

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: DashboardNotificationPriority;
}

// Typings for our data
export interface DashboardData {
  stats: {
    label: string;
    value: string;
    change: number;
    increasing: boolean;
  }[];
  upcomingPosts: Post[];
  platforms: {
    name: string;
    followers: number;
    engagement: number;
    color: string;
    progress: number;
  }[];
  topPosts: {
    id: string;
    title: string;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    imageUrl: string;
  }[];
  recentActivities: DashboardActivity[];
  notifications: DashboardNotification[];
}

// Props for the client components
export interface ClientComponentsProps {
  data: DashboardData;
  permissionError: boolean;
  errorMessage: string;
} 
export interface AnalyticsData {
  overview: {
    label: string;
    value: string;
    change: number;
    increasing: boolean;
  }[];
  engagementHistory: {
    date: string;
    value: number;
  }[];
  performance: {
    metric: string;
    value: number;
    change: number;
    increasing: boolean;
  }[];
  platforms: {
    name: string;
    posts: number;
    engagement: number;
    followers: number;
    color: string;
    reach: number;
    impressions: number;
    growth: number;
  }[];
  audience: {
    type: string;
    data: {
      label: string;
      value: number;
      color: string;
    }[];
  }[];
  error?: string;
}