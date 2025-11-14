import { NextRequest, NextResponse } from 'next/server';
import { Role, Permission } from '@/lib/features/team/role';
import { RoleService } from '@/lib/features/team/role-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { TeamAuditLogger, AuditLogCategory, AuditLogSeverity } from '@/lib/features/team/activity/audit-logger';
import { withAdmin } from '@/lib/features/auth/route-handlers';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Helper function for audit logging
async function logAdminAction(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
}) {
  try {
    const auditLogger = new TeamAuditLogger();
    await auditLogger.log({
      userId: params.userId,
      category: AuditLogCategory.TEAM,
      action: `${params.action}_${params.resource}`,
      severity: AuditLogSeverity.INFO,
      resourceId: params.resourceId,
      resourceType: params.resource,
      metadata: params.details
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw to prevent disrupting the main flow
  }
}

// Handler for PUT /api/admin/roles/[id] - Update a role
export const PUT = withAdmin(async (req: NextRequest, adminUser: any) => {
  try {
    const url = new URL(req.url);
    const roleId = url.pathname.split('/').pop();
    const organizationId = adminUser.currentOrganizationId || adminUser.personalOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    // Parse request body
    const body = await req.json();
    const { name, description, permissions, parentRoles } = body;
    // Validate request
    if (!name || !description || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Invalid request. Missing required fields' },
        { status: 400 }
      );
    }
    if (!permissions.every(p => 
      typeof p === 'object' && 
      typeof p.resource === 'string' && 
      Array.isArray(p.actions) && 
      p.actions.every((a: any) => typeof a === 'string')
    )) {
      return NextResponse.json(
        { error: 'Invalid permissions format' },
        { status: 400 }
      );
    }
    // Update the role
    const roleService = new RoleService();    
    const role = await roleService.updateCustomRole(      
      organizationId,      
      roleId!,
      {
        name,
        description,
        permissions: permissions as Permission[],
        parentRoles,
      },
      adminUser.id
    );
    // Log admin action
    await logAdminAction({
      userId: adminUser.id,
      action: 'update',
      resource: 'role',
      resourceId: roleId!,
      details: { name, description },
    });
    return NextResponse.json({ role });
  } catch (error: any) {
    console.error('Error updating role:', error);
    if (error.message === 'Role not found') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    } else if (error.message === 'System roles cannot be modified') {
      return NextResponse.json({ error: 'System roles cannot be modified' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Failed to update role', details: error.message },
      { status: 500 }
    );
  }
});

// Handler for DELETE /api/admin/roles/[id] - Delete a role
export const DELETE = withAdmin(async (req: NextRequest, adminUser: any) => {
  try {
    const url = new URL(req.url);
    const roleId = url.pathname.split('/').pop();
    const organizationId = adminUser.currentOrganizationId || adminUser.personalOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const roleService = new RoleService();
    await roleService.deleteCustomRole(
      organizationId,
      roleId!,
      adminUser.id
    );
    await logAdminAction({
      userId: adminUser.id,
      action: 'delete',
      resource: 'role',
      resourceId: roleId!,
      details: { roleId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    if (error.message === 'Role not found') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    } else if (error.message === 'System roles cannot be deleted') {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 403 });
    } else if (error.message === 'Cannot delete role that is assigned to users') {
      return NextResponse.json({ 
        error: 'Cannot delete role that is assigned to users',
        details: 'You must reassign users before deleting this role'
      }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to delete role', details: error.message },
      { status: 500 }
    );
  }
}); 