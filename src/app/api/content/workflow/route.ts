import { NextRequest, NextResponse } from 'next/server';
import workflowService, { WorkflowError } from '../../../../lib/features/content/workflow/WorkflowService';
import { 
  CreateWorkflowTemplateInput, 
  UpdateWorkflowTemplateInput,
  WorkflowTransitionInput,
  ReviewSubmissionInput,
  WorkflowFilter,
  WorkflowAction,
  WorkflowState
} from '../../../../lib/features/content/models/workflow';
import { TeamRole } from '../../../../lib/auth/roles';
import { OrganizationRole } from '../../../../lib/team/users/organization';
import { getCurrentUser } from '../../../../lib/auth/token';
import { hasOrganizationRole } from '../../../../lib/auth/middleware';
import { Logger, LogLevel } from '../../../../lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


const logger = new Logger({
  minLevel: LogLevel.INFO,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production'
});

/**
 * GET /api/content/workflow
 * GET /api/content/workflow/templates
 * GET /api/content/workflow/templates/:id
 * GET /api/content/workflow/content/:id
 * GET /api/content/workflow/content/:id/history
 * 
 * POST /api/content/workflow/templates
 * POST /api/content/workflow/content/:id/init
 * POST /api/content/workflow/content/:id/transition
 * POST /api/content/workflow/content/:id/review
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams, pathname } = new URL(request.url);
    
    // Handle different types of GET requests
    if (pathname.includes('/templates')) {
      // Get template by ID
      const templateId = pathname.split('/').pop();
      if (templateId && templateId !== 'templates') {
        const template = await workflowService.getTemplate(templateId);
        if (!template) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        
        return NextResponse.json(template);
      }
      
      // Get all templates for organization
      const organizationId = searchParams.get('organizationId');
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
      }
      
      const templates = await workflowService.getTemplates(organizationId);
      return NextResponse.json(templates);
    }
    
    // Get content workflow status
    if (pathname.includes('/content/') && !pathname.includes('/history')) {
      const contentId = pathname.split('/').pop();
      if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
      }
      
      const status = await workflowService.getWorkflowStatus(contentId);
      if (!status) {
        return NextResponse.json({ error: 'Workflow status not found' }, { status: 404 });
      }
      
      return NextResponse.json(status);
    }
    
    // Get content workflow history
    if (pathname.includes('/history')) {
      const contentId = pathname.split('/')[pathname.split('/').indexOf('content') + 1];
      if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
      }
      
      const history = await workflowService.getWorkflowHistory(contentId);
      return NextResponse.json(history);
    }
    
    // Find workflow items
    const filter: WorkflowFilter = {
      organizationId: searchParams.get('organizationId') || undefined,
      states: searchParams.get('states')?.split(',').map(state => state as WorkflowState) || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
      toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
      searchQuery: searchParams.get('search') || undefined
    };
    
    const items = await workflowService.findWorkflowItems(filter);
    return NextResponse.json(items);
  } catch (error) {
    logger.error('Error handling GET request', { error });
    
    return NextResponse.json(
      { error: error instanceof WorkflowError ? error.message : 'Internal server error' },
      { status: error instanceof WorkflowError ? 400 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { pathname } = new URL(request.url);
    const body = await request.json();
    
    // Create new template
    if (pathname.includes('/templates') && !pathname.includes('/:id')) {
      const input: CreateWorkflowTemplateInput = body;
      
      const organizationId = input.organizationId;
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
      }
      
      // Check if user has necessary role
      const hasPermission = await hasOrganizationRole(
        user.id,
        organizationId,
        [OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN]
      );
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      
      const template = await workflowService.createTemplate(input, user.id);
      return NextResponse.json(template);
    }
    
    // Initialize content workflow
    if (pathname.includes('/init')) {
      const contentId = pathname.split('/')[pathname.split('/').indexOf('content') + 1];
      if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
      }
      
      const { templateId, organizationId } = body;
      if (!templateId) {
        return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
      }
      
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
      }
      
      // Check if user has necessary role
      const hasPermission = await hasOrganizationRole(
        user.id,
        organizationId,
        [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER]
      );
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      
      const status = await workflowService.initContentWorkflow(contentId, templateId, user.id);
      return NextResponse.json(status);
    }
    
    // Transition workflow
    if (pathname.includes('/transition')) {
      const contentId = pathname.split('/')[pathname.split('/').indexOf('content') + 1];
      if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
      }
      
      const input: WorkflowTransitionInput = {
        contentId,
        ...body
      };
      
      const { organizationId } = body;
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
      }
      
      // Check if user has necessary role
      const hasPermission = await hasOrganizationRole(
        user.id,
        organizationId,
        [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER]
      );
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Get user's team role
      const teamRole = await getCurrentUserOrganizationRole(user.id, organizationId);
      
      const status = await workflowService.transitionWorkflow(input, user.id, teamRole);
      return NextResponse.json(status);
    }
    
    // Submit review
    if (pathname.includes('/review')) {
      const contentId = pathname.split('/')[pathname.split('/').indexOf('content') + 1];
      if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
      }
      
      const input: ReviewSubmissionInput = {
        contentId,
        ...body
      };
      
      const status = await workflowService.submitReview(input, user.id);
      return NextResponse.json(status);
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    logger.error('Error handling POST request', { error });
    
    return NextResponse.json(
      { error: error instanceof WorkflowError ? error.message : 'Internal server error' },
      { status: error instanceof WorkflowError ? 400 : 500 }
    );
  }
}

/**
 * PUT /api/content/workflow/templates/{templateId} - Update template
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const path = request.nextUrl.pathname;
    const templateId = path.split('/').pop();
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }
    
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get template to check organization permission
    const template = await workflowService.getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Check organization permission
    const hasPermission = await hasOrganizationRole(
      user.id, 
      template.organizationId, 
      [OrganizationRole.OWNER, OrganizationRole.ADMIN]
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    const input = body as UpdateWorkflowTemplateInput;
    const updatedTemplate = await workflowService.updateTemplate(templateId, input, user.id);
    
    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    logger.error('Error in workflow PUT', { error });
    
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/**
 * DELETE /api/content/workflow/templates/{templateId} - Delete template
 */
export async function DELETE(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const templateId = path.split('/').pop();
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }
    
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get template to check organization permission
    const template = await workflowService.getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Check organization permission
    const hasPermission = await hasOrganizationRole(
      user.id, 
      template.organizationId, 
      [OrganizationRole.OWNER, OrganizationRole.ADMIN]
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    await workflowService.deleteTemplate(templateId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in workflow DELETE', { error });
    
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

/**
 * Helper function to map organization role to team role
 */
async function getCurrentUserOrganizationRole(userId: string, organizationId: string): Promise<TeamRole> {
  // Check each role in order of precedence
  const hasOwnerRole = await hasOrganizationRole(userId, organizationId, [OrganizationRole.OWNER]);
  if (hasOwnerRole) {
    return TeamRole.TEAM_ADMIN;
  }

  const hasAdminRole = await hasOrganizationRole(userId, organizationId, [OrganizationRole.ORG_ADMIN]);
  if (hasAdminRole) {
    return TeamRole.TEAM_ADMIN;
  }

  const hasMemberRole = await hasOrganizationRole(userId, organizationId, [OrganizationRole.MEMBER]);
  if (hasMemberRole) {
    return TeamRole.EDITOR;
  }

  const hasViewerRole = await hasOrganizationRole(userId, organizationId, [OrganizationRole.VIEWER]);
  if (hasViewerRole) {
    return TeamRole.OBSERVER;
  }

  return TeamRole.OBSERVER; // Default fallback
} 