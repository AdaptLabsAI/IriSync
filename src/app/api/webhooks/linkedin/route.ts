import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/core/logging/logger';
import { SocialInboxController } from '../../../../lib/features/content/SocialInboxController';
import crypto from 'crypto';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


const LINKEDIN_WEBHOOK_SECRET = process.env.LINKEDIN_WEBHOOK_SECRET || '';

/**
 * LinkedIn Webhook Endpoint
 * Handles real-time updates for:
 * - Post comments
 * - Social actions (likes, shares)
 * - Company page updates
 * - Profile mentions
 */

// Webhook verification (GET request)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const challenge = searchParams.get('challenge');

    if (!challenge) {
      return new NextResponse('Missing challenge parameter', { status: 400 });
    }

    logger.info('LinkedIn webhook verification successful');
    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    logger.error('Error in LinkedIn webhook verification', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Webhook event handler (POST request)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-linkedin-signature');

    // Verify the webhook signature
    if (!verifySignature(body, signature)) {
      logger.warn('LinkedIn webhook signature verification failed');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = JSON.parse(body);
    logger.info('LinkedIn webhook received', { 
      eventType: data.eventType,
      entityUrn: data.entityUrn 
    });

    // Process webhook events
    await processLinkedInWebhook(data);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('Error processing LinkedIn webhook', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Verify webhook signature
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !LINKEDIN_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', LINKEDIN_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process LinkedIn webhook events
 */
async function processLinkedInWebhook(data: any) {
  const socialInboxController = new SocialInboxController();

  switch (data.eventType) {
    case 'SOCIAL_ACTION_CREATED':
      await handleSocialActionCreated(data, socialInboxController);
      break;
    case 'SOCIAL_ACTION_DELETED':
      await handleSocialActionDeleted(data, socialInboxController);
      break;
    case 'COMMENT_CREATED':
      await handleCommentCreated(data, socialInboxController);
      break;
    case 'COMMENT_UPDATED':
      await handleCommentUpdated(data, socialInboxController);
      break;
    case 'COMMENT_DELETED':
      await handleCommentDeleted(data, socialInboxController);
      break;
    case 'SHARE_CREATED':
      await handleShareCreated(data, socialInboxController);
      break;
    case 'MENTION_CREATED':
      await handleMentionCreated(data, socialInboxController);
      break;
    default:
      logger.info('Unhandled LinkedIn webhook event type', { eventType: data.eventType });
  }
}

/**
 * Handle social action created (likes, reactions)
 */
async function handleSocialActionCreated(data: any, controller: SocialInboxController) {
  const { entityUrn, actor, socialAction } = data;

  // Only process likes/reactions on our content
  if (socialAction?.actionType === 'LIKE' || socialAction?.actionType === 'REACTION') {
    await controller.processWebhookMessage({
      platform: 'linkedin',
      type: 'like',
      platformId: `${socialAction.actionType.toLowerCase()}_${actor}_${Date.now()}`,
      senderId: extractPersonId(actor),
      content: `${socialAction.actionType === 'LIKE' ? 'Liked' : 'Reacted to'} your post`,
      createdTime: new Date().toISOString(),
      parentId: extractPostId(entityUrn),
      actionType: socialAction.actionType,
      reactionType: socialAction.reactionType
    });
  }
}

/**
 * Handle social action deleted (unlike, unreact)
 */
async function handleSocialActionDeleted(data: any, controller: SocialInboxController) {
  const { entityUrn, actor, socialAction } = data;

  logger.info('LinkedIn social action deleted', {
    entityUrn,
    actor,
    actionType: socialAction?.actionType
  });

  // Could implement removal of like notifications if needed
}

/**
 * Handle comment created
 */
async function handleCommentCreated(data: any, controller: SocialInboxController) {
  const { entityUrn, actor, comment } = data;

  await controller.processWebhookMessage({
    platform: 'linkedin',
    type: 'comment',
    platformId: comment.id || `comment_${Date.now()}`,
    senderId: extractPersonId(actor),
    content: comment.message?.text || '',
    createdTime: comment.created?.time ? new Date(comment.created.time).toISOString() : new Date().toISOString(),
    parentId: comment.parentComment ? extractCommentId(comment.parentComment) : undefined,
    postId: extractPostId(entityUrn),
    commentUrn: comment.id
  });
}

/**
 * Handle comment updated
 */
async function handleCommentUpdated(data: any, controller: SocialInboxController) {
  const { entityUrn, actor, comment } = data;

  // Update existing comment in inbox
  await controller.processWebhookMessage({
    platform: 'linkedin',
    type: 'comment_update',
    platformId: comment.id || `comment_update_${Date.now()}`,
    senderId: extractPersonId(actor),
    content: comment.message?.text || '',
    createdTime: comment.lastModified?.time ? new Date(comment.lastModified.time).toISOString() : new Date().toISOString(),
    parentId: comment.parentComment ? extractCommentId(comment.parentComment) : undefined,
    postId: extractPostId(entityUrn),
    commentUrn: comment.id,
    isUpdate: true
  });
}

/**
 * Handle comment deleted
 */
async function handleCommentDeleted(data: any, controller: SocialInboxController) {
  const { entityUrn, actor, comment } = data;

  logger.info('LinkedIn comment deleted', {
    entityUrn,
    actor,
    commentId: comment.id
  });

  // Could implement removal of comment from inbox if needed
}

/**
 * Handle share created (reshares of our content)
 */
async function handleShareCreated(data: any, controller: SocialInboxController) {
  const { entityUrn, actor, share } = data;

  await controller.processWebhookMessage({
    platform: 'linkedin',
    type: 'share',
    platformId: share.id || `share_${Date.now()}`,
    senderId: extractPersonId(actor),
    content: share.commentary?.text || 'Shared your post',
    createdTime: share.created?.time ? new Date(share.created.time).toISOString() : new Date().toISOString(),
    parentId: extractPostId(entityUrn),
    shareUrn: share.id,
    commentary: share.commentary?.text
  });
}

/**
 * Handle mention created
 */
async function handleMentionCreated(data: any, controller: SocialInboxController) {
  const { entityUrn, actor, mention } = data;

  await controller.processWebhookMessage({
    platform: 'linkedin',
    type: 'mention',
    platformId: mention.id || `mention_${Date.now()}`,
    senderId: extractPersonId(actor),
    content: mention.message?.text || 'Mentioned you in a post',
    createdTime: mention.created?.time ? new Date(mention.created.time).toISOString() : new Date().toISOString(),
    postId: extractPostId(entityUrn),
    mentionUrn: mention.id
  });
}

/**
 * Extract person ID from LinkedIn URN
 */
function extractPersonId(actorUrn: string): string {
  // LinkedIn URNs are in format: urn:li:person:PERSON_ID
  const match = actorUrn.match(/urn:li:person:(.+)/);
  return match ? match[1] : actorUrn;
}

/**
 * Extract post ID from LinkedIn URN
 */
function extractPostId(entityUrn: string): string {
  // LinkedIn post URNs can be: urn:li:activity:POST_ID or urn:li:share:POST_ID
  const match = entityUrn.match(/urn:li:(activity|share):(.+)/);
  return match ? match[2] : entityUrn;
}

/**
 * Extract comment ID from LinkedIn URN
 */
function extractCommentId(commentUrn: string): string {
  // LinkedIn comment URNs: urn:li:comment:(activity:POST_ID,COMMENT_ID)
  const match = commentUrn.match(/urn:li:comment:\(.*,(.+)\)/);
  return match ? match[1] : commentUrn;
} 