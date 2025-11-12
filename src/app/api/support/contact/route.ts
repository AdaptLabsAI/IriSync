import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/core/notifications/email';
import { logger } from '@/lib/core/logging/logger';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { name, email, inquiryType, subject, message } = body;

    // Validate required fields
    if (!name || !email || !inquiryType || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Determine where to send the email based on environment variables
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@irisync.com';
    const fromEmail = process.env.EMAIL_FROM || 'noreply@irisync.com';

    // Create HTML email content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h1 style="color: #00C957;">IriSync Support Inquiry</h1>
        <p><strong>Type:</strong> ${inquiryType}</p>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #00C957; border-radius: 4px;">
          <strong>Message:</strong>
          <p style="white-space: pre-line;">${message}</p>
        </div>
      </div>
    `;

    // Send email to support
    const result = await sendEmail({
      to: supportEmail,
      from: `"IriSync Contact Form" <${fromEmail}>`,
      subject: `IriSync Support: ${inquiryType} - ${subject}`,
      html
    });

    if (!result.success) {
      logger.error('Failed to send contact form email', { 
        error: result.error,
        email,
        subject
      });
      
      return NextResponse.json(
        { error: 'Failed to send your message. Please try again later.' },
        { status: 500 }
      );
    }

    // Send confirmation email to the user
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h1 style="color: #00C957;">We've Received Your Message</h1>
        <p>Hello ${name},</p>
        <p>Thank you for contacting IriSync Support. This email confirms that we've received your message about "${subject}".</p>
        <p>Our team will review your inquiry and get back to you as soon as possible. Your inquiry reference is: <strong>${new Date().getTime().toString(36).toUpperCase()}</strong></p>
        <p>For your reference, here's a copy of your message:</p>
        <div style="margin-top: 15px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #00C957; border-radius: 4px;">
          <p style="white-space: pre-line;">${message}</p>
        </div>
        <p style="margin-top: 20px;">Best regards,<br>The IriSync Support Team</p>
      </div>
    `;

    await sendEmail({
      to: email,
      from: `"IriSync Support" <${fromEmail}>`,
      subject: `IriSync Support: We've received your inquiry`,
      html: confirmationHtml
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in contact form API route', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
} 