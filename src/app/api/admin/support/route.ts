import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, withAdmin } from '@/lib/features/auth/route-handlers';
import { getFirebaseFirestore  } from '@/lib/core/firebase';
import { firebaseAdmin, getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  updateDoc, 
  deleteDoc, 
  setDoc,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Collection name constants
const SUPPORT_TICKETS_COLLECTION = 'supportTickets';
const SUPPORT_FAQS_COLLECTION = 'supportFaqs';
const SUPPORT_CATEGORIES_COLLECTION = 'supportCategories';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Support ticket status
 */
enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
  WAITING_FOR_THIRD_PARTY = 'waiting_for_third_party',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

/**
 * Support ticket priority
 */
enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(adminUser: { id: string, email: string, role: string }, action: string, details: any) {
  try {
    const adminFirestore = getFirestore();
    const logRef = adminFirestore.collection(AUDIT_LOGS_COLLECTION).doc();
    await logRef.set({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: adminUser.role,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    logger.error('Failed to create audit log', { error, action, adminId: adminUser.id });
  }
}

/**
 * Format ticket data for API response
 */
function formatTicketForResponse(id: string, data: any) {
  return {
    id,
    userId: data.userId,
    userEmail: data.userEmail,
    subject: data.subject,
    description: data.description,
    status: data.status,
    priority: data.priority,
    category: data.category,
    assignedTo: data.assignedTo,
    attachments: data.attachments || [],
    messages: data.messages || [],
    metadata: data.metadata || {},
    createdAt: data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate().toISOString() 
      : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate().toISOString() 
      : data.updatedAt,
    resolvedAt: data.resolvedAt instanceof Timestamp 
      ? data.resolvedAt.toDate().toISOString() 
      : data.resolvedAt
  };
}

/**
 * Format FAQ data for API response
 */
function formatFaqForResponse(id: string, data: any) {
  return {
    id,
    question: data.question,
    answer: data.answer,
    category: data.category,
    tags: data.tags || [],
    isPublished: data.isPublished,
    order: data.order || 0,
    createdAt: data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate().toISOString() 
      : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate().toISOString() 
      : data.updatedAt
  };
}

/**
 * Validation schema for creating a support ticket message
 */
const ticketMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  senderId: z.string().min(1, 'Sender ID is required'),
  senderName: z.string().min(1, 'Sender name is required'),
  senderRole: z.string().min(1, 'Sender role is required'),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    contentType: z.string(),
    size: z.number()
  })).optional()
});

/**
 * Validation schema for creating a new support ticket
 */
const createTicketSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  userEmail: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
  status: z.enum([
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_CUSTOMER,
    TicketStatus.WAITING_FOR_THIRD_PARTY,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED
  ]),
  priority: z.enum([
    TicketPriority.LOW,
    TicketPriority.MEDIUM,
    TicketPriority.HIGH,
    TicketPriority.URGENT
  ]),
  category: z.string().min(1, 'Category is required'),
  assignedTo: z.string().optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    contentType: z.string(),
    size: z.number()
  })).optional(),
  messages: z.array(ticketMessageSchema).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Validation schema for updating a support ticket
 */
const updateTicketSchema = z.object({
  userId: z.string().min(1, 'User ID is required').optional(),
  userEmail: z.string().email('Valid email is required').optional(),
  subject: z.string().min(1, 'Subject is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  status: z.enum([
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_CUSTOMER,
    TicketStatus.WAITING_FOR_THIRD_PARTY,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED
  ]).optional(),
  priority: z.enum([
    TicketPriority.LOW,
    TicketPriority.MEDIUM,
    TicketPriority.HIGH,
    TicketPriority.URGENT
  ]).optional(),
  category: z.string().min(1, 'Category is required').optional(),
  assignedTo: z.string().optional().nullable(),
  messages: z.array(ticketMessageSchema).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Validation schema for creating a new FAQ
 */
const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  order: z.number().int().optional()
});

/**
 * Validation schema for updating an FAQ
 */
const updateFaqSchema = z.object({
  question: z.string().min(1, 'Question is required').optional(),
  answer: z.string().min(1, 'Answer is required').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  order: z.number().int().optional()
});

