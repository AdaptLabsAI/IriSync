import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { firebaseAdmin, serverTimestamp } from '@/lib/core/firebase/admin';
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';
import { 
  KnowledgeContentType, 
  KnowledgeStatus, 
  KnowledgeAccessLevel 
} from '@/lib/knowledge/models';
import { KnowledgeRepository } from '@/lib/knowledge/repository';
import { generateSlug } from '@/lib/core/utils/slug';

// Collection name constants
const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(adminUser: { id: string, email: string, role: string }, action: string, details: any) {
  try {
    const logRef = firebaseAdmin.firestore().collection(AUDIT_LOGS_COLLECTION).doc();
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
 * Format timestamp to ISO string for API responses
 */
function formatTimestamp(timestamp: Timestamp | null | undefined) {
  if (!timestamp) return null;
  return timestamp instanceof Timestamp ? timestamp.toDate().toISOString() : timestamp;
}

/**
 * Update validation schema
 */
const updateKnowledgeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  content: z.string().min(20, 'Content must be at least 20 characters').optional(),
  contentType: z.enum([
    KnowledgeContentType.FAQ,
    KnowledgeContentType.DOCUMENTATION,
    KnowledgeContentType.TUTORIAL,
    KnowledgeContentType.TROUBLESHOOTING,
    KnowledgeContentType.GUIDE
  ]).optional(),
  category: z.string().min(1, 'Category is required').optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum([
    KnowledgeStatus.DRAFT,
    KnowledgeStatus.PUBLISHED,
    KnowledgeStatus.ARCHIVED
  ]).optional(),
  accessLevel: z.enum([
    KnowledgeAccessLevel.PUBLIC,
    KnowledgeAccessLevel.REGISTERED,
    KnowledgeAccessLevel.PAID,
    KnowledgeAccessLevel.INFLUENCER,
    KnowledgeAccessLevel.ENTERPRISE,
    KnowledgeAccessLevel.PRIVATE
  ]).optional(),
  excerpt: z.string().optional().nullable(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional(),
  relatedContentIds: z.array(z.string()).optional()
});

/**
 * GET handler for retrieving a single knowledge content by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (req: NextRequest, adminUser: any) => {
    try {
      const id = params.id;
      
      if (!id) {
        return NextResponse.json(
          { error: 'Knowledge content ID is required' },
          { status: 400 }
        );
      }
      
      // Get the knowledge content
      const knowledgeContent = await KnowledgeRepository.getById(id);
      
      if (!knowledgeContent) {
        return NextResponse.json(
          { error: 'Knowledge content not found' },
          { status: 404 }
        );
      }
      
      // Format timestamps for consistent API responses
      const formattedContent = {
        ...knowledgeContent,
        createdAt: formatTimestamp(knowledgeContent.createdAt),
        updatedAt: formatTimestamp(knowledgeContent.updatedAt),
        publishedAt: formatTimestamp(knowledgeContent.publishedAt)
      };
      
      // Log admin action
      await logAdminAction(adminUser, 'VIEW_KNOWLEDGE', {
        id,
        title: knowledgeContent.title
      });
      
      // Return formatted response
      return NextResponse.json({ content: formattedContent });
    } catch (error) {
      // Log error details
      logger.error('Error in admin knowledge GET by ID handler', {
        error: error instanceof Error ? error.message : String(error),
        adminId: adminUser.id,
        id: params.id
      });
      
      // Return error response
      return NextResponse.json(
        { 
          error: 'Failed to retrieve knowledge content',
          message: 'An unexpected error occurred while retrieving the knowledge content. Please try again or contact support.'
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * PATCH handler for updating a knowledge content
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (req: NextRequest, adminUser: any) => {
    try {
      const id = params.id;
      
      if (!id) {
        return NextResponse.json(
          { error: 'Knowledge content ID is required' },
          { status: 400 }
        );
      }
      
      // Check if knowledge content exists
      const existingContent = await KnowledgeRepository.getById(id);
      
      if (!existingContent) {
        return NextResponse.json(
          { error: 'Knowledge content not found' },
          { status: 404 }
        );
      }
      
      // Parse request body
      const body = await request.json();
      
      // Validate update data
      const validationResult = updateKnowledgeSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation error', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      // Create update data object
      const updateData: any = validationResult.data;
      
      // Check if slug needs to be updated (if title changes)
      if (updateData.title && updateData.title !== existingContent.title) {
        const baseSlug = generateSlug(updateData.title);
        let slug = baseSlug;
        let iteration = 1;
        
        // Check if slug already exists, if so, append a number
        while (await KnowledgeRepository.slugExists(slug, id)) {
          slug = `${baseSlug}-${iteration}`;
          iteration++;
        }
        
        updateData.slug = slug;
      }
      
      // Update the knowledge content
      const updatedContent = await KnowledgeRepository.update(id, updateData);
      
      // Format timestamps for consistent API responses
      const formattedContent = {
        ...updatedContent,
        createdAt: formatTimestamp(updatedContent.createdAt),
        updatedAt: formatTimestamp(updatedContent.updatedAt),
        publishedAt: formatTimestamp(updatedContent.publishedAt)
      };
      
      // Log admin action
      await logAdminAction(adminUser, 'UPDATE_KNOWLEDGE', {
        id,
        title: updatedContent.title,
        updatedFields: Object.keys(updateData),
        statusChange: updateData.status && updateData.status !== existingContent.status ? {
          from: existingContent.status,
          to: updateData.status
        } : undefined
      });
      
      // Return response with updated content
      return NextResponse.json({
        message: 'Knowledge content updated successfully',
        content: formattedContent
      });
    } catch (error) {
      // Log error details
      logger.error('Error in admin knowledge PATCH handler', {
        error: error instanceof Error ? error.message : String(error),
        adminId: adminUser.id,
        id: params.id
      });
      
      // Return error response
      return NextResponse.json(
        { 
          error: 'Failed to update knowledge content',
          message: 'An unexpected error occurred while updating the knowledge content. Please try again or contact support.'
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * DELETE handler for removing a knowledge content
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (req: NextRequest, adminUser: any) => {
    try {
      const id = params.id;
      
      if (!id) {
        return NextResponse.json(
          { error: 'Knowledge content ID is required' },
          { status: 400 }
        );
      }
      
      // Check if knowledge content exists and get it for the audit log
      const existingContent = await KnowledgeRepository.getById(id);
      
      if (!existingContent) {
        return NextResponse.json(
          { error: 'Knowledge content not found' },
          { status: 404 }
        );
      }
      
      // Delete the knowledge content
      await KnowledgeRepository.delete(id);
      
      // Log admin action
      await logAdminAction(adminUser, 'DELETE_KNOWLEDGE', {
        id,
        title: existingContent.title,
        contentType: existingContent.contentType,
        status: existingContent.status
      });
      
      // Return success response
      return NextResponse.json({
        message: 'Knowledge content deleted successfully'
      });
    } catch (error) {
      // Log error details
      logger.error('Error in admin knowledge DELETE handler', {
        error: error instanceof Error ? error.message : String(error),
        adminId: adminUser.id,
        id: params.id
      });
      
      // Return error response
      return NextResponse.json(
        { 
          error: 'Failed to delete knowledge content',
          message: 'An unexpected error occurred while deleting the knowledge content. Please try again or contact support.'
        },
        { status: 500 }
      );
    }
  })(request);
} 