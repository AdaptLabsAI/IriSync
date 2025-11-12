# Role System Usage Guide

## Overview

This guide explains how to properly use the consolidated role systems in IriSync. We've created a centralized approach to manage roles at different levels (system, organization, team) while providing clear mappings between them.

## Importing Roles

Always import roles from the central role file:

```typescript
import { 
  SystemRole,         // For system-level role checks
  OrganizationRole,   // For organization membership checks
  TeamRole,           // For feature-specific checks in teams
  // Helper functions
  mapOrganizationToTeamRole,
  mapTeamToOrganizationRole,
  hasMinimumSystemRole,
  hasMinimumOrganizationRole,
  hasMinimumTeamRole
} from '@/lib/auth/roles';
```

## Understanding Role Hierarchy

### System Roles (User to System)

System roles control access to system-wide features:

```typescript
enum SystemRole {
  SUPER_ADMIN = 'super_admin',  // Complete system access (Irisync staff only)
  ADMIN = 'admin',              // System-level admin (Irisync staff only)
  USER = 'user'                 // Regular user (customer)
}
```

### Organization Roles (User to Organization)

Organization roles define a user's membership level in an organization:

```typescript
enum OrganizationRole {
  OWNER = 'owner',    // Organization owner (full access)
  ADMIN = 'admin',    // Organization administrator (significant control)
  MEMBER = 'member',  // Regular organization member
  VIEWER = 'viewer'   // View-only access
}
```

### Team Roles (User to Feature)

Team roles define permissions for specific features:

```typescript
enum TeamRole {
  ORG_ADMIN = 'org_admin',    // Organization admin in the team
  EDITOR = 'editor',          // Can create and edit content
  CONTRIBUTOR = 'contributor', // Can contribute but needs approval
  VIEWER = 'viewer'           // Read-only access
}
```

## Best Practices

### Checking Roles

1. **For system-wide access:**

```typescript
import { SystemRole, hasMinimumSystemRole } from '@/lib/auth/roles';

// Check if user has system admin access
function canAccessAdminPanel(user) {
  return hasMinimumSystemRole(user.role, SystemRole.ADMIN);
}
```

2. **For organization access:**

```typescript
import { OrganizationRole, hasMinimumOrganizationRole } from '@/lib/auth/roles';

// Check if user can manage organization settings
async function canManageOrgSettings(userId, orgId) {
  const userRole = await getUserOrganizationRole(userId, orgId);
  return hasMinimumOrganizationRole(userRole, OrganizationRole.ADMIN);
}
```

3. **For feature-specific permissions:**

```typescript
import { TeamRole, hasMinimumTeamRole } from '@/lib/auth/roles';

// Check if user can approve content
function canApproveContent(userTeamRole) {
  return hasMinimumTeamRole(userTeamRole, TeamRole.EDITOR);
}
```

### Mapping Between Role Systems

When you need to convert between role systems:

```typescript
import { 
  OrganizationRole, 
  TeamRole,
  mapOrganizationToTeamRole 
} from '@/lib/auth/roles';

// Get organization role from auth service
const orgRole = await getUserOrganizationRole(userId, orgId);

// Map to equivalent team role
const teamRole = mapOrganizationToTeamRole(orgRole);

// Now use teamRole for feature-specific checks
if (hasMinimumTeamRole(teamRole, TeamRole.EDITOR)) {
  // Allow editing content
}
```

## Implementation Details

### Role Storage

1. **System Role**: Stored in the user's document as `role` property
2. **Organization Role**: Stored in organization member records
3. **Team Role**: Derived from organization role or explicitly assigned

### Role Assignment

1. **System Role**: Assigned during user creation or by super admins
2. **Organization Role**: Assigned when a user joins an organization
3. **Team Role**: Typically mapped from organization role, but can be customized

## Common Patterns

### Protected API Routes

```typescript
import { OrganizationRole, hasMinimumOrganizationRole } from '@/lib/auth/roles';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { organizationId } = await request.json();
  
  // Get user's organization role
  const orgRole = await getUserOrganizationRole(user.id, organizationId);
  
  // Check if user has admin access to the organization
  if (!hasMinimumOrganizationRole(orgRole, OrganizationRole.ADMIN)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  
  // Proceed with admin operation...
}
```

### Protected UI Components

```tsx
import { TeamRole } from '@/lib/auth/roles';

function EditButton({ teamRole, onEdit }) {
  // Only render if user has at least editor permissions
  if (teamRole !== TeamRole.EDITOR && teamRole !== TeamRole.ORG_ADMIN) {
    return null;
  }
  
  return <button onClick={onEdit}>Edit</button>;
}
```

### Workflow Actions

```typescript
import { TeamRole } from '@/lib/auth/roles';

const workflowTransitions = [
  {
    fromState: 'draft',
    toState: 'submitted',
    action: 'submit',
    allowedRoles: [TeamRole.CONTRIBUTOR, TeamRole.EDITOR, TeamRole.ORG_ADMIN]
  },
  {
    fromState: 'submitted',
    toState: 'approved',
    action: 'approve',
    allowedRoles: [TeamRole.EDITOR, TeamRole.ORG_ADMIN]
  }
];
```

## Migration From Old Role Systems

When updating existing code:

1. Replace direct imports of role enums with central imports:
   ```typescript
   // OLD
   import { TeamMemberRole } from '@/lib/team/users/team-structure';
   
   // NEW
   import { TeamRole } from '@/lib/auth/roles';
   ```

2. Update role checking functions:
   ```typescript
   // OLD
   if (user.role === 'admin') {
     // ...
   }
   
   // NEW
   import { SystemRole, hasMinimumSystemRole } from '@/lib/auth/roles';
   if (hasMinimumSystemRole(user.role, SystemRole.ADMIN)) {
     // ...
   }
   ```

3. Use mapping functions when crossing role boundaries:
   ```typescript
   // OLD
   function mapToTeamRole(orgRole) {
     // Custom mapping logic
   }
   
   // NEW
   import { mapOrganizationToTeamRole } from '@/lib/auth/roles';
   const teamRole = mapOrganizationToTeamRole(orgRole);
   ```

## Conclusion

By using the consolidated role system consistently across the codebase, we can ensure proper access control and better maintainability. Always import roles from the central `@/lib/auth/roles` file and use the provided helper functions to check permissions or map between role systems. 