import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/core/logging/logger';
import { WebhookService, WebhookEventType } from '../../../../lib/webhooks/WebhookService';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

/**
 * CRM Webhook Integration Endpoint
 * Handles outbound webhooks to CRM systems when social inbox events occur
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, contactData, messageData, organizationId } = body;

    if (!eventType || !organizationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: eventType, organizationId' 
      }, { status: 400 });
    }

    const webhookService = new WebhookService();

    // Trigger webhooks based on event type
    switch (eventType) {
      case 'contact.created':
      case 'contact.updated':
        await webhookService.triggerWebhooks(
          eventType as WebhookEventType,
          {
            contact: contactData,
            triggeredBy: session.user.id,
            timestamp: new Date().toISOString()
          },
          organizationId
        );
        break;

      case 'contact.interaction':
        await webhookService.triggerWebhooks(
          WebhookEventType.CONTACT_INTERACTION,
          {
            contact: contactData,
            message: messageData,
            platform: messageData?.platform,
            interactionType: messageData?.type,
            triggeredBy: session.user.id,
            timestamp: new Date().toISOString()
          },
          organizationId
        );
        break;

      case 'message.received':
      case 'message.replied':
      case 'message.assigned':
        await webhookService.triggerWebhooks(
          eventType as WebhookEventType,
          {
            message: messageData,
            contact: contactData,
            triggeredBy: session.user.id,
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

    logger.info('CRM webhook triggered successfully', {
      eventType,
      organizationId,
      userId: session.user.id
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error triggering CRM webhook', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return supported CRM webhook events
    return NextResponse.json({
      supportedEvents: [
        {
          type: 'contact.created',
          description: 'Triggered when a new contact is created from social interactions'
        },
        {
          type: 'contact.updated',
          description: 'Triggered when contact information is updated'
        },
        {
          type: 'contact.interaction',
          description: 'Triggered when a contact interacts via social media'
        },
        {
          type: 'lead.created',
          description: 'Triggered when a new lead is identified from social interactions'
        },
        {
          type: 'message.received',
          description: 'Triggered when a new social media message is received'
        },
        {
          type: 'message.replied',
          description: 'Triggered when a message is replied to'
        },
        {
          type: 'message.assigned',
          description: 'Triggered when a message is assigned to a team member'
        }
      ]
    });

  } catch (error) {
    logger.error('Error getting CRM webhook info', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 