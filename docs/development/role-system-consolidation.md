# Role System Consolidation Plan

## Current Role Systems Analysis

The codebase currently has multiple, overlapping role systems that cause confusion and inconsistency:

| Role System | File Location | Purpose | Current Roles |
|-------------|--------------|---------|--------------|
| **UserRole** | `src/lib/models/User.ts` | System-level roles | `SUPER_ADMIN`, `ADMIN`, `USER` |
| **OrganizationRole** | `src/lib/team/users/organization.ts` | Organization membership roles | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` |
| **OrganizationRoleType** | `src/lib/models/Organization.ts` | Duplicate of OrganizationRole | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` |
| **TeamMemberRole** | `src/lib/team/users/team-structure.ts` | Team-specific roles | `ORG_ADMIN`, `EDITOR`, `CONTRIBUTOR`, `VIEWER` |
| **Role Interface** | `src/lib/team/role.ts` | Comprehensive role system | Many system roles with permissions (`owner`, `super_admin`, `admin`, `content-manager`, etc.) |

These inconsistencies lead to:
1. Confusing integrations between systems
2. Duplication of role logic
3. Difficulty in setting up proper permissions
4. Potential security issues when roles don't align correctly

## Analysis of Role Systems

### System-Level Roles (`UserRole`)

These roles define access to the system/platform as a whole:
- **SUPER_ADMIN**: Complete system access, can manage all organizations and system settings
- **ADMIN**: System-level admin with limited global access
- **USER**: Regular user with permissions determined by their organization role

### Organization-Level Roles (`OrganizationRole`/`OrganizationRoleType`)

These define a user's role within an organization:
- **OWNER**: Organization owner with full organization access
- **ADMIN**: Organization administrator with significant control
- **MEMBER**: Regular member of the organization
- **VIEWER/GUEST**: View-only access to organization resources

### Team-Level Roles (`TeamMemberRole`)

These define a user's role within a specific team in an organization:
- **ORG_ADMIN**: Organization admin scoped to the team
- **EDITOR**: Can create and edit content
- **CONTRIBUTOR**: Can contribute content but needs approval
- **VIEWER**: Read-only access to team resources

### Comprehensive Role System (`Role` Interface)

This is a more advanced role system with:
- Detailed permission structures
- Resource and action-based permissions
- Support for custom roles
- Role inheritance through parent roles
- Tier-based availability of roles

## Consolidation Plan

### 1. Keep Distinct Role Levels

We should maintain separation between different levels of roles, as they serve different purposes:

- **System Roles**: Controls who can access system-level features
- **Organization Roles**: Controls organization membership and broad permissions
- **Team Roles**: Controls feature-specific permissions within teams

### 2. Standardize Naming Conventions

All role enums should follow consistent naming:

```typescript
// System-level roles
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user'
}

// Organization-level roles
export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// Team-level roles
export enum TeamRole {
  ADMIN = 'team_admin',
  EDITOR = 'editor',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer'
}
```

### 3. Eliminate Duplicate Role Systems

1. **Remove `OrganizationRoleType`** and use `OrganizationRole` consistently
2. **Rename `TeamMemberRole` to `TeamRole`** for consistency
3. **Keep the comprehensive `Role` system** but ensure it maps cleanly to the simplified enums

### 4. Create Clear Role Mappings

Create explicit mapping functions between different role systems:

```typescript
// Map organization role to team role
export function mapOrganizationToTeamRole(orgRole: OrganizationRole): TeamRole {
  switch (orgRole) {
    case OrganizationRole.OWNER:
    case OrganizationRole.ADMIN:
      return TeamRole.ADMIN;
    case OrganizationRole.MEMBER:
      return TeamRole.EDITOR;
    case OrganizationRole.VIEWER:
    default:
      return TeamRole.VIEWER;
  }
}

// Map comprehensive role to organization role
export function mapRoleToOrganizationRole(roleId: string): OrganizationRole {
  switch (roleId) {
    case 'role_owner':
      return OrganizationRole.OWNER;
    case 'role_org_admin':
      return OrganizationRole.ADMIN;
    case 'role_content_manager':
    case 'role_content_creator':
      return OrganizationRole.MEMBER;
    case 'role_guest':
      return OrganizationRole.VIEWER;
    default:
      return OrganizationRole.MEMBER;
  }
}
```

### 5. Implement Comprehensive Permission System

Continue developing the comprehensive `Role` system in `src/lib/team/role.ts` but ensure:

1. Role IDs follow consistent naming (`system_super_admin`, `org_admin`, `team_editor`)
2. Clear mapping to the simplified enum roles
3. Documentation on which permissions apply at which levels

### 6. Consolidate Workflow with Team Roles

For workflow functionality, use `TeamRole` instead of creating a special `WorkflowRole`:

```typescript
// Workflow transitions with team roles
export interface WorkflowTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  action: WorkflowAction;
  allowedRoles: TeamRole[];
}
```

### 7. Migration Plan

1. **Phase 1: Fix Imports and Type Definitions**
   - Update imports to use the correct role systems
   - Fix type definitions for consistency
   - Create proper mapping functions

2. **Phase 2: Refactor Role Usage**
   - Update all components and services to use the correct role systems
   - Implement proper role checks with the new structure
   - Add deprecation warnings for old role systems

3. **Phase 3: Database Migration**
   - Create migration scripts to update stored roles in the database
   - Update Firebase security rules to reflect the new role system

## Implementation Tasks

### Immediate Tasks

1. Create a central `roles.ts` file that exports all role systems and mapping functions
2. Update imports across the codebase to use this central file
3. Fix the workflow system to use the `TeamRole` enum
4. Document the role hierarchy and permissions in developer documentation

### Medium-Term Tasks

1. Refactor the `OrganizationRoleType` usage to use `OrganizationRole`
2. Ensure consistent role checks throughout the codebase
3. Implement proper role inheritance between systems

### Long-Term Tasks

1. Migrate to a fully permission-based system using the comprehensive `Role` interface
2. Create a role management UI for organization admins
3. Implement audit logging for role changes

## Conclusion

By standardizing our role systems and creating clear mappings between them, we can ensure that:

1. Organization owners can effectively delegate tasks and permissions
2. The system provides consistent access control
3. Developers can easily understand and implement role-based features
4. We maintain a clear separation between system, organization, and team permissions

This consolidation will significantly improve the maintainability and security of the application while enabling proper delegation of tasks within organizations. 