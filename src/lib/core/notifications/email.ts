import { logger } from '../logging/logger';
import unifiedEmailService, { EmailMessage as UnifiedEmailMessage, EmailResult } from './unified-email-service';

/**
 * Interface for email message configuration (legacy compatibility)
 */
interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Send an email using the unified email service
 * @param message Email message configuration
 * @returns Promise with send result
 */
export async function sendEmail(message: EmailMessage | UnifiedEmailMessage): Promise<EmailResult> {
  try {
    // Convert legacy format to unified format if needed
    const unifiedMessage: UnifiedEmailMessage = 'htmlContent' in message ? 
      message as UnifiedEmailMessage : 
      {
        to: message.to,
        subject: message.subject,
        htmlContent: message.html,
        from: message.from,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments
      };

    const result = await unifiedEmailService.sendEmail(unifiedMessage);
    
    if (!result.success) {
      logger.error('Failed to send email via unified service', { 
        error: result.error,
        provider: result.provider,
        to: unifiedMessage.to,
        subject: unifiedMessage.subject
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Error in email service wrapper', { 
      error: error instanceof Error ? error.message : String(error),
      to: message.to,
      subject: message.subject
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending email',
      provider: 'unified-service-error'
    };
  }
}

/**
 * Send welcome email to new user
 * @param userData User data for welcome email
 */
export async function sendWelcomeEmail(
  userData: {
    email: string;
    name: string;
    verificationUrl?: string;
  }
): Promise<EmailResult> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to IriSync!</h1>
      </div>
      <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1f2937; margin-top: 0;">Hi ${userData.name}!</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          We're excited to have you join IriSync! You're now part of a community that's transforming how businesses manage their social media presence.
        </p>
        
        ${userData.verificationUrl ? `
          <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-weight: 600; color: #0369a1;">Please verify your email address</p>
            <p style="margin: 10px 0 0 0; color: #0369a1;">Click the button below to verify your account and get started:</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${userData.verificationUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
          </div>
        ` : ''}
        
        <h3 style="color: #1f2937; margin-top: 30px;">What's next?</h3>
        <ul style="color: #374151; line-height: 1.6;">
          <li>Connect your social media accounts</li>
          <li>Set up your content calendar</li>
          <li>Explore our AI-powered content tools</li>
          <li>Schedule your first posts</li>
        </ul>
        
        <p style="font-size: 16px; color: #374151; margin-top: 30px;">
          If you have any questions, our support team is here to help. Just reply to this email!
        </p>
        
        <p style="font-size: 16px; color: #374151;">
          Best regards,<br>
          The IriSync Team
        </p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} IriSync. All rights reserved.</p>
        <p style="margin: 5px 0 0 0;">You're receiving this because you signed up for IriSync.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: userData.email,
    subject: `Welcome to IriSync, ${userData.name}!`,
    htmlContent,
    category: 'welcome'
  });
}

/**
 * Send password reset email
 * @param userData User data for password reset
 */
export async function sendPasswordResetEmail(
  userData: {
    email: string;
    name: string;
    resetUrl: string;
    expiresIn: string;
  }
): Promise<EmailResult> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Password Reset Request</h1>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1f2937; margin-top: 0;">Hi ${userData.name},</h2>
        <p style="color: #374151; line-height: 1.6;">
          We received a request to reset your password for your IriSync account. If you didn't make this request, you can safely ignore this email.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${userData.resetUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #991b1b; font-weight: 600;">Security Notice:</p>
          <p style="margin: 5px 0 0 0; color: #991b1b;">This link will expire in ${userData.expiresIn}. After that, you'll need to request a new password reset.</p>
        </div>
        
        <p style="color: #374151; margin-top: 20px; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${userData.resetUrl}" style="color: #4f46e5; word-break: break-all;">${userData.resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: userData.email,
    subject: 'Reset Your IriSync Password',
    htmlContent,
    priority: 'high',
    category: 'security'
  });
}

/**
 * Send email verification link
 * @param email User's email address
 * @param verificationLink Verification link
 * @param name User's name (optional)
 */
