import { BaseActionHandler } from '../../handlers';
import { NotificationService, NotificationPriority, NotificationCategory, NotificationChannel } from '../../../../lib/notifications/NotificationService';
import logger from '../../../../lib/logging/logger';

/**
 * Action handler for sending in-app notifications
 */
export default class SendNotificationAction extends BaseActionHandler {
  private notificationService = new NotificationService();

  /**
   * Execute the send notification action
   * @param parameters Action parameters
   * @param context Execution context
   * @returns Action result
   */
  async execute(
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    // Validate required parameters
    if (!this.validateParameters(parameters, ['userId', 'title'])) {
      throw new Error('Missing required parameters for SendNotificationAction');
    }
    
    const userId = this.getParameter<string>(parameters, 'userId', '');
    const title = this.getParameter<string>(parameters, 'title', '');
    const message = this.getParameter<string>(parameters, 'message', '');
    const priority = this.getParameter<string>(parameters, 'priority', 'low') as NotificationPriority;
    const actionUrl = this.getParameter<string>(parameters, 'link', '');
    const metadata = this.getParameter<Record<string, any>>(parameters, 'metadata', {});
    
    try {
      // Use template interpolation if available
      const parsedTitle = this.interpolateTemplateString(title, context);
      const parsedMessage = this.interpolateTemplateString(message, context);
      
      // Send the notification using the new API
      const notificationId = await this.notificationService.sendNotification({
        userId,
        title: parsedTitle,
        message: parsedMessage,
        priority: priority || NotificationPriority.LOW,
        category: NotificationCategory.SYSTEM,
        actionUrl,
        metadata: {
          ...metadata,
          fromAutomation: true,
          workflowId: context.workflowId
        }
      }, NotificationChannel.IN_APP);
      
      logger.info('Sent notification from automation', { 
        userId, 
        title: parsedTitle,
        notificationId
      });
      
      return {
        success: true,
        notificationId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error sending notification from automation', { 
        error, 
        userId, 
        title 
      });
      
      throw new Error(`Failed to send notification: ${(error as Error).message}`);
    }
  }
  
  /**
   * Interpolate template strings with values from context
   * @param template Template string with {{variable}} placeholders
   * @param context Context object with values
   * @returns Interpolated string
   */
  private interpolateTemplateString(
    template: string,
    context: Record<string, any>
  ): string {
    if (!template) return '';
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, part: any) => {
        return obj && obj[part] !== undefined ? obj[part] : undefined;
      }, context);
      
      return value !== undefined ? String(value) : match;
    });
  }
} 