/**
 * Team module exports
 */

// Export team structure types and functions
export * from './users/team-structure';

// Export role-related functionality
export * from './role';

// Export team services
export { default as TeamRoleService } from './role-service';

// Export team activity tracking
export * from './activity/metrics';

// Export team workflow management
export * from './workflow';
