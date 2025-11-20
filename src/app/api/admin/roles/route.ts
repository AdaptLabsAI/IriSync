import { NextRequest, NextResponse } from 'next/server';
import { systemRoles, createRole, Role, Permission } from '@/lib/features/team/role';
import { RoleService } from '@/lib/features/team/role-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import TeamAuditLogger from '@/lib/features/team/activity/audit-logger';
import { withAdmin } from '@/lib/features/auth/route-handlers';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Handler for GET /api/admin/roles - Get all roles
export const GET = withAdmin(async (req: NextRequest, adminUser: any) => {
  try {
    // Get organization ID from the session (using organization-centric approach)
    const organizationId = adminUser.currentOrganizationId || adminUser.personalOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all roles for the organization
    const roleService = new RoleService();
    const roles = await roleService.getOrganizationRoles(organizationId);

    // Return roles
    return NextResponse.json({ roles });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles', details: error.message },
      { status: 500 }
    );
  }
});

// Handler for POST /api/admin/roles - Create new role
export const POST = withAdmin(async (req: NextRequest, adminUser: any) => {
  try {
    // Get organization ID from the session (using organization-centric approach)
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

    // Validate permissions format
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

    // Create the role
    const roleService = new RoleService();
    const role = await roleService.createCustomRole(
      organizationId,
      name,
      description,
      permissions as Permission[],
      adminUser.id,
      parentRoles
    );

    // Log admin action
    const auditLogger = new TeamAuditLogger();
    await auditLogger.logUserManagementEvent(
      adminUser.id,
      'create_role',
      role.id,
      organizationId,
      null,
      { name, description }
    );

    // Return the created role
    return NextResponse.json({ role }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create role', details: error.message },
      { status: 500 }
    );
  }
}); 