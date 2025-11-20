import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getAuth } from '@/lib/core/firebase/admin';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { withAuth, withAdmin } from '@/lib/features/auth/route-handlers';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';
import type { AuthUser } from '@/lib/features/auth/token';
import { SubscriptionTier, SubscriptionTierValues } from '@/lib/core/models/User';
import ForumService from '@/lib/features/content/ForumService';
import { sendEmail } from '@/lib/core/notifications/email';
import { NotificationService, NotificationPriority, NotificationCategory, NotificationChannel } from '@/lib/core/notifications/NotificationService';
import { sendTicketCreatedEmail, sendTicketUpdatedEmail, sendTicketClosedEmail } from '@/lib/core/notifications/email';
import { notifySlack, notifyCRM, notifyEmail } from '@/lib/core/notifications/integrations';
import { Parser } from '@json2csv/plainjs';
import { ChatbotService, UserTier } from '@/lib/features/support/chatbot-service';
import { AIProviderFactory } from '@/lib/features/ai/providers/AIProviderFactory';
import { ProviderType } from '@/lib/features/ai/providers/ProviderType';
import { TokenService } from '@/lib/features/tokens/token-service';
import { AIProvider } from '@/lib/features/ai/providers/AIProvider';
import { Ticket, convertFirestoreTicket } from '@/lib/features/support/models';
import { TokenRepository } from '@/lib/features/tokens/token-repository';
import { firestore as adminFirestore } from '@/lib/core/firebase/admin';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


const TICKETS_COLLECTION = 'supportTickets';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

// Ticket schema
const createTicketSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
  displayName: z.string().max(50).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
});

const updateTicketSchema = z.object({
  status: z.enum(['open', 'pending', 'closed', 'converted']).optional(),
  adminNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  convertedToForum: z.boolean().optional(),
  forumPostId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  firstResponseAt: z.any().optional(),
  closedAt: z.any().optional(),
  satisfactionRating: z.number().min(1).max(5).optional(),
  satisfactionComment: z.string().max(500).optional(),
  escalated: z.boolean().optional(),
  escalationLevel: z.number().optional(),
  action: z.enum(['confirmAiResolution']).optional(),
});

async function logAdminAction(adminUser: AuthUser, action: string, details: any) {
  try {
    const adminFirestore = firestore;
    const logRef = doc(collection(adminFirestore, AUDIT_LOGS_COLLECTION));
    await setDoc(logRef, {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: adminUser.role,
      action,
      details,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error, action, adminId: adminUser.id });
  }
}

async function logTicketEvent(userId: string, organizationId: string | undefined, ticketId: string, action: string, details: any) {
  try {
    const adminDb = adminFirestore;
    const logRef = adminDb.collection('ticketEvents').doc();
    await setDoc(logRef as any, {
      userId,
      organizationId,
      ticketId,
      action,
      details,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    logger.error('Failed to create ticket event log', { error, action, userId, ticketId, organizationId });
  }
}

async function autoEscalateOldTickets() {
  const now = Date.now();
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), where('status', '==', 'open'));
  const snapshot = await getDocs(ticketsQuery);
  for (const docSnap of snapshot.docs) {
    const tData = docSnap.data();
    const created = tData.createdAt?.seconds ? tData.createdAt.seconds * 1000 : Date.parse(tData.createdAt);
    if (!tData.firstResponseAt && !tData.closedAt && now - created > 48 * 3600 * 1000 && !tData.escalated) {
      await updateDoc(doc(firestore, TICKETS_COLLECTION, docSnap.id), {
        escalated: true,
        escalationLevel: 1,
        assignedTo: 'escalation_team',
        updatedAt: Timestamp.now(),
      });
      const ticketForNotification = convertFirestoreTicket(tData, docSnap.id);
      await notifySlack(`Ticket escalated: ${ticketForNotification.subject}`, ticketForNotification);
      await notifyCRM(`Ticket escalated: ${ticketForNotification.subject}`, ticketForNotification);
    }
  }
}

