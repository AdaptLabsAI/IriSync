import { logger } from '../logging/logger';
import axios from 'axios';
import { Ticket, TicketPriority } from '@/lib/features/support/models';
import { NotificationService, NotificationCategory, NotificationPriority, NotificationChannel } from './NotificationService';

/**
 * Slack webhook configuration
 */
interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

/**
 * CRM provider types
 */
export enum CRMProvider {
  HUBSPOT = 'hubspot',
  SALESFORCE = 'salesforce',
  ZOHO = 'zoho',
  PIPEDRIVE = 'pipedrive',
  DYNAMICS = 'dynamics',
  CUSTOM = 'custom'
}

/**
 * CRM configuration
 */
interface CRMConfig {
  provider: CRMProvider;
  apiKey: string;
  apiUrl: string;
  portalId?: string; // For HubSpot
  instanceUrl?: string; // For Salesforce
  orgId?: string; // For Zoho
}

/**
 * Gets the Slack configuration from environment variables
 */
function getSlackConfig(): SlackConfig {
  return {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: process.env.SLACK_CHANNEL,
    username: process.env.SLACK_USERNAME || 'IriSync Support',
    iconEmoji: process.env.SLACK_ICON_EMOJI || ':bell:'
  };
}

/**
 * Gets the CRM configuration from environment variables
 */
function getCRMConfig(): CRMConfig {
  const provider = (process.env.CRM_PROVIDER as CRMProvider) || CRMProvider.HUBSPOT;
  
  const config: CRMConfig = {
    provider,
    apiKey: process.env.CRM_API_KEY || '',
    apiUrl: process.env.CRM_API_URL || '',
  };
  
  // Add provider-specific config
  switch (provider) {
    case CRMProvider.HUBSPOT:
      config.portalId = process.env.HUBSPOT_PORTAL_ID;
      break;
    case CRMProvider.SALESFORCE:
      config.instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
      break;
    case CRMProvider.ZOHO:
      config.orgId = process.env.ZOHO_ORG_ID;
      break;
  }
  
  return config;
}

/**
 * Creates a formatted Slack message from ticket data
 */
function formatSlackMessage(message: string, ticket: Ticket): any {
  const priorityColors: Record<string, string> = {
    low: '#36a64f',
    medium: '#ffcc00',
    high: '#ff9900',
    urgent: '#ff0000'
  };
  
  const priority = typeof ticket.priority === 'string' ? ticket.priority.toLowerCase() : 'medium';
  const color = priorityColors[priority] || priorityColors.medium;
  
  return {
    text: message,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: message,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket ID:*\n${ticket.id}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${ticket.status}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Subject:*\n${ticket.subject}`
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${ticket.priority}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${ticket.description?.substring(0, 250)}${ticket.description?.length > 250 ? '...' : ''}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
              emoji: true
            },
            url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/support/tickets/${ticket.id}`,
            style: 'primary'
          }
        ]
      }
    ],
    attachments: [
      {
        color: color,
        footer: `Submitted by ${ticket.createdBy} • ${new Date(ticket.createdAt).toLocaleString()}`
      }
    ]
  };
}

/**
 * Sends a notification to Slack
 * @param message The message to send
 * @param ticket The ticket data
 * @returns Promise that resolves when the notification is sent
 */
export async function notifySlack(message: string, ticket: Ticket): Promise<boolean> {
  try {
    const config = getSlackConfig();
    
    // Skip if webhook URL is not configured
    if (!config.webhookUrl) {
      logger.warn('Slack webhook URL not configured, skipping notification');
      return false;
    }
    
    const slackMessage = formatSlackMessage(message, ticket);
    
    // Add channel if specified
    if (config.channel) {
      slackMessage.channel = config.channel;
    }
    
    // Add username and icon if specified
    if (config.username) {
      slackMessage.username = config.username;
    }
    
    if (config.iconEmoji) {
      slackMessage.icon_emoji = config.iconEmoji;
    }
    
    // Send to Slack
    const response = await axios.post(config.webhookUrl, slackMessage, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      logger.info('Slack notification sent successfully', { ticketId: ticket.id });
      return true;
    } else {
      logger.warn('Slack notification failed', { 
        status: response.status, 
        ticketId: ticket.id,
        response: response.data
      });
      return false;
    }
  } catch (error) {
    logger.error('Error sending Slack notification', { 
      error: error instanceof Error ? error.message : String(error),
      ticketId: ticket.id
    });
    return false;
  }
}

/**
 * Creates a HubSpot ticket
 */
