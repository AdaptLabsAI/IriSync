import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/core/logging/logger';
import { WebhookService, WebhookEventType } from '../../../../lib/webhooks/WebhookService';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

/**
 * Storage Webhook Integration Endpoint
 * Handles file upload/deletion events and storage quota notifications
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, fileData, storageData, organizationId } = body;

    if (!eventType || !organizationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: eventType, organizationId' 
      }, { status: 400 });
    }

    const webhookService = new WebhookService();

    // Trigger webhooks based on event type
    switch (eventType) {
      case 'file.uploaded':
        await webhookService.triggerWebhooks(
          WebhookEventType.FILE_UPLOADED,
          {
            file: {
              id: fileData?.id,
              name: fileData?.name,
              type: fileData?.type,
              size: fileData?.size,
              url: fileData?.url,
              platform: fileData?.platform,
              folderId: fileData?.folderId
            },
            uploadedBy: session.user.id,
            timestamp: new Date().toISOString()
          },
          organizationId
        );
        break;

      case 'file.deleted':
        await webhookService.triggerWebhooks(
          WebhookEventType.FILE_DELETED,
          {
            file: {
              id: fileData?.id,
              name: fileData?.name,
              type: fileData?.type,
              size: fileData?.size,
              platform: fileData?.platform
            },
            deletedBy: session.user.id,
            timestamp: new Date().toISOString()
          },
          organizationId
        );
        break;

      case 'storage.quota_exceeded':
        await webhookService.triggerWebhooks(
          WebhookEventType.STORAGE_QUOTA_EXCEEDED,
          {
            storage: {
              used: storageData?.used,
              quota: storageData?.quota,
              percentage: storageData?.percentage,
              platform: storageData?.platform
            },
            userId: session.user.id,
            timestamp: new Date().toISOString()
          },
          organizationId
        );
        break;

      default:
        return NextResponse.json({ 
          error: `Unsupported event type: ${eventType}` 
        }, { status: 400 });
    }

    logger.info('Storage webhook triggered successfully', {
      eventType,
      organizationId,
      userId: session.user.id,
      fileName: fileData?.name
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error triggering storage webhook', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return supported storage webhook events
    return NextResponse.json({
      supportedEvents: [
        {
          type: 'file.uploaded',
          description: 'Triggered when a file is uploaded to storage'
        },
        {
          type: 'file.deleted',
          description: 'Triggered when a file is deleted from storage'
        },
        {
          type: 'storage.quota_exceeded',
          description: 'Triggered when storage quota is exceeded or approaching limit'
        }
      ],
      supportedPlatforms: [
        'google_drive',
        'dropbox',
        'onedrive',
        'box',
        'aws_s3',
        'local_storage'
      ]
    });

  } catch (error) {
    logger.error('Error getting storage webhook info', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 