// GET: List tickets (user: own, admin: all)
export const GET = async (request: NextRequest) => {
  await autoEscalateOldTickets();
  try {
    const auth = getAuth();
    let token = request.headers.get('authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    let user: AuthUser | null = null;
    if (typeof token === 'string' && token.length > 0) {
      const decoded = await auth.verifyIdToken(token);
      user = {
        id: decoded.uid,
        email: decoded.email || '',
        firstName: '',
        lastName: '',
        role: decoded.role || '',
        subscriptionTier: SubscriptionTierValues.NONE,
        organizationId: decoded.organizationId || ''
      };
    }
    if (!request.url) {
      return NextResponse.json({ error: 'Request URL is required' }, { status: 400 });
    }
    const url = new URL(request.url as string, 'http://localhost'); // base required for relative URLs
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    // Parse filters
    const status = url.searchParams.get('status');
    const subject = url.searchParams.get('subject');
    const priority = url.searchParams.get('priority');
    const userId = url.searchParams.get('userId');
    const assignedTo = url.searchParams.get('assignedTo');
    const tag = url.searchParams.get('tag');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    let ticketsQuery;
    const filters = [];
    if (status) filters.push(where('status', '==', status));
    if (priority) filters.push(where('priority', '==', priority));
    if (userId) filters.push(where('userId', '==', userId));
    if (assignedTo) filters.push(where('assignedTo', '==', assignedTo));
    // For tag, we filter after fetch (Firestore doesn't support array-contains-any for dynamic tags)
    // For subject, we filter after fetch (Firestore doesn't support contains on string fields)
    if (isAdmin) {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

      ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), ...filters, orderBy('createdAt', 'desc'));
    } else if (user) {
      ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), where('userId', '==', user.id), ...filters, orderBy('createdAt', 'desc'));
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const snapshot = await getDocs(ticketsQuery);
    let tickets: Ticket[] = snapshot.docs.map(doc => convertFirestoreTicket(doc.data(), doc.id));
    if (subject) {
      tickets = tickets.filter((t: any) => t.subject && t.subject.toLowerCase().includes(subject.toLowerCase()));
    }
    if (tag) {
      tickets = tickets.filter((t: any) => Array.isArray(t.tags) && t.tags.includes(tag));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      tickets = tickets.filter((t: any) => t.createdAt && new Date(String(t.createdAt)).getTime() >= from.getTime());
    }
    if (dateTo) {
      const to = new Date(dateTo);
      tickets = tickets.filter((t: any) => t.createdAt && new Date(String(t.createdAt)).getTime() <= to.getTime());
    }
    return NextResponse.json({ tickets });
  } catch (error) {
    logger.error('Error fetching support tickets', { error });
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
};

