import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/logging/logger';
import { SocialInboxController } from '../../../../lib/content/SocialInboxController';
import crypto from 'crypto';

const YOUTUBE_WEBHOOK_SECRET = process.env.YOUTUBE_WEBHOOK_SECRET || '';

/**
 * YouTube Webhook Endpoint
 * Handles real-time updates for:
 * - Video comments
 * - Comment replies
 * - Channel subscriptions
 * - Community post interactions
 */

// Webhook verification (GET request)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const challenge = searchParams.get('hub.challenge');
    const mode = searchParams.get('hub.mode');
    const topic = searchParams.get('hub.topic');
    const verifyToken = searchParams.get('hub.verify_token');

    // YouTube uses PubSubHubbub protocol
    if (mode === 'subscribe' && verifyToken === YOUTUBE_WEBHOOK_SECRET) {
      logger.info('YouTube webhook verification successful', { topic });
      return new NextResponse(challenge, { status: 200 });
    }

    logger.warn('YouTube webhook verification failed', { mode, verifyToken });
    return new NextResponse('Forbidden', { status: 403 });
  } catch (error) {
    logger.error('Error in YouTube webhook verification', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Webhook event handler (POST request)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature');

    // Verify the webhook signature
    if (!verifySignature(body, signature)) {
      logger.warn('YouTube webhook signature verification failed');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // YouTube sends XML data for PubSubHubbub notifications
    const data = parseXMLNotification(body);
    
    if (data) {
      logger.info('YouTube webhook received', { 
        type: data.type,
        videoId: data.videoId,
        channelId: data.channelId 
      });

      // Process webhook events
      await processYouTubeWebhook(data);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('Error processing YouTube webhook', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Verify webhook signature
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !YOUTUBE_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = 'sha1=' + crypto
    .createHmac('sha1', YOUTUBE_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse XML notification from YouTube PubSubHubbub
 */
function parseXMLNotification(xmlBody: string): any | null {
  try {
    // Simple XML parsing for YouTube notifications
    // In production, use a proper XML parser like xml2js
    
    const videoIdMatch = xmlBody.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const channelIdMatch = xmlBody.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
    const titleMatch = xmlBody.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = xmlBody.match(/<published>([^<]+)<\/published>/);
    const updatedMatch = xmlBody.match(/<updated>([^<]+)<\/updated>/);

    if (videoIdMatch && channelIdMatch) {
      return {
        type: 'video_notification',
        videoId: videoIdMatch[1],
        channelId: channelIdMatch[1],
        title: titleMatch ? titleMatch[1] : '',
        published: publishedMatch ? publishedMatch[1] : '',
        updated: updatedMatch ? updatedMatch[1] : ''
      };
    }

    return null;
  } catch (error) {
    logger.error('Error parsing YouTube XML notification', { error });
    return null;
  }
}

/**
 * Process YouTube webhook events
 */
async function processYouTubeWebhook(data: any) {
  const socialInboxController = new SocialInboxController();

  switch (data.type) {
    case 'video_notification':
      await handleVideoNotification(data, socialInboxController);
      break;
    case 'comment_created':
      await handleCommentCreated(data, socialInboxController);
      break;
    case 'comment_updated':
      await handleCommentUpdated(data, socialInboxController);
      break;
    case 'comment_deleted':
      await handleCommentDeleted(data, socialInboxController);
      break;
    case 'subscription_created':
      await handleSubscriptionCreated(data, socialInboxController);
      break;
    case 'community_post_created':
      await handleCommunityPostCreated(data, socialInboxController);
      break;
    default:
      logger.info('Unhandled YouTube webhook event', { type: data.type });
  }
}

/**
 * Handle video notification (new video uploaded)
 */
async function handleVideoNotification(data: any, controller: SocialInboxController) {
  // This is mainly for tracking new uploads, not typically an inbox message
  logger.info('YouTube video notification received', {
    videoId: data.videoId,
    channelId: data.channelId,
    title: data.title
  });

  // Could trigger analytics updates or content tracking
}

/**
 * Handle comment created
 */
async function handleCommentCreated(data: any, controller: SocialInboxController) {
  const { comment, video, author } = data;

  await controller.processWebhookMessage({
    platform: 'youtube',
    type: 'comment',
    platformId: comment.id,
    senderId: author.channelId,
    senderName: author.displayName,
    senderUsername: author.channelUrl?.split('/').pop() || author.channelId,
    senderProfilePicture: author.profileImageUrl,
    content: comment.textDisplay,
    createdTime: comment.publishedAt,
    postId: video.id,
    parentId: comment.parentId,
    attachments: extractCommentAttachments(comment),
    metrics: {
      likes: comment.likeCount,
      replies: comment.totalReplyCount
    }
  });
}

/**
 * Handle comment updated
 */
async function handleCommentUpdated(data: any, controller: SocialInboxController) {
  const { comment, video, author } = data;

  await controller.processWebhookMessage({
    platform: 'youtube',
    type: 'comment_update',
    platformId: comment.id,
    senderId: author.channelId,
    senderName: author.displayName,
    content: comment.textDisplay,
    createdTime: comment.updatedAt,
    postId: video.id,
    isUpdate: true
  });
}

/**
 * Handle comment deleted
 */
async function handleCommentDeleted(data: any, controller: SocialInboxController) {
  const { comment, video } = data;

  logger.info('YouTube comment deleted', {
    commentId: comment.id,
    videoId: video.id
  });

  // Could implement removal of comment from inbox if needed
}

/**
 * Handle subscription created (new subscriber)
 */
async function handleSubscriptionCreated(data: any, controller: SocialInboxController) {
  const { subscriber, channel } = data;

  await controller.processWebhookMessage({
    platform: 'youtube',
    type: 'follow',
    platformId: `subscription_${subscriber.channelId}_${Date.now()}`,
    senderId: subscriber.channelId,
    senderName: subscriber.title,
    senderUsername: subscriber.channelId,
    senderProfilePicture: subscriber.thumbnails?.default?.url,
    content: 'Subscribed to your channel',
    createdTime: new Date().toISOString()
  });
}

/**
 * Handle community post created
 */
async function handleCommunityPostCreated(data: any, controller: SocialInboxController) {
  const { post, author } = data;

  // Community posts can have comments, so we track them
  logger.info('YouTube community post created', {
    postId: post.id,
    authorChannelId: author.channelId
  });

  // Could create inbox entry for community post interactions
}

/**
 * Extract attachments from comment
 */
function extractCommentAttachments(comment: any): any[] {
  const attachments: any[] = [];

  // YouTube comments don't typically have attachments
  // but could have links or mentions
  if (comment.textOriginal !== comment.textDisplay) {
    // Check for links or special formatting
    const linkRegex = /https?:\/\/[^\s]+/g;
    const links = comment.textOriginal.match(linkRegex);
    
    if (links) {
      for (const link of links) {
        attachments.push({
          type: 'url',
          url: link
        });
      }
    }
  }

  return attachments;
}

/**
 * YouTube API helper functions
 * These would be implemented to call the actual YouTube Data API
 */

/**
 * Get video comments (for manual sync)
 */
export async function getVideoComments(videoId: string, maxResults: number = 50): Promise<any[]> {
  // Implementation would call YouTube Data API v3
  // GET https://www.googleapis.com/youtube/v3/commentThreads
  return [];
}

/**
 * Get channel subscriptions (for manual sync)
 */
export async function getChannelSubscriptions(channelId: string, maxResults: number = 50): Promise<any[]> {
  // Implementation would call YouTube Data API v3
  // GET https://www.googleapis.com/youtube/v3/subscriptions
  return [];
}

/**
 * Reply to a YouTube comment
 */
export async function replyToComment(commentId: string, replyText: string): Promise<string> {
  // Implementation would call YouTube Data API v3
  // POST https://www.googleapis.com/youtube/v3/comments
  return `reply_${Date.now()}`;
}

/**
 * Like a YouTube comment
 */
export async function likeComment(commentId: string): Promise<boolean> {
  // Implementation would call YouTube Data API v3
  // POST https://www.googleapis.com/youtube/v3/comments/setRating
  return true;
} 