export async function sendEmailVerificationLink(email: string, verificationLink: string, name?: string) {
  const subject = 'Verify Your IriSync Email Address';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #4A5568;">Verify Your Email</h1>
      <p>Hello ${name || 'there'},</p>
      <p>Thanks for signing up for IriSync! Please verify your email address to ensure you receive important notifications and can recover your account if needed.</p>
      <p>Click the button below to verify your email. This link will expire in 24 hours.</p>
      <p><a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Verify Email Address</a></p>
      <p>If you didn't create an IriSync account, you can safely ignore this email.</p>
      <p>Best regards,<br>The IriSync Team</p>
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${verificationLink}
      </p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

/**
 * Send invoice email
 * @param email User's email address
 * @param invoiceData Invoice data
 */
export async function sendInvoiceEmail(
  email: string, 
  invoiceData: {
    invoiceNumber: string;
    amount: number;
    date: Date;
    items: Array<{ description: string; amount: number }>;
    pdfUrl?: string;
  }
) {
  const subject = `Invoice #${invoiceData.invoiceNumber} from IriSync`;
  
  // Format date
  const date = invoiceData.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Format items
  const itemsHtml = invoiceData.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item.amount.toFixed(2)}</td>
    </tr>
  `).join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4A5568;">Invoice #${invoiceData.invoiceNumber}</h1>
      <p>Thank you for your business!</p>
      
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 4px;">
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
        <p><strong>Total Amount:</strong> $${invoiceData.amount.toFixed(2)}</p>
        
        <h3>Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left;">Description</th>
              <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 10px; text-align: right;"><strong>Total</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>$${invoiceData.amount.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      ${invoiceData.pdfUrl ? `
        <p>You can <a href="${invoiceData.pdfUrl}">download a PDF copy of this invoice</a> for your records.</p>
      ` : ''}
      
      <p>If you have any questions about this invoice, please contact our support team.</p>
      <p>Best regards,<br>The IriSync Team</p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

/**
 * Send quote request confirmation email
 * @param email Customer's email address
 * @param quoteData Quote request data
 */
export async function sendQuoteRequestEmail(
  email: string,
  quoteData: {
    quoteId: string;
    companyName: string;
    contactName: string;
    serviceType: string;
  }
) {
  const subject = 'Your IriSync Enterprise Quote Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4A5568;">Enterprise Quote Request Received</h1>
      <p>Hello ${quoteData.contactName},</p>
      <p>Thank you for your interest in IriSync Enterprise!</p>
      <p>We have received your quote request for ${quoteData.companyName} and will be reviewing it shortly. A member of our enterprise sales team will contact you within 1-2 business days to discuss your requirements and provide a customized quote.</p>
      <p>Your quote reference number is: <strong>${quoteData.quoteId}</strong></p>
      <p>If you have any immediate questions, please feel free to reply to this email or contact our enterprise sales team.</p>
      <p>Best regards,<br>The IriSync Enterprise Team</p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

/**
 * Send enterprise quote notification to internal team
 * @param quoteData Quote request data
 */
export async function sendInternalQuoteNotification(
  quoteData: {
    quoteId: string;
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    serviceType: string;
    employeeCount: number;
    requirements: string;
    estimatedBudget?: string;
  }
): Promise<EmailResult> {
  const to = process.env.SALES_NOTIFICATION_EMAIL || process.env.ENTERPRISE_SALES_EMAIL || 'sales@irisync.ai';
  const subject = `New Enterprise Quote Request: ${quoteData.companyName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">New Enterprise Quote Request</h1>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 16px;">A new enterprise quote request has been submitted:</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #166534; width: 30%;">Quote ID:</td>
              <td style="padding: 8px 0; color: #166534;">${quoteData.quoteId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #166534;">Company:</td>
              <td style="padding: 8px 0; color: #166534;">${quoteData.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #166534;">Contact:</td>
              <td style="padding: 8px 0; color: #166534;">${quoteData.contactName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #166534;">Email:</td>
              <td style="padding: 8px 0; color: #166534;">${quoteData.email}</td>
            </tr>
            ${quoteData.phone ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #166534;">Phone:</td>
                <td style="padding: 8px 0; color: #166534;">${quoteData.phone}</td>
              </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #166534;">Service Type:</td>
              <td style="padding: 8px 0; color: #166534;">${quoteData.serviceType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #166534;">Employee Count:</td>
              <td style="padding: 8px 0; color: #166534;">${quoteData.employeeCount}</td>
            </tr>
            ${quoteData.estimatedBudget ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #166534;">Budget:</td>
                <td style="padding: 8px 0; color: #166534;">${quoteData.estimatedBudget}</td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="margin: 20px 0;">
          <p style="font-weight: 600; color: #374151;">Requirements:</p>
          <p style="color: #374151; background: #f9fafb; padding: 15px; border-radius: 6px; margin: 0;">${quoteData.requirements}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-weight: 600;">Action Required:</p>
          <p style="margin: 5px 0 0 0; color: #92400e;">Please review and follow up with this customer within 1-2 business days.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ 
    to, 
    subject, 
    htmlContent,
    priority: 'high',
    category: 'sales'
  });
}

// Define the EnterpriseQuoteData type
interface EnterpriseQuoteData {
  quoteId: string;
  companyName: string;
  contactName: string;
}

// Trial related email interfaces
interface TrialWelcomeData {
  tier: string;
  expirationDate: string;
  trialDays: number;
}

interface TrialExpirationData {
  tier: string;
  expirationDate: string;
  hoursRemaining: number;
  upgradeUrl: string;
}

/**
 * Send trial welcome email
 * @param email User's email address
 * @param data Trial welcome data
 */
export async function sendTrialWelcomeEmail(email: string, data: TrialWelcomeData) {
  const subject = `Welcome to Your ${data.tier} Tier 7-Day Trial`;
  
  // Format date for display
  const expirationDate = new Date(data.expirationDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #4A5568;">Welcome to Your IriSync ${data.tier} Trial!</h1>
      <p>Hello,</p>
      <p>Thank you for starting your 7-day trial of IriSync's ${data.tier} tier! Your trial gives you full access to all ${data.tier} features until ${expirationDate}.</p>
      
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 4px; background-color: #f8fafc;">
        <p><strong>Trial Details:</strong></p>
        <p>• Tier: ${data.tier}</p>
        <p>• Duration: 7 days</p>
        <p>• Expiration: ${expirationDate}</p>
        <p>• Payment: Your card will be automatically charged when your trial ends unless you cancel.</p>
      </div>
      
      <p>To make the most of your trial:</p>
      <ul>
        <li>Connect your social media accounts</li>
        <li>Try creating content with our AI tools</li>
        <li>Explore the analytics dashboard</li>
        <li>Schedule your first posts</li>
      </ul>
      
      <p>
        <a href="https://irisync.ai/dashboard" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Dashboard</a>
      </p>
      
      <p>If you have any questions during your trial, our support team is here to help.</p>
      <p>Best regards,<br>The IriSync Team</p>
      
      <p style="font-size: 12px; color: #718096; margin-top: 30px;">
        Note: At the end of your trial period, your payment method will be automatically charged for the ${data.tier} tier subscription unless you cancel before ${expirationDate}.
      </p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

/**
 * Send trial expiration reminder email
 * @param email User's email address
 * @param data Trial expiration data
 */
export async function sendTrialExpirationReminderEmail(email: string, data: TrialExpirationData) {
  const subject = `Your IriSync Trial Ends in ${data.hoursRemaining <= 24 ? '24 Hours' : 'Soon'}`;
  
  // Format date for display
  const expirationDate = new Date(data.expirationDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #4A5568;">Your Trial is Ending Soon</h1>
      <p>Hello,</p>
      <p>This is a reminder that your 7-day trial of IriSync's ${data.tier} tier will end on <strong>${expirationDate}</strong>.</p>
      
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 4px; background-color: #fff8f0;">
        <p><strong>Important:</strong> When your trial ends, your payment method will be automatically charged for the ${data.tier} tier subscription.</p>
        <p>• If you're enjoying IriSync, no action is needed – you'll automatically transition to a paid subscription.</p>
        <p>• If you wish to cancel, please do so before ${expirationDate} to avoid being charged.</p>
      </div>
      
      <p>
        <a href="${data.upgradeUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">Continue with ${data.tier} Tier</a>
        <a href="https://irisync.ai/settings/subscription" style="background-color: #f8f9fa; color: #333; border: 1px solid #ddd; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Manage Subscription</a>
      </p>
      
      <p>We hope you've enjoyed your trial experience with IriSync. If you have any questions or need assistance, our support team is here to help.</p>
      <p>Best regards,<br>The IriSync Team</p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

// For the enterprise quote request confirmation email
export async function sendEnterpriseQuoteRequestConfirmationEmail(email: string, quoteData: EnterpriseQuoteData) {
  const subject = 'Your IriSync Enterprise Quote Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4A5568;">Enterprise Quote Request Received</h1>
      <p>Hello ${quoteData.contactName},</p>
      <p>Thank you for your interest in IriSync Enterprise!</p>
      <p>We have received your quote request for ${quoteData.companyName} and will be reviewing it shortly. A member of our enterprise sales team will contact you within 1-2 business days to discuss your requirements and provide a customized quote.</p>
      <p>Your quote reference number is: <strong>${quoteData.quoteId}</strong></p>
      <p>If you have any immediate questions, please feel free to reply to this email or contact our enterprise sales team.</p>
      <p>If you have any additional information to share or questions about the process, please reply to this email.</p>
      <p>Best regards,<br>The IriSync Enterprise Team</p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

/**
 * Send testimonial request email to users who have renewed their subscription
 * @param email User's email address
 * @param name User's name
 * @param tier Subscription tier
 * @param passcode Unique passcode for testimonial submission
 */
export async function sendTestimonialRequestEmail(
  email: string,
  name: string,
  tier: string,
  passcode: string
) {
  const subject = 'Share Your IriSync Experience';
  const testimonialUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/testimonial?passcode=${passcode}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #4A5568;">Your Feedback Matters</h1>
      <p>Hello ${name},</p>
      <p>Thank you for continuing to use IriSync! We're excited that you've chosen to stay with us for another month on our ${tier} plan.</p>
      <p>We'd love to hear about your experience with IriSync. How has our platform helped you manage your social media presence?</p>
      <p>Your insights are invaluable to us and could help others make informed decisions about their social media management tools.</p>
      <div style="background-color: #f8faff; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="font-weight: bold; margin-top: 0;">Would you be willing to share a testimonial?</p>
        <p>We may feature your feedback on our website (with your permission, of course).</p>
        <a href="${testimonialUrl}" style="display: inline-block; background-color: #4A5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">Share Your Testimonial</a>
      </div>
      <p>Thank you for being a valued member of our community!</p>
      <p>Best regards,<br>The IriSync Team</p>
      <p style="font-size: 12px; color: #666; margin-top: 30px;">This is a personalized invitation link sent only to you. Please do not share this link.</p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

/**
 * Send support ticket creation email to user
 */
export async function sendTicketCreatedEmail(email: string, ticket: { subject: string; message: string; priority: string; id?: string }) {
  const subject = `Support Ticket Created: ${ticket.subject}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #4A5568;">Your Support Ticket Has Been Created</h1>
      <p>Thank you for contacting IriSync support. Your ticket has been received and our team will respond as soon as possible.</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f7fafc; padding: 12px; border-radius: 6px;">${ticket.message}</div>
      <p>You can view your ticket in your <a href="${process.env.NEXT_PUBLIC_BASE_URL}/support/tickets">Support Center</a>.</p>
      <p>Best regards,<br>The IriSync Support Team</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
}

/**
 * Send support ticket update email to user
 */
export async function sendTicketUpdatedEmail(email: string, ticket: { subject: string; status: string; adminMessage?: string; priority?: string; id?: string }) {
  const subject = `Support Ticket Updated: ${ticket.subject}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #4A5568;">Your Support Ticket Has Been Updated</h1>
      <p>Your ticket <strong>${ticket.subject}</strong> has been updated. Status: <strong>${ticket.status}</strong>.</p>
      ${ticket.priority ? `<p><strong>Priority:</strong> ${ticket.priority}</p>` : ''}
      ${ticket.adminMessage ? `<p><strong>Support Team Message:</strong></p><div style="background: #f7fafc; padding: 12px; border-radius: 6px;">${ticket.adminMessage}</div>` : ''}
      <p>You can view your ticket in your <a href="${process.env.NEXT_PUBLIC_BASE_URL}/support/tickets">Support Center</a>.</p>
      <p>Best regards,<br>The IriSync Support Team</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
}

/**
 * Send support ticket closure email to user
 */
export async function sendTicketClosedEmail(email: string, ticket: { subject: string; id?: string }) {
  const subject = `Support Ticket Closed: ${ticket.subject}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #4A5568;">Your Support Ticket Has Been Closed</h1>
      <p>Your ticket <strong>${ticket.subject}</strong> has been marked as closed. If you have further questions, you can reply to this email or open a new ticket.</p>
      <p>Thank you for using IriSync support.</p>
      <p>Best regards,<br>The IriSync Support Team</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
}

/**
 * Get email service status
 */
export function getEmailServiceStatus() {
  return unifiedEmailService.getStatus();
} 