/**
 * GET handler for listing support tickets with pagination, filtering, and sorting
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');
    const page = parseInt(url.searchParams.get('page') || '1');
    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const status = url.searchParams.get('status') || null;
    const priority = url.searchParams.get('priority') || null;
    const category = url.searchParams.get('category') || null;
    const assignedTo = url.searchParams.get('assignedTo') || null;
    const userId = url.searchParams.get('userId') || null;
    const search = url.searchParams.get('search') || '';
    const lastDocId = url.searchParams.get('lastDocId') || null;
    const type = url.searchParams.get('type') || 'tickets';  // 'tickets' or 'faqs'
    
    // Validate parameters
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid pageSize parameter. Must be between 1 and 100.' },
        { status: 400 }
      );
    }

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page parameter. Must be greater than 0.' },
        { status: 400 }
      );
    }

    if (type !== 'tickets' && type !== 'faqs') {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "tickets" or "faqs".' },
        { status: 400 }
      );
    }

    const collectionName = type === 'tickets' 
      ? SUPPORT_TICKETS_COLLECTION 
      : SUPPORT_FAQS_COLLECTION;
    
    // Build query with filters
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    let supportQuery: any = query(collection(firestore, collectionName));
    
    // Apply filters based on type
    if (type === 'tickets') {
      // Apply ticket-specific filters
      if (status) {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

        supportQuery = query(supportQuery, where('status', '==', status));
      }
      
      if (priority) {
        supportQuery = query(supportQuery, where('priority', '==', priority));
      }
      
      if (assignedTo) {
        supportQuery = query(supportQuery, where('assignedTo', '==', assignedTo));
      }
    } else {
      // Apply FAQ-specific filters
      if (url.searchParams.get('isPublished')) {
        const isPublished = url.searchParams.get('isPublished') === 'true';
        supportQuery = query(supportQuery, where('isPublished', '==', isPublished));
      }
    }
    
    // Apply common filters
    if (category) {
      supportQuery = query(supportQuery, where('category', '==', category));
    }
    
    if (userId && type === 'tickets') {
      supportQuery = query(supportQuery, where('userId', '==', userId));
    }
    
    // Apply sorting
    supportQuery = query(supportQuery, orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'));
    
    // Apply pagination using cursor if provided
    if (lastDocId) {
      try {
        const lastDocSnapshot = await getDoc(doc(firestore, collectionName, lastDocId));
        if (lastDocSnapshot.exists()) {
          supportQuery = query(supportQuery, startAfter(lastDocSnapshot));
        }
      } catch (error) {
        logger.warn('Invalid lastDocId provided for pagination', { lastDocId, error });
      }
    } else if (page > 1) {
      // Skip records if no cursor is provided but page is > 1
      supportQuery = query(supportQuery, limit((page - 1) * pageSize));
      const skipSnapshot = await getDocs(supportQuery);
      if (!skipSnapshot.empty) {
        const lastVisible = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        supportQuery = query(
          collection(firestore, collectionName),
          orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'),
          startAfter(lastVisible),
          limit(pageSize)
        );
      } else {
        // If we've skipped all documents, return empty array
        return NextResponse.json({ 
          [type]: [], 
          totalCount: 0, 
          hasMore: false 
        });
      }
    }
    
    // Apply final page size limit
    supportQuery = query(supportQuery, limit(pageSize));
    
    // Execute query
    const supportSnapshot = await getDocs(supportQuery);
    
    // Format data for response based on type
    const items = supportSnapshot.docs
      .map(doc => {
        if (type === 'tickets') {
          return formatTicketForResponse(doc.id, doc.data());
        } else {
          return formatFaqForResponse(doc.id, doc.data());
        }
      })
      .filter(item => {
        if (!search) return true;
        
        const searchLower = search.toLowerCase();
        
        if (type === 'tickets') {
          const ticket = item as any;
          return (
            ticket.subject.toLowerCase().includes(searchLower) ||
            ticket.description.toLowerCase().includes(searchLower) ||
            ticket.userEmail.toLowerCase().includes(searchLower)
          );
        } else {
          const faq = item as any;
          return (
            faq.question.toLowerCase().includes(searchLower) ||
            faq.answer.toLowerCase().includes(searchLower) ||
            (faq.tags && faq.tags.some((tag: string) => 
              tag.toLowerCase().includes(searchLower)
            ))
          );
        }
      });
    
    // Get total count (for pagination info)
    let totalCount = 0;
    let countQuery;
    
    if (type === 'tickets' && status) {
      countQuery = query(collection(firestore, collectionName), where('status', '==', status));
    } else if (type === 'faqs' && url.searchParams.get('isPublished')) {
      const isPublished = url.searchParams.get('isPublished') === 'true';
      countQuery = query(collection(firestore, collectionName), where('isPublished', '==', isPublished));
    } else {
      countQuery = collection(firestore, collectionName);
    }
    
    try {
      const countSnapshot = await getDocs(countQuery);
      totalCount = countSnapshot.size;
    } catch (error) {
      logger.warn(`Error getting total ${type} count`, { error });
    }
    
    // Calculate if there are more results
    const hasMore = !supportSnapshot.empty && items.length === pageSize;
    
    // Get the last document ID for cursor pagination
    const lastVisible = supportSnapshot.docs.length > 0 
      ? supportSnapshot.docs[supportSnapshot.docs.length - 1].id 
      : null;
    
    // Log admin action
    await logAdminAction(adminUser, `LIST_${type.toUpperCase()}`, {
      filters: { status, priority, category, assignedTo, userId, search },
      pagination: { page, pageSize },
      sorting: { field: sortField, order: sortOrder },
      resultCount: items.length
    });
    
    // Return formatted response
    return NextResponse.json({
      [type]: items,
      pagination: {
        totalCount,
        pageSize,
        currentPage: page,
        hasMore,
        lastDocId: lastVisible
      }
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin support GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve support data',
        message: 'An unexpected error occurred while retrieving support data. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating a new support item (ticket or FAQ)
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Check if type is provided
    if (!body.type || (body.type !== 'ticket' && body.type !== 'faq')) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter. Must be "ticket" or "faq".' },
        { status: 400 }
      );
    }
    
    const type = body.type;
    delete body.type; // Remove type from the data to be processed
    
    let validationResult;
    let collectionName;
    
    // Validate based on type
    if (type === 'ticket') {
      validationResult = createTicketSchema.safeParse(body);
      collectionName = SUPPORT_TICKETS_COLLECTION;
    } else {
      validationResult = createFaqSchema.safeParse(body);
      collectionName = SUPPORT_FAQS_COLLECTION;
    }
    
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Prepare data for Firestore
    const now = new Date();
    const firestoreData: any = {
      ...data,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    // Add item to Firestore
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const docRef = await addDoc(collection(firestore, collectionName), firestoreData);
    
    // Format response data
    let responseData;
    if (type === 'ticket') {
      responseData = formatTicketForResponse(docRef.id, firestoreData);
    } else {
      responseData = formatFaqForResponse(docRef.id, firestoreData);
    }
    
    // Log admin action
    await logAdminAction(adminUser, `CREATE_${type.toUpperCase()}`, {
      id: docRef.id,
      ...(type === 'ticket' ? { 
        subject: (data as any).subject,
        status: (data as any).status,
        priority: (data as any).priority
      } : { 
        question: (data as any).question,
        isPublished: (data as any).isPublished 
      })
    });
    
    // Return success response
    return NextResponse.json(
      { 
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`, 
        [type]: responseData 
      },
      { status: 201 }
    );
  } catch (error) {
    // Log error details
    logger.error('Error in admin support POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to create support item',
        message: 'An unexpected error occurred while creating the support item. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH handler for updating a support item (ticket or FAQ)
 */
