import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/logging/logger';
import { SocialInboxController } from '../../../../lib/content/SocialInboxController';
import crypto from 'crypto';

const TWITTER_WEBHOOK_SECRET = process.env.TWITTER_WEBHOOK_SECRET || '';

/**
 * Twitter Webhook Endpoint
 * Handles real-time updates for:
 * - Tweet mentions
 * - Tweet replies
 * - Direct messages
 * - Tweet likes/retweets
 */

// Webhook verification (GET request)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const crcToken = searchParams.get('crc_token');

    if (!crcToken) {
      return new NextResponse('Missing crc_token', { status: 400 });
    }

    // Create CRC response
    const responseToken = crypto
      .createHmac('sha256', TWITTER_WEBHOOK_SECRET)
      .update(crcToken)
      .digest('base64');

    logger.info('Twitter webhook CRC verification successful');
    
    return NextResponse.json({
      response_token: `sha256=${responseToken}`
    });
  } catch (error) {
    logger.error('Error in Twitter webhook verification', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Webhook event handler (POST request)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-twitter-webhooks-signature');

    // Verify the webhook signature
    if (!verifySignature(body, signature)) {
      logger.warn('Twitter webhook signature verification failed');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = JSON.parse(body);
    logger.info('Twitter webhook received', { 
      eventTypes: Object.keys(data),
      userId: data.for_user_id 
    });

    // Process different event types
    await processTwitterWebhook(data);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('Error processing Twitter webhook', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Verify webhook signature
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !TWITTER_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', TWITTER_WEBHOOK_SECRET)
    .update(body)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process Twitter webhook events
 */
async function processTwitterWebhook(data: any) {
  const socialInboxController = new SocialInboxController();

  // Handle tweet create events (mentions, replies)
  if (data.tweet_create_events) {
    for (const tweet of data.tweet_create_events) {
      await handleTweetCreate(tweet, data.for_user_id, socialInboxController);
    }
  }

  // Handle direct message events
  if (data.direct_message_events) {
    for (const dm of data.direct_message_events) {
      await handleDirectMessage(dm, data.for_user_id, socialInboxController);
    }
  }

  // Handle favorite events (likes)
  if (data.favorite_events) {
    for (const favorite of data.favorite_events) {
      await handleFavoriteEvent(favorite, data.for_user_id, socialInboxController);
    }
  }

  // Handle follow events
  if (data.follow_events) {
    for (const follow of data.follow_events) {
      await handleFollowEvent(follow, data.for_user_id, socialInboxController);
    }
  }

  // Handle user events (profile updates, etc.)
  if (data.user_event) {
    await handleUserEvent(data.user_event, data.for_user_id, socialInboxController);
  }
}

/**
 * Handle tweet create events (mentions, replies)
 */
async function handleTweetCreate(tweet: any, forUserId: string, controller: SocialInboxController) {
  // Skip tweets from the authenticated user
  if (tweet.user.id_str === forUserId) {
    return;
  }

  // Check if this is a mention or reply
  const isMention = tweet.entities?.user_mentions?.some((mention: any) => mention.id_str === forUserId);
  const isReply = tweet.in_reply_to_user_id_str === forUserId;

  if (isMention || isReply) {
    await controller.processWebhookMessage({
      platform: 'twitter',
      type: isReply ? 'reply' : 'mention',
      platformId: tweet.id_str,
      senderId: tweet.user.id_str,
      senderName: tweet.user.name,
      senderUsername: tweet.user.screen_name,
      senderProfilePicture: tweet.user.profile_image_url_https,
      senderVerified: tweet.user.verified,
      senderFollowerCount: tweet.user.followers_count,
      content: tweet.text,
      createdTime: tweet.created_at,
      parentId: tweet.in_reply_to_status_id_str,
      attachments: extractTweetAttachments(tweet),
      metrics: {
        retweets: tweet.retweet_count,
        likes: tweet.favorite_count,
        replies: tweet.reply_count || 0
      }
    });
  }
}

/**
 * Handle direct message events
 */
async function handleDirectMessage(dm: any, forUserId: string, controller: SocialInboxController) {
  // Skip messages sent by the authenticated user
  if (dm.message_create.sender_id === forUserId) {
    return;
  }

  await controller.processWebhookMessage({
    platform: 'twitter',
    type: 'direct_message',
    platformId: dm.id,
    senderId: dm.message_create.sender_id,
    content: dm.message_create.message_data.text,
    createdTime: new Date(parseInt(dm.created_timestamp)).toISOString(),
    attachments: extractDMAttachments(dm.message_create.message_data),
    conversationId: dm.message_create.target?.recipient_id
  });
}

/**
 * Handle favorite events (likes on our tweets)
 */
async function handleFavoriteEvent(favorite: any, forUserId: string, controller: SocialInboxController) {
  // Only process likes on our tweets
  if (favorite.favorited_status?.user?.id_str === forUserId) {
    await controller.processWebhookMessage({
      platform: 'twitter',
      type: 'like',
      platformId: `like_${favorite.id}`,
      senderId: favorite.user.id_str,
      senderName: favorite.user.name,
      senderUsername: favorite.user.screen_name,
      senderProfilePicture: favorite.user.profile_image_url_https,
      senderVerified: favorite.user.verified,
      content: `Liked your tweet: "${favorite.favorited_status.text}"`,
      createdTime: favorite.created_at,
      parentId: favorite.favorited_status.id_str
    });
  }
}

/**
 * Handle follow events
 */
async function handleFollowEvent(follow: any, forUserId: string, controller: SocialInboxController) {
  // Only process follows of our account
  if (follow.target.id_str === forUserId) {
    await controller.processWebhookMessage({
      platform: 'twitter',
      type: 'follow',
      platformId: `follow_${follow.source.id_str}_${Date.now()}`,
      senderId: follow.source.id_str,
      senderName: follow.source.name,
      senderUsername: follow.source.screen_name,
      senderProfilePicture: follow.source.profile_image_url_https,
      senderVerified: follow.source.verified,
      senderFollowerCount: follow.source.followers_count,
      content: `Started following you`,
      createdTime: follow.created_at
    });
  }
}

/**
 * Handle user events
 */
async function handleUserEvent(userEvent: any, forUserId: string, controller: SocialInboxController) {
  // Log user events for debugging but don't create inbox messages
  logger.info('Twitter user event received', {
    event: userEvent.event,
    userId: forUserId
  });
}

/**
 * Extract attachments from tweet
 */
function extractTweetAttachments(tweet: any): any[] {
  const attachments: any[] = [];

  // Media attachments
  if (tweet.entities?.media) {
    for (const media of tweet.entities.media) {
      attachments.push({
        type: media.type, // 'photo', 'video', 'animated_gif'
        url: media.media_url_https,
        displayUrl: media.display_url,
        expandedUrl: media.expanded_url
      });
    }
  }

  // Extended media (videos, etc.)
  if (tweet.extended_entities?.media) {
    for (const media of tweet.extended_entities.media) {
      if (media.type === 'video' || media.type === 'animated_gif') {
        attachments.push({
          type: media.type,
          url: media.video_info?.variants?.[0]?.url,
          thumbnailUrl: media.media_url_https,
          duration: media.video_info?.duration_millis
        });
      }
    }
  }

  // URL attachments
  if (tweet.entities?.urls) {
    for (const url of tweet.entities.urls) {
      attachments.push({
        type: 'url',
        url: url.expanded_url,
        displayUrl: url.display_url,
        title: url.unwound?.title,
        description: url.unwound?.description
      });
    }
  }

  return attachments;
}

/**
 * Extract attachments from direct message
 */
function extractDMAttachments(messageData: any): any[] {
  const attachments: any[] = [];

  // Media attachments in DMs
  if (messageData.attachment?.media) {
    const media = messageData.attachment.media;
    attachments.push({
      type: media.type,
      url: media.media_url_https,
      displayUrl: media.display_url
    });
  }

  return attachments;
} 