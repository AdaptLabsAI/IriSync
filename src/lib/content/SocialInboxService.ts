import { 
  getFirestore, 
  collection, 
  doc as firestoreDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  startAfter, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  writeBatch,
  getCountFromServer,
  doc
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { PlatformType } from '../platforms/PlatformProvider';

const firestore = getFirestore();

export enum MessageType {
  DIRECT_MESSAGE = 'direct_message',
  COMMENT = 'comment',
  MENTION = 'mention',
  TAG = 'tag',
  REPLY = 'reply'
}

export enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  REPLIED = 'replied',
  FLAGGED = 'flagged'
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface InboxMessage {
  id: string;
  platformType: PlatformType;
  platformId: string;
  accountId: string;
  userId: string;
  organizationId?: string;
  type: MessageType;
  status: MessageStatus;
  priority: MessagePriority;
  sender: {
    id: string;
    name: string;
    username?: string;
    profilePicture?: string;
    verified?: boolean;
    isFollowing?: boolean;
    followerCount?: number;
  };
  content: string;
  attachments?: {
    type: string;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  }[];
  parentId?: string; // For replies, the ID of the parent message
  contentId?: string; // For comments/replies to posts, the ID of the content
  platformPostId?: string; // The platform's post ID for the content
  receivedAt: Date;
  sentAt: Date;
  readAt?: Date;
  repliedAt?: Date;
  assignedTo?: string; // User ID of team member assigned to this message
  labels?: string[];
  notes?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface InboxFilter {
  platformTypes?: PlatformType[];
  accountIds?: string[];
  messageTypes?: MessageType[];
  statuses?: MessageStatus[];
  priorities?: MessagePriority[];
  labels?: string[];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface InboxStats {
  total: number;
  unread: number;
  flagged: number;
  replied: number;
  byPlatform: Record<PlatformType, number>;
  byType: Record<MessageType, number>;
  byPriority: Record<MessagePriority, number>;
}

/**
 * SocialInboxService provides a unified inbox for managing
 * messages, comments, and mentions across different platforms
 */
export class SocialInboxService {
  /**
   * Get messages with filtering and pagination
   */
  async getMessages(
    userId: string,
    filter: InboxFilter = {},
    limit: number = 20,
    cursor?: string
  ): Promise<{ messages: InboxMessage[]; nextCursor?: string }> {
    let q = query(collection(firestore, 'inbox'), where('userId', '==', userId));
    
    // Apply filters
    if (filter.platformTypes && filter.platformTypes.length > 0) {
      q = query(q, where('platformType', 'in', filter.platformTypes));
    }
    
    if (filter.accountIds && filter.accountIds.length > 0) {
      q = query(q, where('accountId', 'in', filter.accountIds));
    }
    
    if (filter.messageTypes && filter.messageTypes.length > 0) {
      q = query(q, where('type', 'in', filter.messageTypes));
    }
    
    if (filter.statuses && filter.statuses.length > 0) {
      q = query(q, where('status', 'in', filter.statuses));
    }
    
    if (filter.priorities && filter.priorities.length > 0) {
      q = query(q, where('priority', 'in', filter.priorities));
    }
    
    if (filter.assignedTo) {
      q = query(q, where('assignedTo', '==', filter.assignedTo));
    }
    
    // Order by received date (newest first)
    q = query(q, orderBy('receivedAt', 'desc'));
    
    // Apply cursor-based pagination
    if (cursor) {
      const cursorDoc = await getDoc(firestoreDoc(collection(firestore, 'inbox'), cursor));
      if (cursorDoc.exists()) {
        q = query(q, startAfter(cursorDoc));
      }
    }
    
    // Apply limit
    q = query(q, firestoreLimit(limit + 1)); // +1 to check if there are more results
    
    const snapshot = await getDocs(q);
    const messages: InboxMessage[] = [];
    
    snapshot.forEach((docSnap) => {
      messages.push(docSnap.data() as InboxMessage);
    });
    
    // Determine if there's a next page
    let nextCursor: string | undefined;
    if (messages.length > limit) {
      const lastMessage = messages.pop();
      nextCursor = lastMessage?.id;
    }
    
    // Apply text search client-side if provided
    // For a production app, consider using Algolia or similar for better search
    if (filter.search && filter.search.length > 0) {
      const searchLower = filter.search.toLowerCase();
      return {
        messages: messages.filter(msg => 
          msg.content.toLowerCase().includes(searchLower) ||
          msg.sender.name.toLowerCase().includes(searchLower) ||
          msg.sender.username?.toLowerCase().includes(searchLower)
        ),
        nextCursor
      };
    }
    
    // Apply date range filtering client-side
    if (filter.dateRange) {
      const { start, end } = filter.dateRange;
      return {
        messages: messages.filter(msg => 
          msg.receivedAt >= start && msg.receivedAt <= end
        ),
        nextCursor
      };
    }
    
    // Apply label filtering client-side
    if (filter.labels && filter.labels.length > 0) {
      return {
        messages: messages.filter(msg => 
          msg.labels?.some(label => filter.labels!.includes(label))
        ),
        nextCursor
      };
    }
    
    return {
      messages,
      nextCursor
    };
  }
  
  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<InboxMessage | null> {
    const docRef = await getDoc(firestoreDoc(collection(firestore, 'inbox'), messageId));
    
    if (!docRef.exists()) {
      return null;
    }
    
    return docRef.data() as InboxMessage;
  }
  
  /**
   * Get conversation thread (message and its replies)
   */
  async getConversation(parentId: string): Promise<InboxMessage[]> {
    // Get the parent message
    const parentMessage = await this.getMessage(parentId);
    
    if (!parentMessage) {
      return [];
    }
    
    // Get all replies to this message
    const repliesQuery = query(
      collection(firestore, 'inbox'),
      where('parentId', '==', parentId),
      orderBy('sentAt', 'asc')
    );
    const repliesSnapshot = await getDocs(repliesQuery);
    
    const replies: InboxMessage[] = [];
    
    repliesSnapshot.forEach((doc: any) => {
      replies.push(doc.data() as InboxMessage);
    });
    
    // Return parent message and all replies in chronological order
    return [parentMessage, ...replies];
  }
  
  /**
   * Update message status (mark as read, archive, etc.)
   */
  async updateMessageStatus(
    messageId: string, 
    status: MessageStatus
  ): Promise<InboxMessage | null> {
    const messageRef = firestoreDoc(collection(firestore, 'inbox'), messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return null;
    }
    
    const updateData: Record<string, any> = { status };
    
    // Set appropriate timestamps based on status
    if (status === MessageStatus.READ) {
      updateData.readAt = new Date();
    } else if (status === MessageStatus.REPLIED) {
      updateData.repliedAt = new Date();
    }
    
    await updateDoc(messageRef, updateData);
    
    const updatedDoc = await getDoc(messageRef);
    return updatedDoc.data() as InboxMessage;
  }
  
  /**
   * Mark a batch of messages with a specific status
   */
  async bulkUpdateStatus(
    messageIds: string[], 
    status: MessageStatus
  ): Promise<number> {
    if (messageIds.length === 0) {
      return 0;
    }
    
    const batch = writeBatch(firestore);
    const updateData: Record<string, any> = { status };
    
    // Set appropriate timestamps based on status
    if (status === MessageStatus.READ) {
      updateData.readAt = new Date();
    } else if (status === MessageStatus.REPLIED) {
      updateData.repliedAt = new Date();
    }
    
    let count = 0;
    
    // Process in chunks of 500 (Firestore batch limit)
    for (let i = 0; i < messageIds.length; i += 500) {
      const chunk = messageIds.slice(i, i + 500);
      
      // Create a new batch for each chunk
      const currentBatch = writeBatch(firestore);
      
      for (const id of chunk) {
        const ref = firestoreDoc(collection(firestore, 'inbox'), id);
        currentBatch.update(ref, updateData);
        count++;
      }
      
      await writeBatch(firestore).commit();
    }
    
    return count;
  }
  
  /**
   * Reply to a message in the inbox
   */
  async replyToMessage(
    messageId: string,
    content: string,
    userId: string,
    platformProvider?: any // Optional - will auto-load if not provided
  ): Promise<InboxMessage> {
    // Get the original message
    const originalMessage = await this.getMessage(messageId);
    
    if (!originalMessage) {
      throw new Error('Message not found');
    }
    
    let platformReplyId: string | undefined;
    
    // Handle replies based on platform type using dedicated adapters
    switch (originalMessage.platformType) {
      case PlatformType.LINKEDIN:
        platformReplyId = await this.handleLinkedInReply(originalMessage, content, userId);
        break;
        
      case PlatformType.TWITTER:
        platformReplyId = await this.handleTwitterReply(originalMessage, content, userId);
        break;

      case PlatformType.TIKTOK:
        platformReplyId = await this.handleTikTokReply(originalMessage, content, userId);
        break;

      case PlatformType.YOUTUBE:
        platformReplyId = await this.handleYouTubeReply(originalMessage, content, userId);
        break;

      case PlatformType.REDDIT:
        platformReplyId = await this.handleRedditReply(originalMessage, content, userId);
        break;

      case PlatformType.MASTODON:
        platformReplyId = await this.handleMastodonReply(originalMessage, content, userId);
        break;
        
      default:
        // Fallback to legacy platform adapter if provided
        if (platformProvider) {
          platformReplyId = await this.handleLegacyReply(originalMessage, content, platformProvider);
        } else {
          throw new Error(`Platform ${originalMessage.platformType} not supported for replies`);
        }
    }
    
    if (!platformReplyId) {
      throw new Error('Failed to send reply to platform');
    }
    
    // Update the original message status
    const updatedMessage = await this.updateMessageStatus(messageId, MessageStatus.REPLIED);
    
    if (!updatedMessage) {
      throw new Error('Failed to update message status');
    }
    
    // Set replied timestamp
    updatedMessage.repliedAt = new Date();
    await updateDoc(doc(collection(firestore, 'inbox'), messageId), {
      repliedAt: updatedMessage.repliedAt
    });
    
    // Create a reply record for tracking
    const replyRecord = {
      id: uuidv4(),
      originalMessageId: messageId,
      platformReplyId,
      content,
      userId,
      createdAt: new Date(),
      platformType: originalMessage.platformType
    };
    
    await setDoc(doc(collection(firestore, 'inboxReplies'), replyRecord.id), replyRecord);
    
    return updatedMessage;
  }
  
  /**
   * Handle LinkedIn replies using LinkedInSocialInboxAdapter
   */
  private async handleLinkedInReply(
    originalMessage: InboxMessage, 
    content: string, 
    userId: string
  ): Promise<string | undefined> {
    // Dynamic import to avoid circular dependencies
    const { LinkedInProvider } = await import('../platforms/providers/LinkedInProvider');
    const { LinkedInSocialInboxAdapter } = await import('./LinkedInSocialInboxAdapter');
    
    // Get LinkedIn account credentials
    const accountDoc = await getDoc(firestoreDoc(collection(firestore, 'connectedAccounts'), originalMessage.accountId));
      
    if (!accountDoc.exists()) {
      throw new Error('LinkedIn account not found');
    }
    
    const accountData = accountDoc.data();
    
    // Initialize LinkedIn provider
    const linkedInProvider = new LinkedInProvider(
      {
        clientId: process.env.LINKEDIN_CORE_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CORE_CLIENT_SECRET || '',
        redirectUri: process.env.LINKEDIN_CORE_CALLBACK_URL || '',
        additionalParams: {
          restApiUrl: process.env.LINKEDIN_REST_API_URL,
          useModernRestApi: true
        }
      },
      {
        accessToken: accountData?.accessToken,
        expiresAt: accountData?.expiresAt,
        additionalData: accountData?.additionalData
      }
    );
    
    // Initialize social inbox adapter
    const adapter = new LinkedInSocialInboxAdapter(linkedInProvider);
    
    // Reply to the comment
    const success = await adapter.replyToComment(originalMessage.id, content, userId);
    
    if (!success) {
      throw new Error('Failed to send LinkedIn reply');
    }
    
    // Return a temporary ID - LinkedIn API doesn't immediately return comment IDs
    return `linkedin_reply_${Date.now()}`;
  }
  
  /**
   * Handle Twitter replies using TwitterSocialInboxAdapter
   */
  private async handleTwitterReply(
    originalMessage: InboxMessage, 
    content: string, 
    userId: string
  ): Promise<string | undefined> {
    // Dynamic import to avoid circular dependencies
    const { TwitterProvider } = await import('../platforms/providers/TwitterProvider');
    const { TwitterSocialInboxAdapter } = await import('./TwitterSocialInboxAdapter');
    
    // Get Twitter account credentials
    const accountDoc = await getDoc(doc(collection(firestore, 'connectedAccounts'), originalMessage.accountId));
      
    if (!accountDoc.exists()) {
      throw new Error('Twitter account not found');
    }
    
    const accountData = accountDoc.data();
    
    // Initialize Twitter provider
    const twitterProvider = new TwitterProvider(
      {
        clientId: process.env.TWITTER_API_KEY || '',
        clientSecret: process.env.TWITTER_API_SECRET || '',
        redirectUri: process.env.TWITTER_CALLBACK_URL || '',
        additionalParams: {
          apiKey: process.env.TWITTER_API_KEY,
          apiSecret: process.env.TWITTER_API_SECRET,
          bearerToken: process.env.TWITTER_BEARER_TOKEN,
          tier: process.env.TWITTER_API_TIER || 'free'
        }
      },
      {
        accessToken: accountData?.accessToken,
        expiresAt: accountData?.expiresAt,
        additionalData: accountData?.additionalData
      }
    );
    
    // Initialize social inbox adapter
    const adapter = new TwitterSocialInboxAdapter(twitterProvider);
    
    // Reply to the tweet/message
    const replyId = await adapter.replyToMessage(originalMessage.id, content, userId);
    
    return replyId;
  }
  
  /**
   * Handle TikTok replies using TikTokSocialInboxAdapter
   */
  private async handleTikTokReply(
    originalMessage: InboxMessage, 
    content: string, 
    userId: string
  ): Promise<string | undefined> {
    // Dynamic import to avoid circular dependencies
    const { TikTokProvider } = await import('../platforms/providers/TikTokProvider');
    const { TikTokSocialInboxAdapter } = await import('./TikTokSocialInboxAdapter');
    
    // Get TikTok account credentials
    const accountDoc = await getDoc(doc(collection(firestore, 'connectedAccounts'), originalMessage.accountId));
      
    if (!accountDoc.exists()) {
      throw new Error('TikTok account not found');
    }
    
    const accountData = accountDoc.data();
    
    // Initialize TikTok provider
    const tikTokProvider = new TikTokProvider(
      {
        clientId: process.env.TIKTOK_CLIENT_KEY || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=tiktok' || ''
      },
      {
        accessToken: accountData?.accessToken,
        expiresAt: accountData?.expiresAt,
        additionalData: accountData?.additionalData
      }
    );
    
    // Initialize social inbox adapter
    const adapter = new TikTokSocialInboxAdapter(tikTokProvider);
    
    // Reply to the comment
    const replyId = await adapter.replyToComment(originalMessage.id, content, userId);
    
    return replyId;
  }
  
  /**
   * Handle YouTube replies using YouTubeSocialInboxAdapter
   */
  private async handleYouTubeReply(
    originalMessage: InboxMessage, 
    content: string, 
    userId: string
  ): Promise<string | undefined> {
    // Dynamic import to avoid circular dependencies
    const { YouTubeProvider } = await import('../platforms/providers/YouTubeProvider');
    const { YouTubeSocialInboxAdapter } = await import('./YouTubeSocialInboxAdapter');
    
    // Get YouTube account credentials
    const accountDoc = await getDoc(doc(collection(firestore, 'connectedAccounts'), originalMessage.accountId));
      
    if (!accountDoc.exists()) {
      throw new Error('YouTube account not found');
    }
    
    const accountData = accountDoc.data();
    
    // Initialize YouTube provider
    const youTubeProvider = new YouTubeProvider(
      {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=youtube' || ''
      },
      {
        accessToken: accountData?.accessToken,
        expiresAt: accountData?.expiresAt,
        additionalData: accountData?.additionalData
      }
    );
    
    // Initialize social inbox adapter
    const adapter = new YouTubeSocialInboxAdapter(youTubeProvider);
    
    // Reply to the comment
    const replyId = await adapter.replyToComment(originalMessage.id, content, userId);
    
    return replyId;
  }
  
  /**
   * Handle Reddit replies using RedditSocialInboxAdapter
   */
  private async handleRedditReply(
    originalMessage: InboxMessage, 
    content: string, 
    userId: string
  ): Promise<string | undefined> {
    // Dynamic import to avoid circular dependencies
    const { RedditProvider } = await import('../platforms/providers/RedditProvider');
    const { RedditSocialInboxAdapter } = await import('./RedditSocialInboxAdapter');
    
    // Get Reddit account credentials
    const accountDoc = await getDoc(doc(collection(firestore, 'connectedAccounts'), originalMessage.accountId));
      
    if (!accountDoc.exists()) {
      throw new Error('Reddit account not found');
    }
    
    const accountData = accountDoc.data();
    
    // Initialize Reddit provider
    const redditProvider = new RedditProvider(
      {
        clientId: process.env.REDDIT_CLIENT_ID || '',
        clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=reddit' || ''
      },
      {
        accessToken: accountData?.accessToken,
        expiresAt: accountData?.expiresAt,
        additionalData: accountData?.additionalData
      }
    );
    
    // Initialize social inbox adapter
    const adapter = new RedditSocialInboxAdapter(redditProvider);
    
    // Reply to the message
    const replyId = await adapter.replyToMessage(originalMessage.id, content, userId);
    
    return replyId;
  }
  
  /**
   * Handle Mastodon replies using MastodonSocialInboxAdapter
   */
  private async handleMastodonReply(
    originalMessage: InboxMessage, 
    content: string, 
    userId: string
  ): Promise<string | undefined> {
    // Dynamic import to avoid circular dependencies
    const { MastodonProvider } = await import('../platforms/providers/MastodonProvider');
    const { MastodonSocialInboxAdapter } = await import('./MastodonSocialInboxAdapter');
    
    // Get Mastodon account credentials
    const accountDoc = await getDoc(doc(collection(firestore, 'connectedAccounts'), originalMessage.accountId));
      
    if (!accountDoc.exists()) {
      throw new Error('Mastodon account not found');
    }
    
    const accountData = accountDoc.data();
    
    // Initialize Mastodon provider
    const mastodonProvider = new MastodonProvider(
      {
        clientId: process.env.MASTODON_CLIENT_ID || '',
        clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=mastodon' || '',
        additionalParams: {
          serverInstance: accountData?.additionalData?.serverInstance || 'mastodon.social'
        }
      },
      {
        accessToken: accountData?.accessToken,
        expiresAt: accountData?.expiresAt,
        additionalData: accountData?.additionalData
      }
    );
    
    // Initialize social inbox adapter
    const adapter = new MastodonSocialInboxAdapter(
      mastodonProvider, 
      accountData?.additionalData?.serverInstance || 'mastodon.social'
    );
    
    // Reply to the message
    const replyId = await adapter.replyToMessage(originalMessage.id, content, userId);
    
    return replyId;
  }
  
  /**
   * Handle legacy platform replies (fallback)
   */
  private async handleLegacyReply(
    originalMessage: InboxMessage, 
    content: string, 
    platformAdapter: any
  ): Promise<string | undefined> {
    let platformReplyId: string | undefined;
    
    switch (originalMessage.type) {
      case MessageType.DIRECT_MESSAGE:
        platformReplyId = await platformAdapter.sendDirectMessage(
          originalMessage.sender.id,
          content
        );
        break;
        
      case MessageType.COMMENT:
      case MessageType.REPLY:
        if (platformAdapter.replyToComment) {
          platformReplyId = await platformAdapter.replyToComment(
            originalMessage.platformId,
            content
          );
        } else if (platformAdapter.createComment) {
          platformReplyId = await platformAdapter.createComment(
            originalMessage.contentId || originalMessage.platformPostId || '',
            content
          );
        }
        break;
        
      case MessageType.MENTION:
        if (originalMessage.contentId && platformAdapter.replyToComment) {
          platformReplyId = await platformAdapter.replyToComment(
            originalMessage.platformId,
            content
          );
        }
        break;
        
      default:
        throw new Error(`Cannot reply to message of type ${originalMessage.type}`);
    }
    
    return platformReplyId;
  }
  
  /**
   * Add a message to the inbox (usually called by webhook handlers)
   */
  async addMessage(message: Omit<InboxMessage, 'id'>): Promise<InboxMessage> {
    const id = uuidv4();
    const newMessage: InboxMessage = {
      ...message,
      id
    };
    
    await setDoc(doc(collection(firestore, 'inbox'), id), newMessage);
    
    return newMessage;
  }
  
  /**
   * Get inbox statistics for a user
   */
  async getInboxStats(userId: string): Promise<InboxStats> {
    // Get counts by different criteria
    const [
      totalQuery,
      unreadQuery,
      flaggedQuery,
      repliedQuery
    ] = await Promise.all([
      getCountFromServer(query(collection(firestore, 'inbox'), where('userId', '==', userId))),
      getCountFromServer(query(collection(firestore, 'inbox'), where('userId', '==', userId), where('status', '==', MessageStatus.UNREAD))),
      getCountFromServer(query(collection(firestore, 'inbox'), where('userId', '==', userId), where('status', '==', MessageStatus.FLAGGED))),
      getCountFromServer(query(collection(firestore, 'inbox'), where('userId', '==', userId), where('status', '==', MessageStatus.REPLIED)))
    ]);
    
    // Get distribution by platform, type, and priority using efficient aggregation counters
    // First, check if we have aggregated stats available in the dedicated counters collection
    const counterDoc = await getDoc(firestoreDoc(collection(firestore, 'inboxCounters'), userId));
    
    // If we have pre-calculated counters, use them
    if (counterDoc.exists()) {
      const counterData = counterDoc.data();
      
      return {
        total: totalQuery.data().count,
        unread: unreadQuery.data().count,
        flagged: flaggedQuery.data().count,
        replied: repliedQuery.data().count,
        byPlatform: counterData?.byPlatform || {} as Record<PlatformType, number>,
        byType: counterData?.byType || {} as Record<MessageType, number>,
        byPriority: counterData?.byPriority || {} as Record<MessagePriority, number>
      };
    }
    
    // If no pre-calculated counters exist, compute them from a reasonable sample
    // and store them for future use
    const messagesSnapshot = await getDocs(query(
      collection(firestore, 'inbox'),
      where('userId', '==', userId),
      orderBy('receivedAt', 'desc'),
      firestoreLimit(1000)
    ));
    
    const byPlatform: Record<PlatformType, number> = {} as Record<PlatformType, number>;
    const byType: Record<MessageType, number> = {} as Record<MessageType, number>;
    const byPriority: Record<MessagePriority, number> = {} as Record<MessagePriority, number>;
    
    messagesSnapshot.forEach((docSnap) => {
      const message = docSnap.data() as InboxMessage;
      
      // Count by platform
      byPlatform[message.platformType] = (byPlatform[message.platformType] || 0) + 1;
      
      // Count by message type
      byType[message.type] = (byType[message.type] || 0) + 1;
      
      // Count by priority
      byPriority[message.priority] = (byPriority[message.priority] || 0) + 1;
    });
    
    // Store the calculated counters for future use
    await setDoc(firestoreDoc(collection(firestore, 'inboxCounters'), userId), {
      byPlatform,
      byType,
      byPriority,
      updatedAt: new Date()
    });
    
    return {
      total: totalQuery.data().count,
      unread: unreadQuery.data().count,
      flagged: flaggedQuery.data().count,
      replied: repliedQuery.data().count,
      byPlatform,
      byType,
      byPriority
    };
  }
  
  /**
   * Assign a message to a team member
   */
  async assignMessage(
    messageId: string,
    assigneeId: string
  ): Promise<InboxMessage | null> {
    const messageRef = doc(collection(firestore, 'inbox'), messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return null;
    }
    
    await updateDoc(messageRef, {
      assignedTo: assigneeId
    });
    
    const updatedDoc = await getDoc(messageRef);
    return updatedDoc.data() as InboxMessage;
  }
  
  /**
   * Add or update labels for a message
   */
  async updateLabels(
    messageId: string,
    labels: string[]
  ): Promise<InboxMessage | null> {
    const messageRef = doc(collection(firestore, 'inbox'), messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return null;
    }
    
    await updateDoc(messageRef, {
      labels
    });
    
    const updatedDoc = await getDoc(messageRef);
    return updatedDoc.data() as InboxMessage;
  }
  
  /**
   * Update message priority
   */
  async updatePriority(
    messageId: string,
    priority: MessagePriority
  ): Promise<InboxMessage | null> {
    const messageRef = doc(collection(firestore, 'inbox'), messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return null;
    }
    
    await updateDoc(messageRef, {
      priority
    });
    
    const updatedDoc = await getDoc(messageRef);
    return updatedDoc.data() as InboxMessage;
  }
  
  /**
   * Add notes to a message
   */
  async addNotes(
    messageId: string,
    notes: string
  ): Promise<InboxMessage | null> {
    const messageRef = doc(collection(firestore, 'inbox'), messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return null;
    }
    
    await updateDoc(messageRef, {
      notes
    });
    
    const updatedDoc = await getDoc(messageRef);
    return updatedDoc.data() as InboxMessage;
  }
  
  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const messageRef = doc(collection(firestore, 'inbox'), messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      return false;
    }
    
    // Soft delete by updating status
    await updateDoc(messageRef, {
      status: MessageStatus.DELETED
    });
    
    return true;
  }
}

// Create and export singleton instance
const socialInboxService = new SocialInboxService();
export default socialInboxService; 