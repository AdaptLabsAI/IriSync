import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { z } from 'zod';
import unifiedEmailService from '@/lib/core/notifications/unified-email-service';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Email validation schema
const emailRequestSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  sendAt: z.string().optional(), // ISO date string for scheduled emails
  templateId: z.string().optional(),
  templateData: z.record(z.any()).optional()
});

type EmailRequest = z.infer<typeof emailRequestSchema>;

/**
 * POST handler for sending bulk emails to users
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = emailRequestSchema.parse(body);

    // Get user information for recipients
    const recipients = [];
    const notFoundUsers = [];

    for (const userId of validatedData.userIds) {
      try {
        const firestore = getFirebaseFirestore();
        if (!firestore) {
          return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if user has opted out of emails
          if (userData.emailPreferences?.marketing === false && validatedData.priority !== 'high') {
            logger.info('Skipping user who opted out of marketing emails', { userId });
            continue;
          }

          recipients.push({
            email: userData.email,
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
            templateData: validatedData.templateData || {}
          });
        } else {
          notFoundUsers.push(userId);
        }
      } catch (error) {
        logger.error('Error fetching user data', { userId, error });
        notFoundUsers.push(userId);
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        error: 'No valid recipients found',
        details: { notFoundUsers }
      }, { status: 400 });
    }

    // Send emails using the unified email service
    const emailResult = await unifiedEmailService.sendBulkEmail({
      recipients,
      subject: validatedData.subject,
      htmlContent: validatedData.htmlContent,
      textContent: validatedData.textContent,
      priority: validatedData.priority,
      sendAt: validatedData.sendAt ? new Date(validatedData.sendAt) : undefined,
      templateId: validatedData.templateId,
      templateData: validatedData.templateData,
      category: 'admin_bulk_email'
    });

    // Log email campaign in database
    const campaignData = {
      messageId: emailResult.messageId,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      subject: validatedData.subject,
      recipientCount: recipients.length,
      notFoundUserCount: notFoundUsers.length,
      priority: validatedData.priority,
      status: emailResult.success ? (validatedData.sendAt ? 'scheduled' : 'sent') : 'failed',
      scheduledAt: validatedData.sendAt ? new Date(validatedData.sendAt) : null,
      sentAt: emailResult.success && !validatedData.sendAt ? new Date() : null,
      errorMessage: emailResult.error || null,
      provider: emailResult.provider,
      createdAt: serverTimestamp(),
      recipients: recipients.map(r => ({
        email: r.email,
        name: r.name
      })),
      content: {
        subject: validatedData.subject,
        htmlContent: validatedData.htmlContent,
        textContent: validatedData.textContent
      },
      templateInfo: validatedData.templateId ? {
        templateId: validatedData.templateId,
        templateData: validatedData.templateData
      } : null
    };

    // Save campaign to database
    const campaignRef = await addDoc(collection(firestore, 'emailCampaigns'), campaignData);

    // Log admin action
    logger.info('Admin sent bulk email', {
      adminId: adminUser.id,
      campaignId: campaignRef.id,
      recipientCount: recipients.length,
      subject: validatedData.subject,
      success: emailResult.success,
      provider: emailResult.provider
    });

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to send emails',
        details: {
          provider: emailResult.provider,
          error: emailResult.error,
          campaignId: campaignRef.id
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaignId: campaignRef.id,
      messageId: emailResult.messageId,
      recipientCount: recipients.length,
      notFoundUserCount: notFoundUsers.length,
      status: validatedData.sendAt ? 'scheduled' : 'sent',
      provider: emailResult.provider,
      details: {
        notFoundUsers: notFoundUsers.length > 0 ? notFoundUsers : undefined
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }

    logger.error('Error in admin email communications handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });

    return NextResponse.json(
      { 
        error: 'Failed to send bulk email',
        message: 'An unexpected error occurred while sending the email. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * GET handler for retrieving email campaign history and service status
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const limitValue = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const action = searchParams.get('action');

    // If requesting service status
    if (action === 'status') {
      const emailStatus = unifiedEmailService.getStatus();
      return NextResponse.json({
        emailService: emailStatus,
        timestamp: new Date().toISOString()
      });
    }

    // Build query for email campaigns
    const constraints = [];

    // Add status filter if provided
    if (status) {
      constraints.push(where('status', '==', status));
    }

    // Add ordering and limit
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(limitValue));

    // Build the final query
    const campaignsQuery = query(collection(firestore, 'emailCampaigns'), ...constraints);

    // Execute query
    const campaignsSnapshot = await getDocs(campaignsQuery);

    // Format campaigns data
    const campaigns = campaignsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        messageId: data.messageId,
        subject: data.subject,
        recipientCount: data.recipientCount,
        notFoundUserCount: data.notFoundUserCount || 0,
        status: data.status,
        priority: data.priority,
        adminEmail: data.adminEmail,
        provider: data.provider || 'unknown',
        errorMessage: data.errorMessage || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || data.sentAt,
        scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() || data.scheduledAt,
        hasTemplate: !!data.templateInfo?.templateId
      };
    });

    logger.info('Admin fetched email campaigns', {
      adminId: adminUser.id,
      campaignCount: campaigns.length,
      status
    });

    return NextResponse.json({
      campaigns,
      total: campaigns.length,
      emailService: unifiedEmailService.getStatus()
    });

  } catch (error) {
    logger.error('Error fetching email campaigns', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });

    return NextResponse.json(
      { 
        error: 'Failed to fetch email campaigns',
        message: 'An unexpected error occurred while fetching email campaigns.'
      },
      { status: 500 }
    );
  }
}); 