async function createHubspotTicket(message: string, ticket: Ticket, config: CRMConfig): Promise<boolean> {
  try {
    // Skip if API key or portal ID is not configured
    if (!config.apiKey || !config.portalId) {
      logger.warn('HubSpot API key or portal ID not configured');
      return false;
    }
    
    const hubspotTicket = {
      subject: ticket.subject,
      content: ticket.description,
      hs_pipeline: process.env.HUBSPOT_PIPELINE_ID || 'default',
      hs_pipeline_stage: process.env.HUBSPOT_PIPELINE_STAGE_ID || 'default',
      hs_ticket_priority: ticket.priority.toUpperCase(),
      custom_irisync_ticket_id: ticket.id
    };
    
    const response = await axios.post(
      `https://api.hubapi.com/crm/v3/objects/tickets`,
      hubspotTicket,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        }
      }
    );
    
    if (response.status === 201) {
      logger.info('HubSpot ticket created successfully', { 
        ticketId: ticket.id,
        hubspotTicketId: response.data.id
      });
      
      // Store the CRM ticket ID in the ticket metadata
      // Note: This would require updating the ticket in the database
      // which could be implemented in the support service
      
      return true;
    } else {
      logger.warn('HubSpot ticket creation failed', { 
        status: response.status, 
        ticketId: ticket.id,
        response: response.data
      });
      return false;
    }
  } catch (error) {
    logger.error('Error creating HubSpot ticket', { 
      error: error instanceof Error ? error.message : String(error),
      ticketId: ticket.id
    });
    return false;
  }
}

/**
 * Creates a Salesforce case
 */
async function createSalesforceCase(message: string, ticket: Ticket, config: CRMConfig): Promise<boolean> {
  try {
    // Skip if API key or instance URL is not configured
    if (!config.apiKey || !config.instanceUrl) {
      logger.warn('Salesforce API key or instance URL not configured');
      return false;
    }
    
    const salesforceCase = {
      Subject: ticket.subject,
      Description: ticket.description,
      Origin: 'IriSync Support Portal',
      Priority: ticket.priority === 'urgent' ? 'High' : 
               ticket.priority === 'high' ? 'High' : 
               ticket.priority === 'medium' ? 'Medium' : 'Low',
      Status: 'New',
      IriSync_Ticket_ID__c: ticket.id
    };
    
    const response = await axios.post(
      `${config.instanceUrl}/services/data/v56.0/sobjects/Case`,
      salesforceCase,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        }
      }
    );
    
    if (response.status === 201) {
      logger.info('Salesforce case created successfully', { 
        ticketId: ticket.id,
        salesforceCaseId: response.data.id
      });
      return true;
    } else {
      logger.warn('Salesforce case creation failed', { 
        status: response.status, 
        ticketId: ticket.id,
        response: response.data
      });
      return false;
    }
  } catch (error) {
    logger.error('Error creating Salesforce case', { 
      error: error instanceof Error ? error.message : String(error),
      ticketId: ticket.id
    });
    return false;
  }
}

/**
 * Sends a notification to the configured CRM system
 * @param message The message to send
 * @param ticket The ticket data
 * @returns Promise that resolves when the notification is sent
 */
export async function notifyCRM(message: string, ticket: Ticket): Promise<boolean> {
  try {
    const config = getCRMConfig();
    
    // Skip if API key is not configured
    if (!config.apiKey) {
      logger.warn('CRM API key not configured, skipping notification');
      return false;
    }
    
    // Route to the appropriate CRM provider
    switch (config.provider) {
      case CRMProvider.HUBSPOT:
        return await createHubspotTicket(message, ticket, config);
      
      case CRMProvider.SALESFORCE:
        return await createSalesforceCase(message, ticket, config);
        
      // Add more CRM providers as needed
      
      default:
        logger.warn(`Unsupported CRM provider: ${config.provider}`);
        return false;
    }
  } catch (error) {
    logger.error('Error sending CRM notification', { 
      error: error instanceof Error ? error.message : String(error),
      ticketId: ticket.id
    });
    return false;
  }
}

/**
 * Sends an email notification using the NotificationService
 * @param message The message to send
 * @param ticket The ticket data
 * @param to The recipient email address
 * @returns Promise that resolves when the notification is sent
 */
export async function notifyEmail(message: string, ticket: Ticket, to: string): Promise<boolean> {
  try {
    if (!to) {
      logger.warn('Email recipient not provided, skipping notification');
      return false;
    }
    
    const notificationService = new NotificationService();
    
    // Create the notification with appropriate metadata
    await notificationService.sendNotification({
      userId: ticket.userId,
      title: `Support Ticket: ${ticket.subject}`,
      message: message,
      priority: ticket.priority === 'urgent' ? NotificationPriority.URGENT :
               ticket.priority === 'high' ? NotificationPriority.HIGH :
               ticket.priority === 'medium' ? NotificationPriority.MEDIUM :
               NotificationPriority.LOW,
      category: NotificationCategory.SYSTEM,
      actionUrl: `/support/tickets/${ticket.id}`,
      actionText: 'View Ticket',
      metadata: {
        ticketId: ticket.id,
        ticketStatus: ticket.status,
        ticketType: ticket.type,
        notification: {
          source: 'support',
          type: 'ticket_update'
        }
      }
    }, NotificationChannel.EMAIL, to);
    
    logger.info('Email notification sent successfully', { 
      ticketId: ticket.id,
      recipient: to 
    });
    return true;
  } catch (error) {
    logger.error('Error sending email notification', { 
      error: error instanceof Error ? error.message : String(error),
      ticketId: ticket.id,
      recipient: to
    });
    return false;
  }
} 