import { PlatformType } from '../PlatformProvider';

/**
 * Represents a connected social media account 
 */
export interface SocialAccount {
  id: string;
  platformId: string;
  platformType: PlatformType;
  username: string;
  displayName: string;
  profilePictureUrl?: string;
  profileUrl?: string;
  bio?: string;
  isBusinessAccount?: boolean;
  isConnected: boolean;
  lastConnected?: Date;
  hasValidCredentials: boolean;
  accountType?: 'personal' | 'business' | 'creator';
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  metadata?: Record<string, any>;
  authData?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    scope?: string[];
  };
}
