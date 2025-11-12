import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/logging/logger';
import { SocialInboxController } from '../../../../lib/content/SocialInboxController';
import crypto from 'crypto';

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'irisync_facebook_webhook_2024';

/**
 * Facebook Webhook Endpoint
 * Handles real-time updates for:
 * - Page comments
 * - Page messages
 * - Page mentions
 * - Post interactions
 */

// Webhook verification (GET request)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify the webhook
    if (mode === 'subscribe' && token === FACEBOOK_VERIFY_TOKEN) {
      logger.info('Facebook webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    }

    logger.warn('Facebook webhook verification failed', { mode, token });
    return new NextResponse('Forbidden', { status: 403 });
  } catch (error) {
    logger.error('Error in Facebook webhook verification', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Webhook event handler (POST request)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Verify the webhook signature
    if (!verifySignature(body, signature)) {
      logger.warn('Facebook webhook signature verification failed');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = JSON.parse(body);
    logger.info('Facebook webhook received', { 
      object: data.object,
      entryCount: data.entry?.length || 0 
    });

    // Process webhook entries
    if (data.object === 'page') {
      await processPageWebhook(data.entry);
    } else if (data.object === 'instagram') {
      await processInstagramWebhook(data.entry);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('Error processing Facebook webhook', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Verify webhook signature
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !FACEBOOK_APP_SECRET) {
    return false;
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', FACEBOOK_APP_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process Facebook Page webhook events
 */
async function processPageWebhook(entries: any[]) {
  const socialInboxController = new SocialInboxController();

  for (const entry of entries) {
    const pageId = entry.id;
    const changes = entry.changes || [];
    const messaging = entry.messaging || [];

    // Process page changes (comments, posts, etc.)
    for (const change of changes) {
      try {
        switch (change.field) {
          case 'feed':
            await handleFeedChange(change.value, pageId, socialInboxController);
            break;
          case 'comments':
            await handleCommentChange(change.value, pageId, socialInboxController);
            break;
          case 'mention':
            await handleMentionChange(change.value, pageId, socialInboxController);
            break;
          case 'posts':
            await handlePostChange(change.value, pageId, socialInboxController);
            break;
        }
      } catch (error) {
        logger.error('Error processing Facebook page change', { 
          error, 
          field: change.field, 
          pageId 
        });
      }
    }

    // Process messaging events (messages, postbacks)
    for (const message of messaging) {
      try {
        if (message.message) {
          await handlePageMessage(message, pageId, socialInboxController);
        } else if (message.postback) {
          await handlePostback(message, pageId, socialInboxController);
        }
      } catch (error) {
        logger.error('Error processing Facebook messaging event', { 
          error, 
          pageId 
        });
      }
    }
  }
}

/**
 * Process Instagram webhook events
 */
async function processInstagramWebhook(entries: any[]) {
  const socialInboxController = new SocialInboxController();

  for (const entry of entries) {
    const instagramId = entry.id;
    const changes = entry.changes || [];
    const messaging = entry.messaging || [];

    // Process Instagram changes
    for (const change of changes) {
      try {
        switch (change.field) {
          case 'comments':
            await handleInstagramComment(change.value, instagramId, socialInboxController);
            break;
          case 'mentions':
            await handleInstagramMention(change.value, instagramId, socialInboxController);
            break;
        }
      } catch (error) {
        logger.error('Error processing Instagram change', { 
          error, 
          field: change.field, 
          instagramId 
        });
      }
    }

    // Process Instagram messaging
    for (const message of messaging) {
      try {
        if (message.message) {
          await handleInstagramMessage(message, instagramId, socialInboxController);
        }
      } catch (error) {
        logger.error('Error processing Instagram messaging event', { 
          error, 
          instagramId 
        });
      }
    }
  }
}

/**
 * Handle Facebook feed changes
 */
async function handleFeedChange(value: any, pageId: string, controller: SocialInboxController) {
  if (value.item === 'comment') {
    // New comment on page post
    await controller.processWebhookMessage({
      platform: 'facebook',
      type: 'comment',
      platformId: value.comment_id,
      postId: value.post_id,
      senderId: value.from?.id,
      senderName: value.from?.name,
      content: value.message,
      createdTime: value.created_time,
      pageId,
      parentId: value.parent_id
    });
  }
}

/**
 * Handle Facebook comment changes
 */
async function handleCommentChange(value: any, pageId: string, controller: SocialInboxController) {
  await controller.processWebhookMessage({
    platform: 'facebook',
    type: 'comment',
    platformId: value.id,
    postId: value.post_id,
    senderId: value.from?.id,
    senderName: value.from?.name,
    content: value.message,
    createdTime: value.created_time,
    pageId,
    parentId: value.parent_id,
    verb: value.verb // 'add', 'edit', 'remove'
  });
}

/**
 * Handle Facebook mentions
 */
async function handleMentionChange(value: any, pageId: string, controller: SocialInboxController) {
  await controller.processWebhookMessage({
    platform: 'facebook',
    type: 'mention',
    platformId: value.post_id,
    senderId: value.from?.id,
    senderName: value.from?.name,
    content: value.message,
    createdTime: value.created_time,
    pageId
  });
}

/**
 * Handle Facebook post changes
 */
async function handlePostChange(value: any, pageId: string, controller: SocialInboxController) {
  if (value.verb === 'add' && value.item === 'status') {
    // New post mentioning the page
    await controller.processWebhookMessage({
      platform: 'facebook',
      type: 'mention',
      platformId: value.post_id,
      senderId: value.from?.id,
      senderName: value.from?.name,
      content: value.message,
      createdTime: value.created_time,
      pageId
    });
  }
}

/**
 * Handle Facebook page messages
 */
async function handlePageMessage(message: any, pageId: string, controller: SocialInboxController) {
  await controller.processWebhookMessage({
    platform: 'facebook',
    type: 'message',
    platformId: message.message.mid,
    senderId: message.sender.id,
    content: message.message.text,
    createdTime: new Date(message.timestamp).toISOString(),
    pageId,
    attachments: message.message.attachments
  });
}

/**
 * Handle Facebook postbacks
 */
async function handlePostback(message: any, pageId: string, controller: SocialInboxController) {
  await controller.processWebhookMessage({
    platform: 'facebook',
    type: 'postback',
    platformId: `postback_${message.timestamp}`,
    senderId: message.sender.id,
    content: message.postback.title,
    createdTime: new Date(message.timestamp).toISOString(),
    pageId,
    payload: message.postback.payload
  });
}

/**
 * Handle Instagram comments
 */
async function handleInstagramComment(value: any, instagramId: string, controller: SocialInboxController) {
  await controller.processWebhookMessage({
    platform: 'instagram',
    type: 'comment',
    platformId: value.id,
    postId: value.media?.id,
    senderId: value.from?.id,
    senderName: value.from?.username,
    content: value.text,
    createdTime: value.timestamp,
    pageId: instagramId
  });
}

/**
 * Handle Instagram mentions
 */
async function handleInstagramMention(value: any, instagramId: string, controller: SocialInboxController) {
  await controller.processWebhookMessage({
    platform: 'instagram',
    type: 'mention',
    platformId: value.media_id,
    senderId: value.from?.id,
    senderName: value.from?.username,
    content: value.caption,
    createdTime: value.timestamp,
    pageId: instagramId
  });
}

/**
 * Handle Instagram messages
 */
async function handleInstagramMessage(message: any, instagramId: string, controller: SocialInboxController) {
  await controller.processWebhookMessage({
    platform: 'instagram',
    type: 'message',
    platformId: message.message.mid,
    senderId: message.sender.id,
    content: message.message.text,
    createdTime: new Date(message.timestamp).toISOString(),
    pageId: instagramId,
    attachments: message.message.attachments
  });
} 