// CRM Library Main Export
// Centralized exports for all CRM functionality

// Types (excluding duplicates)
export type {
  CRMPlatform,
  CRMConnectionStatus,
  SyncStatus,
  CRMDataType,
  CRMTokens,
  CRMError,
  CRMErrorType,
  CRMApiResponse,
  SyncConfig,
  CRMConnectionConfig,
  SyncResult,
  BatchResult,
  FirestoreCRMConnection
} from './types';

// Models
export type { CRMConnection } from './models/CRMConnection';
export type { Contact, ContactData, FirestoreContact } from './models/Contact';
export type { Deal, DealData, FirestoreDeal } from './models/Deal';
export type { Lead, LeadData, FirestoreLead } from './models/Lead';

// Main Service
export { CRMService } from './CRMService';

// Adapters
export { HubSpotAdapter } from './adapters/HubSpotAdapter';
export { SalesforceAdapter } from './adapters/SalesforceAdapter';
export { ZohoAdapter } from './adapters/ZohoAdapter';
export { PipedriveAdapter } from './adapters/PipedriveAdapter';
export { DynamicsAdapter } from './adapters/DynamicsAdapter';
export { SugarCRMAdapter } from './adapters/SugarCRMAdapter';

// Sync Engine
export { SyncEngine } from './sync/SyncEngine';
export { ContactSync } from './sync/ContactSync';
export { DealSync } from './sync/DealSync';
export { LeadSync } from './sync/LeadSync';
export { ConflictResolver, ConflictResolutionStrategy } from './sync/ConflictResolver';
export type { ConflictInfo, ConflictResolution } from './sync/ConflictResolver';

// Utilities
export { RateLimiter } from './utils/RateLimiter';
export { CRMValidator } from './utils/CRMValidator';
export type { ValidationResult, ValidationError, ValidationWarning } from './utils/CRMValidator';
export { FieldMapper } from './utils/FieldMapper'; 