export const PATCH = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Check if type and id are provided
    if (!body.type || (body.type !== 'ticket' && body.type !== 'faq')) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter. Must be "ticket" or "faq".' },
        { status: 400 }
      );
    }
    
    const type = body.type;
    delete body.type; // Remove type from the data to be processed
    
    // Ensure id is provided
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    const id = body.id;
    delete body.id; // Remove id from the data to be updated
    
    let validationResult;
    let collectionName;
    
    // Validate based on type
    if (type === 'ticket') {
      validationResult = updateTicketSchema.safeParse(body);
      collectionName = SUPPORT_TICKETS_COLLECTION;
    } else {
      validationResult = updateFaqSchema.safeParse(body);
      collectionName = SUPPORT_FAQS_COLLECTION;
    }
    
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const updateData = validationResult.data;
    
    // Check if item exists
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const docRef = doc(firestore, collectionName, id);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return NextResponse.json(
        { error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found` },
        { status: 404 }
      );
    }
    
    const existingData = docSnapshot.data();
    
    // Special handling for ticket status changes
    if (type === 'ticket' && (updateData as any).status && (updateData as any).status !== existingData.status) {
      // If changing to resolved, add resolvedAt timestamp
      if ((updateData as any).status === TicketStatus.RESOLVED) {
        (updateData as any).resolvedAt = Timestamp.fromDate(new Date());
      } else if (existingData.status === TicketStatus.RESOLVED) {
        // If changing from resolved to something else, remove resolvedAt
        (updateData as any).resolvedAt = null;
      }
    }
    
    // Special handling for adding a new message
    if (type === 'ticket' && body.addMessage) {
      const newMessage = body.addMessage;
      delete body.addMessage; // Remove from update data
      
      // Validate the new message
      const messageValidation = ticketMessageSchema.safeParse(newMessage);
      if (!messageValidation.success) {
        return NextResponse.json(
          { error: 'Invalid message format', details: messageValidation.error.format() },
          { status: 400 }
        );
      }
      
      // Add timestamp to message
      const messageWithTimestamp = {
        ...newMessage,
        timestamp: Timestamp.fromDate(new Date())
      };
      
      // Add to existing messages array or create a new one
      const messages = existingData.messages || [];
      (updateData as any).messages = [...messages, messageWithTimestamp];
    }
    
    // Prepare update data for Firestore
    const firestoreUpdateData: any = {
      ...updateData,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Update item in Firestore
    await updateDoc(docRef, firestoreUpdateData);
    
    // Get updated data
    const updatedDoc = await getDoc(docRef);
    const updatedData = updatedDoc.exists() ? updatedDoc.data() : existingData;
    
    // Format response data
    let responseData;
    if (type === 'ticket') {
      responseData = formatTicketForResponse(id, updatedData);
    } else {
      responseData = formatFaqForResponse(id, updatedData);
    }
    
    // Log admin action
    await logAdminAction(adminUser, `UPDATE_${type.toUpperCase()}`, {
      id,
      updatedFields: Object.keys(updateData),
      ...(type === 'ticket' && (updateData as any).status ? {
        statusChange: {
          from: existingData.status,
          to: (updateData as any).status
        }
      } : {})
    });
    
    // Return success response
    return NextResponse.json({
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`,
      [type]: responseData
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin support PATCH handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to update support item',
        message: 'An unexpected error occurred while updating the support item. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for removing a support item (ticket or FAQ)
 */
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get parameters from query
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    
    // Validate type and id
    if (!type || (type !== 'ticket' && type !== 'faq')) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter. Must be "ticket" or "faq".' },
        { status: 400 }
      );
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    const collectionName = type === 'ticket' 
      ? SUPPORT_TICKETS_COLLECTION 
      : SUPPORT_FAQS_COLLECTION;
    
    // Check if item exists
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const docRef = doc(firestore, collectionName, id);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return NextResponse.json(
        { error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found` },
        { status: 404 }
      );
    }
    
    const itemData = docSnapshot.data();
    
    // Special handling for tickets
    if (type === 'ticket') {
      // Archive tickets instead of deleting them for record-keeping
      await updateDoc(docRef, {
        status: TicketStatus.CLOSED,
        updatedAt: Timestamp.fromDate(new Date()),
        archived: true,
        archivedAt: Timestamp.fromDate(new Date())
      });
    } else {
      // Delete FAQ from Firestore
      await deleteDoc(docRef);
    }
    
    // Log admin action
    await logAdminAction(adminUser, `${type === 'ticket' ? 'ARCHIVE' : 'DELETE'}_${type.toUpperCase()}`, {
      id,
      ...(type === 'ticket' ? { 
        subject: itemData.subject,
        status: itemData.status
      } : { 
        question: itemData.question
      })
    });
    
    // Return success response
    return NextResponse.json({
      message: type === 'ticket' 
        ? 'Ticket archived successfully' 
        : 'FAQ deleted successfully'
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin support DELETE handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: `Failed to ${request.url.includes('type=ticket') ? 'archive' : 'delete'} support item`,
        message: `An unexpected error occurred while ${request.url.includes('type=ticket') ? 'archiving' : 'deleting'} the support item. Please try again or contact support.`
      },
      { status: 500 }
    );
  }
}); 