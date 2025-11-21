// Re-export all types from models
export * from './models';

// Add AutomationAction as an alias or import if it exists elsewhere
// For now, create a basic type
export interface AutomationAction {
  id: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface AutomationTrigger {
  id: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
}
