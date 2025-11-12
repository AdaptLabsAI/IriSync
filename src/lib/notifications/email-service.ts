import { logger } from '../logging/logger';
import unifiedEmailService from './unified-email-service';

/**
 * Team invitation email parameters
 */
interface TeamInvitationParams {
  to: string;
  inviterName: string;
  organizationName: string;
  message?: string;
  invitationLink: string;
  expiresIn: string;
}

/**
 * Email service for sending application notifications
 * Now uses the unified email service
 */
class EmailService {
  
  /**
   * Send team invitation email
   */
  async sendTeamInvitation(params: TeamInvitationParams): Promise<boolean> {
    try {
      const result = await unifiedEmailService.sendTeamInvitation(params);
      
      if (result.success) {
        logger.info('Team invitation email sent successfully', {
          to: params.to,
          organizationName: params.organizationName,
          messageId: result.messageId,
          provider: result.provider
        });
        return true;
      } else {
        logger.error('Failed to send team invitation email', {
          error: result.error,
          provider: result.provider,
          to: params.to
        });
        return false;
      }
    } catch (error) {
      logger.error(`Failed to send team invitation email: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Send a general notification email
   */
  async sendNotificationEmail(params: {
    to: string;
    subject: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<boolean> {
    try {
      const result = await unifiedEmailService.sendNotificationEmail(params);
      
      if (result.success) {
        logger.info('Notification email sent successfully', {
          to: params.to,
          subject: params.subject,
          messageId: result.messageId,
          provider: result.provider
        });
        return true;
      } else {
        logger.error('Failed to send notification email', {
          error: result.error,
          provider: result.provider,
          to: params.to,
          subject: params.subject
        });
        return false;
      }
    } catch (error) {
      logger.error(`Failed to send notification email: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get email service status
   */
  getStatus() {
    return unifiedEmailService.getStatus();
  }
}

// Export a singleton instance
export default new EmailService(); 