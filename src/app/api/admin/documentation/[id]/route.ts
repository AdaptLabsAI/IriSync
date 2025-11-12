import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/route-handlers';
import { 
  KnowledgeContent, 
  KnowledgeContentType, 
  KnowledgeStatus, 
  KnowledgeAccessLevel,
  UpdateKnowledgeContentInput
} from '@/lib/knowledge/models';
import { KnowledgeRepository } from '@/lib/knowledge/repository';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { AuthUser } from '@/lib/auth/token';

/**
 * Update documentation schema
 */
const updateDocumentationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  content: z.string().min(20, 'Content must be at least 20 characters').optional(),
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
  excerpt: z.string().optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional()
});

/**
 * Process documentation item for response
 */
function processDocumentationForResponse(doc: KnowledgeContent) {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    content: doc.content,
    contentType: doc.contentType,
    category: doc.category,
    tags: doc.tags,
    status: doc.status,
    accessLevel: doc.accessLevel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt,
    seo: doc.seo
  };
}

/**
 * Verify that the content is a documentation type
 */
function verifyDocumentationType(content: KnowledgeContent | null): boolean {
  return content?.contentType === KnowledgeContentType.DOCUMENTATION;
}

/**
 * GET handler for fetching a single documentation item
 */
export const GET = withAdmin(async (request: NextRequest, user: AuthUser) => {
  try {
    const { id } = (request as any).params || {};
    const documentationId = id || (request as any).query?.id;
    // Fetch the documentation item
    const documentationItem = await KnowledgeRepository.getById(documentationId);
    if (!documentationItem || !verifyDocumentationType(documentationItem)) {
      return NextResponse.json(
        { error: 'Documentation item not found' },
        { status: 404 }
      );
    }
    logger.info('Admin fetched documentation item', {
      adminId: user.id,
      adminEmail: user.email,
      documentationId
    });
    return NextResponse.json(processDocumentationForResponse(documentationItem));
  } catch (error) {
    logger.error('Error fetching documentation item', { error });
    return NextResponse.json(
      { error: 'Failed to fetch documentation item' },
      { status: 500 }
    );
  }
});

/**
 * PATCH handler for updating a documentation item
 */
export const PATCH = withAdmin(async (request: NextRequest, user: AuthUser) => {
  try {
    const { id } = (request as any).params || {};
    const documentationId = id || (request as any).query?.id;
    const existingDocumentation = await KnowledgeRepository.getById(documentationId);
    if (!existingDocumentation || !verifyDocumentationType(existingDocumentation)) {
      return NextResponse.json(
        { error: 'Documentation item not found' },
        { status: 404 }
      );
    }
    const body = await request.json();
    const validatedData = updateDocumentationSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validatedData.error.flatten() },
        { status: 400 }
      );
    }
    const updateFields: UpdateKnowledgeContentInput = { ...validatedData.data };
    const updatedDocumentation = await KnowledgeRepository.update(documentationId, updateFields);
    logger.info('Admin updated documentation item', {
      adminId: user.id,
      adminEmail: user.email,
      documentationId,
      updateFields: Object.keys(updateFields)
    });
    return NextResponse.json(processDocumentationForResponse(updatedDocumentation));
  } catch (error) {
    logger.error('Error updating documentation item', { error });
    return NextResponse.json(
      { error: 'Failed to update documentation item' },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for removing a documentation item
 */
export const DELETE = withAdmin(async (request: NextRequest, user: AuthUser) => {
  try {
    const { id } = (request as any).params || {};
    const documentationId = id || (request as any).query?.id;
    const existingDocumentation = await KnowledgeRepository.getById(documentationId);
    if (!existingDocumentation || !verifyDocumentationType(existingDocumentation)) {
      return NextResponse.json(
        { error: 'Documentation item not found' },
        { status: 404 }
      );
    }
    const documentationTitle = existingDocumentation.title;
    await KnowledgeRepository.delete(documentationId);
    logger.info('Admin deleted documentation item', {
      adminId: user.id,
      adminEmail: user.email,
      documentationId,
      documentationTitle
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting documentation item', { error });
    return NextResponse.json(
      { error: 'Failed to delete documentation item' },
      { status: 500 }
    );
  }
}); 