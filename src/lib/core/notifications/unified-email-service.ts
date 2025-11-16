import { logger } from '../logging/logger';

/**
 * Unified Email Service for IriSync
 * Consolidates all email functionality with multiple provider support
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  category?: string;
  sendAt?: Date;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface BulkEmailMessage {
  recipients: Array<{
    email: string;
    name?: string;
    templateData?: Record<string, any>;
  }>;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  category?: string;
  sendAt?: Date;
}

/**
 * Email provider interface
 */
interface EmailProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<EmailResult>;
  sendBulkEmail(message: BulkEmailMessage): Promise<EmailResult>;
  isConfigured(): boolean;
}

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements EmailProvider {
  name = 'sendgrid';
  private apiKey: string;
  private baseUrl = 'https://api.sendgrid.com/v3';

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SendGrid not configured', provider: this.name };
    }

    try {
      const payload = this.buildSendGridPayload([{
        email: Array.isArray(message.to) ? message.to[0] : message.to,
        name: Array.isArray(message.to) ? message.to[0] : message.to
      }], message);

      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`SendGrid error: ${response.status} - ${errorData?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const messageId = response.headers.get('x-message-id') || `sendgrid_${Date.now()}`;
      
      return {
        success: true,
        messageId,
        provider: this.name
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      };
    }
  }

  async sendBulkEmail(message: BulkEmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SendGrid not configured', provider: this.name };
    }

    try {
      const payload = this.buildSendGridPayload(message.recipients, message);

      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`SendGrid bulk error: ${response.status} - ${errorData?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const messageId = response.headers.get('x-message-id') || `sendgrid_bulk_${Date.now()}`;
      
      return {
        success: true,
        messageId,
        provider: this.name
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      };
    }
  }

  private buildSendGridPayload(recipients: Array<{ email: string; name?: string; templateData?: any }>, message: any) {
    const personalizations = recipients.map(recipient => ({
      to: [{ 
        email: recipient.email, 
        name: recipient.name || recipient.email 
      }],
      dynamic_template_data: recipient.templateData || message.templateData || {}
    }));

    const payload: any = {
      personalizations,
      from: {
        email: message.from || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@irisync.io',
        name: process.env.SENDGRID_FROM_NAME || 'IriSync'
      },
      subject: message.subject,
      content: [
        {
          type: 'text/html',
          value: message.htmlContent
        }
      ]
    };

    if (message.textContent) {
      payload.content.unshift({
        type: 'text/plain',
        value: message.textContent
      });
    }

    if (message.templateId) {
      payload.template_id = message.templateId;
      delete payload.content;
    }

    if (message.sendAt) {
      payload.send_at = Math.floor(message.sendAt.getTime() / 1000);
    }

    if (message.priority === 'high') {
      payload.headers = { 'X-Priority': '1' };
    }

    if (message.category) {
      payload.categories = [message.category];
    }

    return payload;
  }
}

/**
 * SMTP Email Provider (fallback)
 */
class SMTPProvider implements EmailProvider {
  name = 'smtp';
  private nodemailer: any;
  private transporter: any;

  constructor() {
    try {
      this.nodemailer = require('nodemailer');
      if (this.isConfigured()) {
        this.transporter = this.nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
      }
    } catch (error) {
      logger.warn('Nodemailer not available for SMTP provider');
    }
  }

  isConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured() || !this.transporter) {
      return { success: false, error: 'SMTP not configured', provider: this.name };
    }

    try {
      const result = await this.transporter.sendMail({
        from: message.from || process.env.EMAIL_FROM || 'noreply@irisync.io',
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.htmlContent,
        text: message.textContent,
        attachments: message.attachments
      });

      return {
        success: true,
        messageId: result.messageId,
        provider: this.name
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      };
    }
  }

  async sendBulkEmail(message: BulkEmailMessage): Promise<EmailResult> {
    // For SMTP, send individual emails
    const results = await Promise.allSettled(
      message.recipients.map(recipient => 
        this.sendEmail({
          to: recipient.email,
          subject: message.subject,
          htmlContent: message.htmlContent,
          textContent: message.textContent,
          templateData: recipient.templateData || message.templateData
        })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const totalCount = message.recipients.length;

    return {
      success: successCount > 0,
      messageId: `smtp_bulk_${Date.now()}`,
      error: successCount < totalCount ? `${totalCount - successCount} emails failed` : undefined,
      provider: this.name
    };
  }
}

/**
 * Development Email Provider (logs emails)
 */
class DevProvider implements EmailProvider {
  name = 'development';

  isConfigured(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    // Only log in non-production or when debug is enabled
    if (process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEBUG === 'true') {
      logger.info('📧 Email would be sent in production:', {
        to: message.to,
        subject: message.subject,
        provider: this.name,
        hasHtml: !!message.htmlContent,
        hasText: !!message.textContent,
        hasAttachments: !!(message.attachments?.length),
        priority: message.priority,
        category: message.category
      });
    }

    return {
      success: true,
      messageId: `dev_${Date.now()}`,
      provider: this.name
    };
  }

  async sendBulkEmail(message: BulkEmailMessage): Promise<EmailResult> {
    // Only log in non-production or when debug is enabled
    if (process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEBUG === 'true') {
      logger.info('📧 Bulk email would be sent in production:', {
        recipientCount: message.recipients.length,
        subject: message.subject,
        provider: this.name,
        hasTemplate: !!message.templateId,
        priority: message.priority,
        category: message.category
      });
    }

    return {
      success: true,
      messageId: `dev_bulk_${Date.now()}`,
      provider: this.name
    };
  }
}

/**
 * Unified Email Service
 */
export class UnifiedEmailService {
  private providers: EmailProvider[] = [];
  private primaryProvider: EmailProvider;

  constructor() {
    // Initialize providers in order of preference
    this.providers = [
      new SendGridProvider(),
      new SMTPProvider(),
      new DevProvider()
    ];

    // Determine primary provider based on environment
    // In production, never use the development provider
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Use EMAIL_PRIMARY_PROVIDER env var if specified, otherwise auto-select
    const preferredProvider = process.env.EMAIL_PRIMARY_PROVIDER;
    
    if (preferredProvider) {
      // Try to use the specified provider
      const specified = this.providers.find(
        p => p.name.toLowerCase() === preferredProvider.toLowerCase() && p.isConfigured()
      );
      
      if (specified) {
        this.primaryProvider = specified;
      } else {
        // Fallback to first configured non-dev provider in production
        if (isProduction) {
          this.primaryProvider = this.providers.find(p => p.isConfigured() && p.name !== 'development') 
            || this.providers.find(p => p.isConfigured()) 
            || this.providers[this.providers.length - 1];
        } else {
          this.primaryProvider = this.providers.find(p => p.isConfigured()) 
            || this.providers[this.providers.length - 1];
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Specified email provider "${preferredProvider}" not configured. Using "${this.primaryProvider.name}" instead.`);
        }
      }
    } else {
      // Auto-select: In production, skip development provider
      if (isProduction) {
        this.primaryProvider = this.providers.find(p => p.isConfigured() && p.name !== 'development')
          || this.providers.find(p => p.isConfigured()) 
          || this.providers[this.providers.length - 1];
      } else {
        // In development, use first configured provider (including dev)
        this.primaryProvider = this.providers.find(p => p.isConfigured()) 
          || this.providers[this.providers.length - 1];
      }
    }

    // Only log in non-production or when explicitly enabled
    if (process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEBUG === 'true') {
      logger.info('Unified Email Service initialized', {
        primaryProvider: this.primaryProvider.name,
        availableProviders: this.providers.filter(p => p.isConfigured()).map(p => p.name),
        environment: process.env.NODE_ENV
      });
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const result = await this.primaryProvider.sendEmail(message);

    // Only log in non-production or when debug is enabled
    if (process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEBUG === 'true') {
      logger.info('Email sent', {
        success: result.success,
        provider: result.provider,
        messageId: result.messageId,
        to: Array.isArray(message.to) ? message.to.length + ' recipients' : message.to,
        subject: message.subject
      });
    }

    if (!result.success) {
      logger.error('Email sending failed', {
        error: result.error,
        provider: result.provider,
        subject: message.subject
      });
    }

    return result;
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(message: BulkEmailMessage): Promise<EmailResult> {
    const result = await this.primaryProvider.sendBulkEmail(message);

    // Only log in non-production or when debug is enabled
    if (process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEBUG === 'true') {
      logger.info('Bulk email sent', {
        success: result.success,
        provider: result.provider,
        messageId: result.messageId,
        recipientCount: message.recipients.length,
        subject: message.subject
      });
    }

    if (!result.success) {
      logger.error('Bulk email sending failed', {
        error: result.error,
        provider: result.provider,
        recipientCount: message.recipients.length
      });
    }

    return result;
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(params: {
    to: string;
    subject: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<EmailResult> {
    const htmlContent = this.generateNotificationHtml(params);
    const textContent = this.generateNotificationText(params);

    return this.sendEmail({
      to: params.to,
      subject: params.subject,
      htmlContent,
      textContent,
      priority: params.priority,
      category: 'notification'
    });
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitation(params: {
    to: string;
    inviterName: string;
    organizationName: string;
    message?: string;
    invitationLink: string;
    expiresIn: string;
  }): Promise<EmailResult> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">You've been invited to join ${params.organizationName}</h2>
        <p>${params.inviterName} has invited you to collaborate in ${params.organizationName} on IriSync.</p>
        ${params.message ? `<p style="background: #f8fafc; padding: 15px; border-left: 4px solid #4f46e5;"><em>"${params.message}"</em></p>` : ''}
        <p>This invitation will expire in ${params.expiresIn}.</p>
        <a href="${params.invitationLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Accept Invitation</a>
        <p style="font-size: 12px; color: #666;">
          If the button doesn't work, copy and paste this link:<br>
          <a href="${params.invitationLink}">${params.invitationLink}</a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Invitation to join ${params.organizationName} on IriSync`,
      htmlContent,
      category: 'team_invitation'
    });
  }

  /**
   * Send billing reminder email
   */
  async sendBillingReminder(params: {
    to: string;
    companyName: string;
    tier: string;
    stage: 'first' | 'second' | 'final';
    daysRemaining: number;
  }): Promise<EmailResult> {
    const urgencyLevel = {
      first: 'Payment Reminder',
      second: 'Second Notice',
      final: 'Final Notice: Service Suspension Pending'
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4f46e5;">IriSync</h1>
        </div>
        
        <h2 style="color: #dc2626;">Payment Required</h2>
        
        <p>Dear ${params.companyName} team,</p>
        
        <p>Your IriSync ${params.tier} subscription payment is currently overdue. To avoid service interruption, please update your payment method immediately.</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Account Details:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Organization:</strong> ${params.companyName}</li>
            <li><strong>Subscription:</strong> ${params.tier} tier</li>
            ${params.stage === 'final' ? `<li><strong>Service Suspension:</strong> In ${params.daysRemaining} day</li>` : ''}
          </ul>
        </div>
        
        ${params.stage === 'final' ? 
          '<p><strong>⚠️ FINAL NOTICE:</strong> Your service will be suspended tomorrow if payment is not received.</p>' : 
          `<p>Your service will continue for ${params.daysRemaining} more days while we resolve this payment issue.</p>`
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" 
             style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Update Payment Method
          </a>
        </div>
        
        <p>Need help? Contact our billing team at ${process.env.BILLING_EMAIL || 'billing@irisync.io'}</p>
        
        <p>Best regards,<br>The IriSync Billing Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          © ${new Date().getFullYear()} IriSync. All rights reserved.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `${urgencyLevel[params.stage]} - IriSync Subscription`,
      htmlContent,
      priority: params.stage === 'final' ? 'high' : 'normal',
      category: 'billing'
    });
  }

  /**
   * Send account suspension notice
   */
  async sendAccountSuspension(params: {
    to: string;
    companyName: string;
  }): Promise<EmailResult> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4f46e5;">IriSync</h1>
        </div>
        
        <h2 style="color: #dc2626;">Account Suspended</h2>
        
        <p>Dear ${params.companyName} team,</p>
        
        <p>Your IriSync account has been temporarily suspended due to non-payment. All services including AI features, content scheduling, and analytics have been disabled.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" 
             style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Restore Account
          </a>
        </div>
        
        <p><strong>To restore your account:</strong></p>
        <ol>
          <li>Update your payment method</li>
          <li>Your account will be reactivated within 24 hours of payment</li>
        </ol>
        
        <p>Contact ${process.env.BILLING_EMAIL || 'billing@irisync.io'} for assistance.</p>
        
        <p>Best regards,<br>The IriSync Team</p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'IriSync Account Suspended - Payment Required',
      htmlContent,
      priority: 'high',
      category: 'billing'
    });
  }

  /**
   * Send enterprise quote email
   */
  async sendEnterpriseQuote(params: {
    to: string;
    contactName: string;
    companyName: string;
    quoteNumber: string;
    totalPrice: number;
    currency: string;
    validUntil: Date;
    quoteId: string;
    salesRepId?: string;
  }): Promise<EmailResult> {
    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: params.currency
    }).format(params.totalPrice);

    const validUntilDate = params.validUntil.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: #4A5568; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">IriSync Enterprise Quote</h1>
        </div>
        
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #4A5568; margin-top: 0;">Your Enterprise Quote</h2>
          <p>Dear ${params.contactName},</p>
          <p>Thank you for your interest in IriSync Enterprise. We're pleased to provide you with a custom quote:</p>
          
          <div style="background-color: #f7f7f7; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Quote Number:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${params.quoteNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Company:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${params.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 2px solid #e2e8f0;"><strong>Total:</strong></td>
                <td style="padding: 12px 0; border-bottom: 2px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 18px;">${formattedTotal}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Valid Until:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${validUntilDate}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 40px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/quotes/${params.quoteId}/accept" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              Accept Quote
            </a>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>The IriSync Enterprise Team</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `IriSync Enterprise Quote: ${params.quoteNumber}`,
      htmlContent,
      cc: params.salesRepId ? `sales+${params.salesRepId}@irisync.ai` : undefined,
      category: 'enterprise_quote'
    });
  }

  /**
   * Send token purchase confirmation
   */
  async sendTokenPurchaseConfirmation(params: {
    to: string;
    tokenAmount: number;
    price: number;
    currency: string;
    purchaseDate: Date;
  }): Promise<EmailResult> {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: params.currency
    }).format(params.price / 100);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Token Purchase Confirmation</h2>
        <p>Thank you for your token purchase!</p>
        <p><strong>Purchase Details:</strong></p>
        <ul>
          <li>Tokens Purchased: ${params.tokenAmount}</li>
          <li>Amount Paid: ${formattedPrice}</li>
          <li>Purchase Date: ${params.purchaseDate.toLocaleDateString()}</li>
        </ul>
        <p>Your additional tokens have been added to your account and will carry over each month.</p>
        <p>Current Balance: Check your dashboard for updated token balance</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Dashboard
          </a>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'Token Purchase Confirmation - IriSync',
      htmlContent,
      category: 'purchase_confirmation'
    });
  }

  /**
   * Send analytics report
   */
  async sendAnalyticsReport(params: {
    to: string[];
    reportTitle: string;
    reportContent: string;
    dateRange: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
  }): Promise<EmailResult> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">${params.reportTitle}</h2>
        <p><strong>Report Period:</strong> ${params.dateRange}</p>
        <div style="margin: 20px 0;">
          ${params.reportContent}
        </div>
        <p>For detailed analytics, visit your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics">Analytics Dashboard</a>.</p>
        <p>Best regards,<br>The IriSync Team</p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `${params.reportTitle} - ${params.dateRange}`,
      htmlContent,
      attachments: params.attachments,
      category: 'analytics_report'
    });
  }

  /**
   * Get email service status
   */
  getStatus() {
    return {
      primaryProvider: this.primaryProvider.name,
      availableProviders: this.providers.filter(p => p.isConfigured()).map(p => p.name),
      isProduction: process.env.NODE_ENV === 'production'
    };
  }

  private generateNotificationHtml(params: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${params.subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4f46e5; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">IriSync</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">${params.subject}</h2>
              <p style="margin-bottom: 20px;">${params.message}</p>
              ${params.actionUrl && params.actionText ? 
                `<a href="${params.actionUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">${params.actionText}</a>` 
                : ''}
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
              <p>© ${new Date().getFullYear()} IriSync. All rights reserved.</p>
              <p>This email was sent as part of your IriSync account notifications.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateNotificationText(params: any): string {
    let text = `${params.subject}\n\n${params.message}\n\n`;
    
    if (params.actionUrl && params.actionText) {
      text += `${params.actionText}: ${params.actionUrl}\n\n`;
    }
    
    text += `© ${new Date().getFullYear()} IriSync. All rights reserved.\n`;
    text += `This email was sent as part of your IriSync account notifications.`;
    
    return text;
  }
}

// Export singleton instance
const unifiedEmailService = new UnifiedEmailService();
export default unifiedEmailService; 