import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/lib/auth/route-handlers';
import { KnowledgeRepository } from '@/lib/knowledge/repository';
import { logger } from '@/lib/logging/logger';

const categoryCreateSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(50, 'Category name cannot exceed 50 characters')
});

const categoryUpdateSchema = z.object({
  oldName: z.string().min(2, 'Old category name must be at least 2 characters'),
  newName: z.string().min(2, 'New category name must be at least 2 characters').max(50, 'Category name cannot exceed 50 characters')
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
    logger.error('Failed to create audit log for knowledge category', { 
      error, 
      action, 
      adminId: adminUser.id 
    });
  }
}

/**
 * GET handler to retrieve all knowledge base categories
 */
export const GET = withAdmin(async (_request: NextRequest, adminUser: any) => {
  try {
    // Get all categories from repository
    const categories = await KnowledgeRepository.getCategories();
    
    // Sort categories alphabetically
    categories.sort();
    
    // Log admin action
    await logAdminAction(adminUser, 'LIST_KNOWLEDGE_CATEGORIES', {
      count: categories.length
    });
    
    // Return categories
    return NextResponse.json({ categories });
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge-base categories GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve knowledge base categories',
        message: 'An unexpected error occurred while retrieving categories. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler to create or update a knowledge base category
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Check if this is an update or create
    if (body.oldName) {
      // Validate update request
      const validationResult = categoryUpdateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation error', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      const { oldName, newName } = validationResult.data;
      
      // Check if new name already exists
      const categories = await KnowledgeRepository.getCategories();
      if (oldName !== newName && categories.includes(newName)) {
        return NextResponse.json(
          { error: 'Category already exists', message: `A category with the name '${newName}' already exists` },
          { status: 400 }
        );
      }
      
      // Update the category
      await KnowledgeRepository.updateCategoryName(oldName, newName);
      
      // Log admin action
      await logAdminAction(adminUser, 'UPDATE_KNOWLEDGE_CATEGORY', {
        oldName,
        newName
      });
      
      // Return success response
      return NextResponse.json({
        message: 'Category updated successfully',
        category: newName
      });
    } else {
      // Validate create request
      const validationResult = categoryCreateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation error', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      const { name } = validationResult.data;
      
      // Check if category already exists
      const categories = await KnowledgeRepository.getCategories();
      if (categories.includes(name)) {
        return NextResponse.json(
          { error: 'Category already exists', message: `A category with the name '${name}' already exists` },
          { status: 400 }
        );
      }
      
      // Create the category
      await KnowledgeRepository.createCategory(name);
      
      // Log admin action
      await logAdminAction(adminUser, 'CREATE_KNOWLEDGE_CATEGORY', {
        name
      });
      
      // Return success response
      return NextResponse.json({
        message: 'Category created successfully',
        category: name
      }, { status: 201 });
    }
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge-base categories POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to save knowledge base category',
        message: 'An unexpected error occurred while saving the category. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}); 