// PATCH: Update a ticket (admin or user satisfaction)
export const PATCH = async (request: NextRequest) => {
  await autoEscalateOldTickets();
  try {
    const auth = getAuth();
    let token = request.headers.get('authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    let user: AuthUser | null = null;
    if (typeof token === 'string' && token.length > 0) {
      const decoded = await auth.verifyIdToken(token);
      user = {
        id: decoded.uid,
        email: decoded.email || '',
        firstName: '',
        lastName: '',
        role: decoded.role || '',
        subscriptionTier: SubscriptionTierValues.NONE,
        organizationId: decoded.organizationId || ''
      };
    }
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    const body = await request.json();
    const { ticketId, categoryId, ...updateFields } = body;
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId required' }, { status: 400 });
    }
    const validation = updateTicketSchema.safeParse(updateFields);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation error', details: validation.error.format() }, { status: 400 });
    }
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const ticketRef = doc(firestore, TICKETS_COLLECTION, ticketId);
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    const ticket = ticketSnap.data();
    // User satisfaction rating (only if closed and user is owner)
    if (updateFields.satisfactionRating || updateFields.satisfactionComment) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (ticket.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (ticket.status !== 'closed') {
        return NextResponse.json({ error: 'Can only rate closed tickets' }, { status: 400 });
      }
      await updateDoc(ticketRef, {
        satisfactionRating: updateFields.satisfactionRating,
        satisfactionComment: updateFields.satisfactionComment,
        updatedAt: Timestamp.now(),
      });
      await notifySlack(`Support ticket updated: ${ticket.subject}`, { ...ticket, ...updateFields });
      await notifyCRM(`Support ticket updated: ${ticket.subject}`, { ...ticket, ...updateFields });
      if (user) {
        await logAdminAction(user, 'SUBMIT_TICKET_SATISFACTION', { ticketId, satisfactionRating: updateFields.satisfactionRating, satisfactionComment: updateFields.satisfactionComment });
      }
      return NextResponse.json({ message: 'Satisfaction submitted' });
    }
    // User confirms AI resolution
    if (updateFields.action === 'confirmAiResolution') {
      if (!user || ticket.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized to confirm AI resolution for this ticket' }, { status: 403 });
      }
      if (!ticket.aiSuggestionProvided) {
        return NextResponse.json({ error: 'No AI suggestion was provided for this ticket' }, { status: 400 });
      }
      await updateDoc(ticketRef, {
        status: 'closed',
        closedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        aiResolutionConfirmedByUser: true,
      });
      // Optionally, trigger satisfaction survey or log event
      if (user) {
          await logAdminAction(user, 'CONFIRM_AI_RESOLUTION', { ticketId });
      }
      // Send notification that ticket is now closed by user confirmation
      const userDoc = await getDoc(doc(firestore, 'users', ticket.userId));
      const userEmail = userDoc.exists() ? userDoc.data().email : '';
      if (userEmail) {
          await sendTicketClosedEmail(userEmail, { subject: ticket.subject, id: ticketId });
      }
      return NextResponse.json({ message: 'AI resolution confirmed, ticket closed.' });
    }
    // Handle conversion to forum
    if (updateFields.convertedToForum && updateFields.status === 'converted') {
      // Require categoryId
      if (!categoryId) {
        return NextResponse.json({ error: 'categoryId required for forum conversion' }, { status: 400 });
      }
      // Ensure category exists, or create 'Support' if not
      let forumCategoryId = categoryId;
      let category = await ForumService.getCategoryById(categoryId);
      if (!category) {
        // Create default 'Support' category
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const supportCategory = await ForumService.createCategory(
          'Support',
          'General support and help topics',
          user.id
        );
        forumCategoryId = supportCategory.id;
      }
      // Get user profile for name if needed
      let authorName = ticket.displayName;
      if (!authorName) {
        // Fetch user profile
        const userDocRef = doc(firestore, 'users', ticket.userId);
        const userDoc = await getDoc(userDocRef);
        authorName = userDoc.exists() ? userDoc.data().firstName + ' ' + userDoc.data().lastName : 'Anonymous';
      }
      // Create forum post
      const forumPost = await ForumService.createPost(
        {
          title: ticket.subject,
          content: ticket.message,
          categoryId: forumCategoryId,
          tags: [],
        },
        ticket.userId,
        authorName
      );
      // Update ticket with forum info
      const forumPostUrl = `/support/support/forum/${forumPost.id}`;
      const updateData = {
        ...validation.data,
        convertedToForum: true,
        status: 'converted',
        forumPostId: forumPost.id,
        forumPostUrl,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(ticketRef, updateData);
      if (user) {
        await logAdminAction(user, 'CONVERT_TICKET_TO_FORUM', { ticketId, forumPostId: forumPost.id, categoryId: forumCategoryId });
      }
      // Send notification (email and/or in-app)
      try {
        const userDocRef = doc(firestore, 'users', ticket.userId);
        const userDoc = await getDoc(userDocRef);
        const userEmail = userDoc.exists() ? userDoc.data().email : '';
        if (userEmail) {
          await sendEmail({
            to: userEmail,
            subject: 'Your Support Ticket Has Been Transitioned to the Forum',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <h1 style="color: #00C957;">IriSync Support Update</h1>
                <p>Hi${authorName ? ' ' + authorName.split(' ')[0] : ''},</p>
                <p>Your recent support ticket ("<strong>${ticket.subject}</strong>") was reviewed and found to contain no sensitive information. To help you get broader support from the community and our team, we've moved your ticket to the public forum.</p>
                <p>You can view and participate in the discussion here: <a href="${process.env.NEXT_PUBLIC_BASE_URL}${forumPostUrl}">${process.env.NEXT_PUBLIC_BASE_URL}${forumPostUrl}</a></p>
                <p>If you have any concerns, just reply to this email or open a new private ticket.</p>
                <p style="margin-top: 20px;">— Iris, your friendly IriSync assistant</p>
              </div>
            `
          });
        }
      } catch (err) {
        logger.error('Failed to send forum conversion email', { error: err, ticketId });
      }

      // Fetch the fully updated ticket for notifications
      const finalTicketSnap = await getDoc(ticketRef);
      const finalTicketData = finalTicketSnap.exists() ? convertFirestoreTicket(finalTicketSnap.data(), finalTicketSnap.id) : null;

      if (finalTicketData) {
        await notifySlack(`Ticket converted to forum: ${finalTicketData.subject}`, finalTicketData);
        await notifyCRM(`Ticket converted to forum: ${finalTicketData.subject}`, finalTicketData);
      } else {
        // Fallback or log error if finalTicketData is null, though it should exist
        logger.warn('finalTicketData was null during forum conversion notification, using potentially incomplete data', { ticketId });
        const fallbackNotificationData = {
            id: ticketId,
            subject: ticket.subject || 'N/A',
            message: ticket.message || 'N/A',
            description: ticket.message || 'N/A',
            type: 'general' as const,
            createdBy: ticket.userId,
            // Spread validated update fields. updateData.status should be 'converted'
            ...updateData,
            // Include necessary fields from raw ticket data
            userId: ticket.userId,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt
        };
        await notifySlack(`Ticket converted to forum: ${fallbackNotificationData.subject}`, fallbackNotificationData);
        await notifyCRM(`Ticket converted to forum: ${fallbackNotificationData.subject}`, fallbackNotificationData);
      }
      return NextResponse.json({ message: 'Ticket converted to forum', forumPostUrl });
    }
    // ...existing update logic for non-conversion PATCH...
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    // Update ticket
    const updateDataWithTimestamp = { ...validation.data, updatedAt: Timestamp.now() };
    await updateDoc(ticketRef, updateDataWithTimestamp);

    // Fetch the fully updated ticket for notifications
    const updatedTicketSnap = await getDoc(ticketRef);
    const updatedTicketData = updatedTicketSnap.exists() ? convertFirestoreTicket(updatedTicketSnap.data(), updatedTicketSnap.id) : null;

    if (updatedTicketData) {
        // Fetch user email
        const ticketUserDoc = await getDoc(doc(firestore, 'users', updatedTicketData.userId));
        const ticketUserData = ticketUserDoc.exists() ? ticketUserDoc.data() : null;
        const ticketUserEmail = ticketUserData ? ticketUserData.email : (user ? user.email : '');

        // Send notifications based on status
        if (ticketUserEmail) {
            if (updatedTicketData.status === 'closed') {
                await sendTicketClosedEmail(ticketUserEmail, { subject: updatedTicketData.subject, id: ticketId });
            } else {
                await sendTicketUpdatedEmail(ticketUserEmail, {
                    subject: updatedTicketData.subject,
                    status: String(updatedTicketData.status),
                    adminMessage: validation.data.adminNotes,
                    priority: String(updatedTicketData.priority),
                    id: ticketId
                });
            }
        }
        // In-app notification
        await new NotificationService().sendNotification({
            userId: updatedTicketData.userId,
            title: 'Support Ticket Updated',
            message: `Your support ticket "${updatedTicketData.subject}" has been updated. Status: ${updatedTicketData.status}.`,
            priority: NotificationPriority.MEDIUM,
            category: NotificationCategory.SYSTEM,
            actionUrl: `/support/tickets`,
            actionText: 'View Ticket',
            metadata: { ticketId }
        }, NotificationChannel.IN_APP);

        await notifySlack(`Support ticket updated: ${updatedTicketData.subject}`, updatedTicketData);
        await notifyCRM(`Support ticket updated: ${updatedTicketData.subject}`, updatedTicketData);
    }

    if (user) {
        await logAdminAction(user, 'UPDATE_TICKET', { ticketId, updateFields: validation.data });
    }
    return NextResponse.json({ message: 'Ticket updated' });
  } catch (error) {
    logger.error('Error updating support ticket', { error });
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
};

// DELETE: Delete/close a ticket (admin only)
export const DELETE = withAdmin(async (request: NextRequest, adminUser: AuthUser) => {
  try {
    const url = new URL(request.url);
    const ticketId = url.searchParams.get('ticketId');
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId required' }, { status: 400 });
    }
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const ticketRef = doc(firestore, TICKETS_COLLECTION, ticketId);
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    await deleteDoc(ticketRef);
    await logAdminAction(adminUser, 'DELETE_TICKET', { ticketId });
    return NextResponse.json({ message: 'Ticket deleted' });
  } catch (error) {
    logger.error('Error deleting support ticket', { error });
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
});

// Unified POST handler for ticket creation (user) and admin bulk/duplicate/merge actions
export const POST = async (request: NextRequest) => {
  // Check for admin token
  const auth = getAuth();
  let token = request.headers.get('authorization');
  if (token && token.startsWith('Bearer ')) {
    token = token.replace('Bearer ', '');
  }
  let user: AuthUser | null = null;
  if (typeof token === 'string' && token.length > 0) {
    const decoded = await auth.verifyIdToken(token);
    user = {
      id: decoded.uid,
      email: decoded.email || '',
      firstName: '',
      lastName: '',
      role: decoded.role || '',
      subscriptionTier: SubscriptionTierValues.NONE,
      organizationId: decoded.organizationId || ''
    };
  }
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  try {
    const body = await request.json();
    // Admin: Bulk actions, duplicate detection, merge
    if (isAdmin) {
      // Bulk actions
      if (body.action && Array.isArray(body.ticketIds)) {
        const { action, ticketIds, assignedTo } = body;
        let results = [];
        for (const ticketId of ticketIds) {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

          const ticketRef = doc(firestore, TICKETS_COLLECTION, ticketId);
          const ticketSnap = await getDoc(ticketRef);
          if (!ticketSnap.exists()) continue;
          if (action === 'close') {
            await updateDoc(ticketRef, { status: 'closed', closedAt: Timestamp.now(), updatedAt: Timestamp.now() });
          } else if (action === 'assign' && assignedTo) {
            await updateDoc(ticketRef, { assignedTo, updatedAt: Timestamp.now() });
          } else if (action === 'delete') {
            await deleteDoc(ticketRef);
          }
          results.push(ticketId);
        }
        return NextResponse.json({ message: 'Bulk action complete', results });
      }
      // Duplicate detection
      if (body.duplicateCheck) {
        const { subject, message } = body;
        const ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(ticketsQuery);
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const possibleDuplicates = tickets.filter((t: any) =>
          (subject && t.subject && t.subject.toLowerCase() === subject.toLowerCase()) ||
          (message && t.message && t.message.toLowerCase().includes(message.toLowerCase()))
        );
        return NextResponse.json({ possibleDuplicates });
      }
      // Merge tickets
      if (body.mergeTickets && Array.isArray(body.ticketIds) && body.ticketIds.length === 2) {
        const [primaryId, duplicateId] = body.ticketIds;
        const primaryRef = doc(firestore, TICKETS_COLLECTION, primaryId);
        const duplicateRef = doc(firestore, TICKETS_COLLECTION, duplicateId);
        const primarySnap = await getDoc(primaryRef);
        const duplicateSnap = await getDoc(duplicateRef);
        if (!primarySnap.exists() || !duplicateSnap.exists()) {
          return NextResponse.json({ error: 'One or both tickets not found' }, { status: 404 });
        }
        const primary = primarySnap.data();
        const duplicate = duplicateSnap.data();
        const mergedMessages = [
          ...(Array.isArray(primary.messages) ? primary.messages : []),
          ...(Array.isArray(duplicate.messages) ? duplicate.messages : [])
        ];
        const mergedTags = Array.from(new Set([...(primary.tags || []), ...(duplicate.tags || [])]));
        const mergedNotes = [primary.internalNotes, duplicate.internalNotes].filter(Boolean).join('\n---\n');
        await updateDoc(primaryRef, {
          messages: mergedMessages,
          tags: mergedTags,
          internalNotes: mergedNotes,
          updatedAt: Timestamp.now(),
        });
        await updateDoc(duplicateRef, { status: 'closed', closedAt: Timestamp.now(), updatedAt: Timestamp.now(), mergedInto: primaryId });
        return NextResponse.json({ message: 'Tickets merged', primaryId, duplicateId });
      }
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    // User: Ticket creation
    if (user) {
      const orgId = user.currentOrganizationId || user.personalOrganizationId;
      if (!orgId) {
        logger.warn('User attempted to create ticket without an organization association', { userId: user.id });
        return NextResponse.json({ error: 'You must be part of an organization to create a support ticket.' }, { status: 403 });
      }

      const validation = createTicketSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: 'Validation error', details: validation.error.format() }, { status: 400 });
      }
      const now = Timestamp.now();
      const ticketRef = doc(collection(firestore, TICKETS_COLLECTION));
      const ticketData = {
        userId: user.id,
        subject: validation.data.subject,
        message: validation.data.message,
        displayName: validation.data.displayName || '',
        status: 'open',
        isPrivate: true,
        convertedToForum: false,
        createdAt: now,
        updatedAt: now,
        priority: validation.data.priority || 'medium',
        tags: validation.data.tags || [],
        assignedTo: validation.data.assignedTo || '',
        aiSuggestionProvided: false,
        aiSuggestedAnswer: '',
        organizationId: orgId,
      };
      await setDoc(ticketRef, ticketData);
      await logTicketEvent(user.id, orgId, ticketRef.id, 'CREATE_TICKET', { subject: ticketData.subject, priority: ticketData.priority });

      // Fetch user email
      const userDoc = await getDoc(doc(firestore, 'users', user.id));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const userEmail = userData ? userData.email : user.email;

      // Get organization data
      let userTier: UserTier = UserTier.CREATOR; // Default tier
      
      if (orgId) {
        try {
          const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
          const orgData = orgDoc.exists() ? orgDoc.data() : null;
          
          if (orgData && orgData.billing && orgData.billing.subscriptionTier) {
            // Map organization subscriptionTier to UserTier
            switch (orgData.billing.subscriptionTier) {
              case SubscriptionTierValues.INFLUENCER:
                userTier = UserTier.INFLUENCER;
                break;
              case SubscriptionTierValues.ENTERPRISE:
                userTier = UserTier.ENTERPRISE;
                break;
              case SubscriptionTierValues.CREATOR:
              default:
                userTier = UserTier.CREATOR;
            }
          }
        } catch (error) {
          console.error('Failed to get organization data:', error);
        }
      } else if (user.subscriptionTier) {
        // Fallback to deprecated user property with warning
        console.warn('Using deprecated user.subscriptionTier field', { userId: user.id });
        
      switch (user.subscriptionTier) {
        case SubscriptionTierValues.INFLUENCER:
          userTier = UserTier.INFLUENCER;
          break;
        case SubscriptionTierValues.ENTERPRISE:
          userTier = UserTier.ENTERPRISE;
          break;
        case SubscriptionTierValues.CREATOR:
        default:
          userTier = UserTier.CREATOR;
      }
      }
      
      // Instantiate AIProvider and TokenService
      const aiProvider: AIProvider = AIProviderFactory.createProvider(ProviderType.OPENAI, { modelId: 'gpt-3.5-turbo' });
      const tokenRepository = new TokenRepository(adminFirestore);
      const notificationService = new NotificationService();
      const tokenService = new TokenService(tokenRepository, notificationService);
      const chatbot = new ChatbotService(aiProvider, tokenService);
      
      // Call chatbot RAG for auto-response using public API
      const conversation = await chatbot.createConversation({
        userId: user.id,
        organizationId: orgId || undefined,
        userTier,
        initialMessage: `${ticketData.subject}\n${ticketData.message}`,
        metadata: {
          isSupport: true,
          ticketId: ticketRef.id,
          ticketSubject: ticketData.subject
        }
      });
      let autoAnswered = false;
      let autoAnswerText = '';
      let autoAnswerConfidence = 0;
      if (conversation && conversation.messages && conversation.messages.length > 1) {
        // The assistant's response is the second message
        const assistantMsg = conversation.messages.find(m => m.role === 'assistant');
        if (assistantMsg) {
          autoAnswerText = assistantMsg.content;
          autoAnswerConfidence = assistantMsg.metadata && assistantMsg.metadata.relevantDocuments && assistantMsg.metadata.relevantDocuments.length > 0 ? assistantMsg.metadata.relevantDocuments[0].score : 0;
          
          // Update ticket with AI suggestion details, but do not close it
          await updateDoc(ticketRef, {
            aiSuggestionProvided: true,
            aiSuggestedAnswer: autoAnswerText,
            aiSuggestionConfidence: autoAnswerConfidence,
            updatedAt: Timestamp.now()
          });

          if (autoAnswerConfidence >= 0.0) {
            autoAnswered = true;
            if (userEmail) {
              await sendEmail({
                to: userEmail,
                subject: `AI Suggestion for your ticket: ${ticketData.subject}`,
                html: `Hi ${userData?.firstName || 'User'},<br><br>Our AI assistant, Iris, has a suggestion for your support ticket "${ticketData.subject}":<br><br><strong>${autoAnswerText}</strong><br><br>Please review this suggestion. Your ticket (ID: ${ticketRef.id}) is still open. If this resolves your issue, you can mark it as resolved. Otherwise, our support team will review it shortly.<br><br>Thank you,<br>IriSync Support`,
              });
            }
            await new NotificationService().sendNotification({
              userId: user.id,
              title: 'AI Suggestion for Your Ticket',
              message: `Iris has a suggestion for your ticket "${ticketData.subject}". Click to view.`,
              priority: NotificationPriority.MEDIUM,
              category: NotificationCategory.SYSTEM,
              actionUrl: `/support/tickets/${ticketRef.id}`,
              actionText: 'View Suggestion & Ticket',
              metadata: { ticketId: ticketRef.id, hasAiSuggestion: true }
            }, NotificationChannel.IN_APP);
          }
        }
      }
      // Ticket remains open for admins unless user confirms AI resolution later
      
      // Prepare complete ticket data for notifications after potential AI update
      const finalTicketSnapshot = await getDoc(ticketRef); // Re-fetch to get aiSuggestedAnswer if any
      const finalTicketDataForNotification = finalTicketSnapshot.exists() 
        ? convertFirestoreTicket(finalTicketSnapshot.data(), finalTicketSnapshot.id)
        : {
            id: ticketRef.id,
            userId: user.id,
            subject: validation.data.subject,
            description: ticketData.message, 
            status: 'open',
            priority: validation.data.priority || 'medium',
            type: 'general', 
            createdAt: now.toDate().toISOString(),
            updatedAt: now.toDate().toISOString(),
            createdBy: user.id,
            tags: validation.data.tags || [],
            assignedTo: validation.data.assignedTo || '',
            aiSuggestionProvided: ticketData.aiSuggestionProvided,
            aiSuggestedAnswer: ticketData.aiSuggestedAnswer,
            // other Ticket fields with defaults or undefined
            lastResponseAt: undefined,
            lastResponseBy: undefined,
            responses: [],
            metadata: {},
            isEscalated: false,
            isConverted: false,
            convertedToForumId: undefined,
            category: undefined, 
            orgId: orgId || undefined,
            email: userEmail
        } as Ticket; // Cast as Ticket ensuring all fields are present or undefined

      // Notify admins only if not auto-answered (AI suggestion sent) or confidence is low
      if (!autoAnswered || autoAnswerConfidence < 0.8) { 
        await notifySlack(`New support ticket created: ${finalTicketDataForNotification.subject}`, finalTicketDataForNotification);
        await notifyCRM(`New support ticket created: ${finalTicketDataForNotification.subject}`, finalTicketDataForNotification);
        if (userEmail) await notifyEmail(`Your support ticket has been created.`, finalTicketDataForNotification, userEmail);
      }
      return NextResponse.json({ message: 'Ticket created', ticketId: ticketRef.id, autoAnswered, autoAnswerText, autoAnswerConfidence }, { status: 201 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    logger.error('Error in POST handler', { error });
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
};

// Ticket analytics endpoint
export async function GET_analytics(request: NextRequest) {
  try {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const ticketsQuery = query(collection(firestore, TICKETS_COLLECTION));
    const snapshot = await getDocs(ticketsQuery);
    const tickets: Ticket[] = snapshot.docs.map(doc => convertFirestoreTicket(doc.data(), doc.id));
    const total = tickets.length;
    const open = tickets.filter((t: any) => t.status === 'open').length;
    const closed = tickets.filter((t: any) => t.status === 'closed').length;
    const avgResponse = tickets.filter((t: any) => t.firstResponseAt && t.createdAt).map((t: any) => (new Date(t.firstResponseAt.seconds ? t.firstResponseAt.seconds * 1000 : t.firstResponseAt) as any) - (new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt) as any)).filter(Boolean);
    const avgResponseTime = avgResponse.length ? Math.round(avgResponse.reduce((a, b) => a + b, 0) / avgResponse.length / 1000 / 60) : 0; // in minutes
    const avgClose = tickets.filter((t: any) => t.closedAt && t.createdAt).map((t: any) => (new Date(t.closedAt.seconds ? t.closedAt.seconds * 1000 : t.closedAt) as any) - (new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt) as any)).filter(Boolean);
    const avgCloseTime = avgClose.length ? Math.round(avgClose.reduce((a, b) => a + b, 0) / avgClose.length / 1000 / 60) : 0; // in minutes
    const satisfaction = tickets.reduce((acc: any, t: any) => {
      if (t.satisfactionRating) {
        acc[t.satisfactionRating] = (acc[t.satisfactionRating] || 0) + 1;
      }
      return acc;
    }, {});
    const byTag: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byAssignedTo: Record<string, number> = {};
    tickets.forEach((t: any) => {
      if (Array.isArray(t.tags)) t.tags.forEach((tag: string) => { byTag[tag] = (byTag[tag] || 0) + 1; });
      if (t.priority) byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.assignedTo) byAssignedTo[t.assignedTo] = (byAssignedTo[t.assignedTo] || 0) + 1;
    });
    return NextResponse.json({ total, open, closed, avgResponseTime, avgCloseTime, satisfaction, byTag, byPriority, byAssignedTo });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

// GDPR/CCPA: User requests deletion of their tickets
export async function POST_gdpr_delete_request(request: NextRequest) {
  try {
    const auth = getAuth();
    let token = request.headers.get('authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    let user: AuthUser | null = null;
    if (typeof token === 'string' && token.length > 0) {
      const decoded = await auth.verifyIdToken(token);
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

      const userDoc = await getDoc(doc(firestore, 'users', decoded.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      user = {
        id: decoded.uid,
        email: decoded.email || '',
        firstName: '',
        lastName: '',
        role: decoded.role || '',
        currentOrganizationId: userData?.currentOrganizationId || '',
        personalOrganizationId: userData?.personalOrganizationId || ''
      };
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Mark all user's tickets as deletionRequested
    const ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), where('userId', '==', user.id));
    const snapshot = await getDocs(ticketsQuery);
    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(firestore, TICKETS_COLLECTION, docSnap.id), { deletionRequested: true, updatedAt: Timestamp.now() });
    }
    return NextResponse.json({ message: 'Deletion request submitted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit deletion request' }, { status: 500 });
  }
}

// GDPR/CCPA: Admin views deletion requests
export async function GET_gdpr_requests(request: NextRequest) {
  try {
    const auth = getAuth();
    let token = request.headers.get('authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    let user: AuthUser | null = null;
    if (typeof token === 'string' && token.length > 0) {
      const decoded = await auth.verifyIdToken(token);
      user = {
        id: decoded.uid,
        email: decoded.email || '',
        firstName: '',
        lastName: '',
        role: decoded.role || '',
        subscriptionTier: SubscriptionTierValues.NONE,
        organizationId: decoded.organizationId || ''
      };
    }
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), where('deletionRequested', '==', true));
    const snapshot = await getDocs(ticketsQuery);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ requests });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch deletion requests' }, { status: 500 });
  }
}

// GDPR/CCPA: Admin processes deletion
export async function DELETE_gdpr_delete(request: NextRequest) {
  try {
    const auth = getAuth();
    let token = request.headers.get('authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    let user: AuthUser | null = null;
    if (typeof token === 'string' && token.length > 0) {
      const decoded = await auth.verifyIdToken(token);
      user = {
        id: decoded.uid,
        email: decoded.email || '',
        firstName: '',
        lastName: '',
        role: decoded.role || '',
        subscriptionTier: SubscriptionTierValues.NONE,
        organizationId: decoded.organizationId || ''
      };
    }
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const url = new URL(request.url as string, 'http://localhost');
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), where('userId', '==', userId));
    const snapshot = await getDocs(ticketsQuery);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(firestore, TICKETS_COLLECTION, docSnap.id));
    }
    return NextResponse.json({ message: 'User tickets deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tickets' }, { status: 500 });
  }
}

// Export tickets as CSV/PDF (production-ready)
export async function GET_export(request: NextRequest) {
  try {
    const auth = getAuth();
    let token = request.headers.get('authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    let user: AuthUser | null = null;
    if (typeof token === 'string' && token.length > 0) {
      const decoded = await auth.verifyIdToken(token);
      user = {
        id: decoded.uid,
        email: decoded.email || '',
        firstName: '',
        lastName: '',
        role: decoded.role || '',
        subscriptionTier: SubscriptionTierValues.NONE,
        organizationId: decoded.organizationId || ''
      };
    }
    if (!user || !(user.role === 'admin' || user.role === 'super_admin')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    if (!request.url) {
      return NextResponse.json({ error: 'Request URL is required' }, { status: 400 });
    }
    const url = new URL(request.url as string, 'http://localhost');
    // Parse filters (same as GET)
    const status = url.searchParams.get('status');
    const subject = url.searchParams.get('subject');
    const priority = url.searchParams.get('priority');
    const userId = url.searchParams.get('userId');
    const assignedTo = url.searchParams.get('assignedTo');
    const tag = url.searchParams.get('tag');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const format = url.searchParams.get('format') || 'csv';
    let ticketsQuery;
    const filters = [];
    if (status) filters.push(where('status', '==', status));
    if (priority) filters.push(where('priority', '==', priority));
    if (userId) filters.push(where('userId', '==', userId));
    if (assignedTo) filters.push(where('assignedTo', '==', assignedTo));
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    ticketsQuery = query(collection(firestore, TICKETS_COLLECTION), ...filters, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(ticketsQuery);
    let tickets: Ticket[] = snapshot.docs.map(doc => convertFirestoreTicket(doc.data(), doc.id));
    if (subject) {
      tickets = tickets.filter((t) => t.subject && t.subject.toLowerCase().includes(subject.toLowerCase()));
    }
    if (tag) {
      tickets = tickets.filter((t) => Array.isArray(t.tags) && t.tags.includes(tag));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      tickets = tickets.filter((t) => t.createdAt && new Date(String(t.createdAt)).getTime() >= from.getTime());
    }
    if (dateTo) {
      const to = new Date(dateTo);
      tickets = tickets.filter((t) => t.createdAt && new Date(String(t.createdAt)).getTime() <= to.getTime());
    }
    // Format export
    if (format === 'csv') {
      const fields = ['id', 'subject', 'description', 'priority', 'status', 'tags', 'assignedTo', 'userId', 'createdAt', 'updatedAt', 'closedAt', 'satisfactionRating', 'escalated', 'type', 'createdBy', 'lastResponseAt', 'lastResponseBy', 'convertedToForumId', 'category', 'orgId', 'email'];
      const parser = new Parser({ fields });
      const csv = parser.parse(tickets.map(t => ({
        ...t,
        tags: Array.isArray(t.tags) ? t.tags.join(', ') : '',
        createdAt: t.createdAt ? String(t.createdAt) : '',
        updatedAt: t.updatedAt ? String(t.updatedAt) : '',
        lastResponseAt: t.lastResponseAt ? String(t.lastResponseAt) : '',
        closedAt: t.closedAt ? String(t.closedAt) : '',
        responses: t.responses ? JSON.stringify(t.responses) : ''
      })));
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="support-tickets-${Date.now()}.csv"`
        }
      });
    } else if (format === 'pdf') {
      // PDF generation (streamed)
      const PDFDocument = require('pdfkit');
      const stream = require('stream');
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const pass = new stream.PassThrough();
      doc.pipe(pass);
      doc.fontSize(18).text('Support Tickets Export', { align: 'center' });
      doc.moveDown();
      tickets.forEach((t, idx) => {
        doc.fontSize(12).text(`Ticket #${idx + 1}`);
        doc.text(`ID: ${t.id}`);
        doc.text(`Subject: ${t.subject || ''}`);
        doc.text(`Description: ${t.description || ''}`);
        doc.text(`Priority: ${t.priority || ''}`);
        doc.text(`Status: ${t.status || ''}`);
        doc.text(`Type: ${t.type || ''}`);
        doc.text(`Tags: ${Array.isArray(t.tags) ? t.tags.join(', ') : ''}`);
        doc.text(`Assigned To: ${t.assignedTo || ''}`);
        doc.text(`User ID: ${t.userId || ''}`);
        doc.text(`Created By: ${t.createdBy || ''}`);
        doc.text(`Created At: ${t.createdAt ? String(t.createdAt) : ''}`);
        doc.text(`Updated At: ${t.updatedAt ? String(t.updatedAt) : ''}`);
        doc.text(`Last Response At: ${t.lastResponseAt ? String(t.lastResponseAt) : ''}`);
        doc.text(`Closed At: ${t.closedAt ? String(t.closedAt) : ''}`);
        doc.text(`Satisfaction: ${t.satisfactionRating || ''}`);
        doc.text(`Escalated: ${t.isEscalated ? 'Yes' : 'No'}`);
        doc.text(`Category: ${t.category || ''}`);
        doc.text(`Org ID: ${t.orgId || ''}`);
        doc.moveDown();
      });
      doc.end();
      return new NextResponse(pass, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="support-tickets-${Date.now()}.pdf"`
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error exporting tickets', { error });
    return NextResponse.json({ error: 'Failed to export tickets' }, { status: 500 });
  }
} 