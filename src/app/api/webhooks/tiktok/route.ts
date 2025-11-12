import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/logging/logger';
import { SocialInboxController } from '../../../../lib/content/SocialInboxController';
import crypto from 'crypto';

const TIKTOK_WEBHOOK_SECRET = process.env.TIKTOK_WEBHOOK_SECRET || '';

/**
 * TikTok Webhook Endpoint
 * Handles real-time updates for:
 * - Video comments
 * - Video likes
 * - Follower updates
 * - Direct messages (when available)
 */

// Webhook verification (GET request)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const challenge = searchParams.get('challenge');
    const timestamp = searchParams.get('timestamp');
    const signature = searchParams.get('signature');

    if (!challenge || !timestamp || !signature) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', TIKTOK_WEBHOOK_SECRET)
      .update(challenge + timestamp)
      .digest('hex');

    if (signature !== expectedSignature) {
      return new NextResponse('Invalid signature', { status: 403 });
    }

    logger.info('TikTok webhook verification successful');
    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    logger.error('Error in TikTok webhook verification', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Webhook event handler (POST request)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-tiktok-signature');
    const timestamp = req.headers.get('x-tiktok-timestamp');

    // Verify the webhook signature
    if (!verifySignature(body, signature, timestamp)) {
      logger.warn('TikTok webhook signature verification failed');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = JSON.parse(body);
    logger.info('TikTok webhook received', { 
      event: data.event,
      userId: data.user_id 
    });

    // Process webhook events
    await processTikTokWebhook(data);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('Error processing TikTok webhook', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Verify webhook signature
 */
function verifySignature(body: string, signature: string | null, timestamp: string | null): boolean {
  if (!signature || !timestamp || !TIKTOK_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', TIKTOK_WEBHOOK_SECRET)
    .update(body + timestamp)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process TikTok webhook events
 */
async function processTikTokWebhook(data: any) {
  const socialInboxController = new SocialInboxController();

  switch (data.event) {
    case 'comment.created':
      await handleCommentCreated(data, socialInboxController);
      break;
    case 'comment.updated':
      await handleCommentUpdated(data, socialInboxController);
      break;
    case 'comment.deleted':
      await handleCommentDeleted(data, socialInboxController);
      break;
    case 'video.liked':
      await handleVideoLiked(data, socialInboxController);
      break;
    case 'video.shared':
      await handleVideoShared(data, socialInboxController);
      break;
    case 'user.followed':
      await handleUserFollowed(data, socialInboxController);
      break;
    case 'direct_message.received':
      await handleDirectMessage(data, socialInboxController);
      break;
    default:
      logger.info('Unhandled TikTok webhook event', { event: data.event });
  }
}

/**
 * Handle comment created
 */
async function handleCommentCreated(data: any, controller: SocialInboxController) {
  const { comment, video, user } = data;

  await controller.processWebhookMessage({
    platform: 'tiktok',
    type: 'comment',
    platformId: comment.id,
    senderId: user.id,
    senderName: user.display_name,
    senderUsername: user.username,
    senderProfilePicture: user.avatar_url,
    senderVerified: user.verified,
    senderFollowerCount: user.follower_count,
    content: comment.text,
    createdTime: comment.created_at,
    postId: video.id,
    parentId: comment.parent_comment_id,
    attachments: extractCommentAttachments(comment),
    metrics: {
      likes: comment.like_count,
      replies: comment.reply_count
    }
  });
}

/**
 * Handle comment updated
 */
async function handleCommentUpdated(data: any, controller: SocialInboxController) {
  const { comment, video, user } = data;

  await controller.processWebhookMessage({
    platform: 'tiktok',
    type: 'comment_update',
    platformId: comment.id,
    senderId: user.id,
    senderName: user.display_name,
    senderUsername: user.username,
    content: comment.text,
    createdTime: comment.updated_at,
    postId: video.id,
    isUpdate: true
  });
}

/**
 * Handle comment deleted
 */
async function handleCommentDeleted(data: any, controller: SocialInboxController) {
  const { comment, video } = data;

  logger.info('TikTok comment deleted', {
    commentId: comment.id,
    videoId: video.id
  });

  // Could implement removal of comment from inbox if needed
}

/**
 * Handle video liked
 */
async function handleVideoLiked(data: any, controller: SocialInboxController) {
  const { video, user } = data;

  await controller.processWebhookMessage({
    platform: 'tiktok',
    type: 'like',
    platformId: `like_${user.id}_${video.id}_${Date.now()}`,
    senderId: user.id,
    senderName: user.display_name,
    senderUsername: user.username,
    senderProfilePicture: user.avatar_url,
    senderVerified: user.verified,
    senderFollowerCount: user.follower_count,
    content: `Liked your video: "${video.title}"`,
    createdTime: new Date().toISOString(),
    postId: video.id
  });
}

/**
 * Handle video shared
 */
async function handleVideoShared(data: any, controller: SocialInboxController) {
  const { video, user, share } = data;

  await controller.processWebhookMessage({
    platform: 'tiktok',
    type: 'share',
    platformId: `share_${user.id}_${video.id}_${Date.now()}`,
    senderId: user.id,
    senderName: user.display_name,
    senderUsername: user.username,
    senderProfilePicture: user.avatar_url,
    senderVerified: user.verified,
    senderFollowerCount: user.follower_count,
    content: share.caption || `Shared your video: "${video.title}"`,
    createdTime: share.created_at,
    postId: video.id,
    commentary: share.caption
  });
}

/**
 * Handle user followed
 */
async function handleUserFollowed(data: any, controller: SocialInboxController) {
  const { user } = data;

  await controller.processWebhookMessage({
    platform: 'tiktok',
    type: 'follow',
    platformId: `follow_${user.id}_${Date.now()}`,
    senderId: user.id,
    senderName: user.display_name,
    senderUsername: user.username,
    senderProfilePicture: user.avatar_url,
    senderVerified: user.verified,
    senderFollowerCount: user.follower_count,
    content: 'Started following you',
    createdTime: new Date().toISOString()
  });
}

/**
 * Handle direct message (when available)
 */
async function handleDirectMessage(data: any, controller: SocialInboxController) {
  const { message, user } = data;

  await controller.processWebhookMessage({
    platform: 'tiktok',
    type: 'direct_message',
    platformId: message.id,
    senderId: user.id,
    senderName: user.display_name,
    senderUsername: user.username,
    senderProfilePicture: user.avatar_url,
    content: message.text,
    createdTime: message.created_at,
    conversationId: message.conversation_id,
    attachments: extractMessageAttachments(message)
  });
}

/**
 * Extract attachments from comment
 */
function extractCommentAttachments(comment: any): any[] {
  const attachments: any[] = [];

  // TikTok comments can have stickers, emojis, etc.
  if (comment.stickers) {
    for (const sticker of comment.stickers) {
      attachments.push({
        type: 'sticker',
        url: sticker.url,
        name: sticker.name
      });
    }
  }

  return attachments;
}

/**
 * Extract attachments from direct message
 */
function extractMessageAttachments(message: any): any[] {
  const attachments: any[] = [];

  if (message.media) {
    for (const media of message.media) {
      attachments.push({
        type: media.type, // 'image', 'video', 'gif'
        url: media.url,
        thumbnailUrl: media.thumbnail_url,
        duration: media.duration
      });
    }
  }

  return attachments;
} 