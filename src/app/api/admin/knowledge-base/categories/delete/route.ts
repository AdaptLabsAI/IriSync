import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { KnowledgeRepository } from '@/lib/knowledge/repository';
import { logger } from '@/lib/core/logging/logger';

const categoryDeleteSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters')
});

/**
 * Log admin actions for knowledge base categories
 */
async function logAdminAction(adminUser: { id: string, email: string, role: string }, action: string, details: any) {
  try {
    const admin = await import('firebase-admin');
    const adminFirestore = admin.firestore();
    const logRef = adminFirestore.collection('auditLogs').doc();
    await logRef.set({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: adminUser.role,
      action,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    logger.error('Failed to create audit log for knowledge category deletion', { 
      error, 
      action, 
      adminId: adminUser.id 
    });
  }
}

/**
 * POST handler to delete a knowledge base category
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request
    const validationResult = categoryDeleteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name } = validationResult.data;
    
    // Check if category exists
    const categories = await KnowledgeRepository.getCategories();
    if (!categories.includes(name)) {
      return NextResponse.json(
        { error: 'Category not found', message: `No category with the name '${name}' exists` },
        { status: 404 }
      );
    }
    
    // Check if there are articles using this category
    const articlesCount = await KnowledgeRepository.countArticlesInCategory(name);
    
    // If articles are using this category, provide a warning
    if (articlesCount > 0) {
      // Handle article updates - set their category to "Uncategorized"
      await KnowledgeRepository.updateArticlesCategory(name, 'Uncategorized');
      
      // Log that articles were updated
      logger.info(`Updated ${articlesCount} articles from category '${name}' to 'Uncategorized'`, {
        adminId: adminUser.id,
        category: name,
        articlesCount
      });
    }
    
    // Delete the category
    await KnowledgeRepository.deleteCategory(name);
    
    // Log admin action
    await logAdminAction(adminUser, 'DELETE_KNOWLEDGE_CATEGORY', {
      name,
      articlesUpdated: articlesCount > 0,
      articlesCount
    });
    
    // Return success response
    return NextResponse.json({
      message: 'Category deleted successfully',
      articlesUpdated: articlesCount > 0,
      articlesCount
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge-base categories delete handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to delete knowledge base category',
        message: 'An unexpected error occurred while deleting the category. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}); 