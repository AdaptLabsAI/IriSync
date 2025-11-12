import { Timestamp } from "firebase/firestore";

/**
 * Ticket priority levels
 */
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Ticket statuses
 */
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

/**
 * Ticket types
 */
export enum TicketType {
  GENERAL = 'general',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report'
}

/**
 * Ticket interface
 */
export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: TicketStatus | string;
  priority: TicketPriority | string;
  type: TicketType | string;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string;
  assignedTo?: string;
  lastResponseAt?: string | Date;
  lastResponseBy?: string;
  responses?: TicketResponse[];
  metadata?: Record<string, any>;
  tags?: string[];
  isEscalated?: boolean;
  isConverted?: boolean;
  convertedToForumId?: string;
  category?: string;
  aiResponseGenerated?: boolean;
  orgId?: string;
  email?: string;
  closedAt?: string | Date;
  satisfactionRating?: number;
  satisfactionComment?: string;
  aiSuggestionProvided?: boolean;
  aiSuggestedAnswer?: string;
  aiSuggestionConfidence?: number;
  aiResolutionConfirmedByUser?: boolean;
}

/**
 * Ticket response interface
 */
export interface TicketResponse {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string | Date;
  createdBy: string;
  isInternal: boolean;
  attachments?: TicketAttachment[];
  authorType: 'user' | 'agent' | 'system' | 'ai';
}

/**
 * Ticket attachment interface
 */
export interface TicketAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string | Date;
  uploadedBy: string;
  url: string;
}

/**
 * Create ticket input
 */
export interface CreateTicketInput {
  subject: string;
  description: string;
  type: TicketType | string;
  priority?: TicketPriority | string;
  metadata?: Record<string, any>;
  tags?: string[];
  category?: string;
  email?: string;
}

/**
 * Update ticket input
 */
export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: TicketStatus | string;
  priority?: TicketPriority | string;
  type?: TicketType | string;
  assignedTo?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  isEscalated?: boolean;
  category?: string;
}

/**
 * Ticket stats interface
 */
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waitingForCustomer: number;
  resolved: number;
  closed: number;
  averageResolutionTime: number; // in hours
  ticketsByPriority: Record<string, number>;
  ticketsByType: Record<string, number>;
  ticketsByDay: Array<{date: string, count: number}>;
  ticketsByAssignee: Record<string, number>;
}

/**
 * Convert Firestore ticket to API ticket
 * 
 * @param data Firestore ticket data
 * @param id Ticket ID
 * @returns Ticket object
 */
export function convertFirestoreTicket(data: any, id: string): Ticket {
  return {
    id,
    userId: data.userId,
    subject: data.subject,
    description: data.description,
    status: data.status,
    priority: data.priority,
    type: data.type,
    createdAt: data.createdAt instanceof Timestamp ? 
      data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? 
      data.updatedAt.toDate().toISOString() : data.updatedAt,
    createdBy: data.createdBy,
    assignedTo: data.assignedTo,
    lastResponseAt: data.lastResponseAt instanceof Timestamp ? 
      data.lastResponseAt.toDate().toISOString() : data.lastResponseAt,
    lastResponseBy: data.lastResponseBy,
    responses: data.responses?.map((response: any) => ({
      ...response,
      createdAt: response.createdAt instanceof Timestamp ? 
        response.createdAt.toDate().toISOString() : response.createdAt
    })),
    metadata: data.metadata,
    tags: data.tags,
    isEscalated: data.isEscalated || false,
    isConverted: data.isConverted || false,
    convertedToForumId: data.convertedToForumId,
    category: data.category,
    aiResponseGenerated: data.aiResponseGenerated || false,
    orgId: data.orgId,
    email: data.email,
    closedAt: data.closedAt instanceof Timestamp ? 
      data.closedAt.toDate().toISOString() : data.closedAt,
    satisfactionRating: data.satisfactionRating,
    satisfactionComment: data.satisfactionComment,
    aiSuggestionProvided: data.aiSuggestionProvided || false,
    aiSuggestedAnswer: data.aiSuggestedAnswer,
    aiSuggestionConfidence: data.aiSuggestionConfidence,
    aiResolutionConfirmedByUser: data.aiResolutionConfirmedByUser || false,
  };
}

/**
 * Prepare ticket for Firestore
 * 
 * @param ticket Ticket object
 * @returns Firestore ticket object
 */
export function prepareTicketForFirestore(ticket: Partial<Ticket>): Record<string, any> {
  const now = new Date();
  
  return {
    ...ticket,
    createdAt: ticket.createdAt ? new Date(ticket.createdAt) : now,
    updatedAt: now,
    lastResponseAt: ticket.lastResponseAt ? new Date(ticket.lastResponseAt) : undefined,
  };
} 