/**
 * Workflow Integration Adapters
 * 
 * This module exports adapters for various workflow and collaboration tools
 * that integrate with the Irisync platform.
 */

export * from './SlackAdapter';

// Note: Other workflow adapters are not yet implemented
// Future exports: TeamsAdapter, TrelloAdapter, AsanaAdapter, ClickUpAdapter, ZapierAdapter, MakeAdapter, MondayAdapter

/**
 * Types of supported workflow tools
 */
export enum WorkflowToolType {
  SLACK = 'slack',
  TEAMS = 'microsoft_teams',
  TRELLO = 'trello',
  ASANA = 'asana',
  CLICKUP = 'clickup',
  ZAPIER = 'zapier',
  MAKE = 'make',
  MONDAY = 'monday'
}

/**
 * Common interface for all workflow tool adapters
 */
export interface WorkflowAdapter {
  /**
   * Get the type of workflow tool
   */
  getType(): WorkflowToolType;
  
  /**
   * Get the authorization URL for OAuth flow
   */
  getAuthorizationUrl(redirectUri: string, state?: string): Promise<string>;
  
  /**
   * Exchange authorization code for access tokens
   */
  exchangeCodeForToken(code: string, redirectUri: string): Promise<any>;
  
  /**
   * Verify if the current token is valid
   */
  verifyToken(accessToken: string): Promise<boolean>;
  
  /**
   * Refresh the access token
   */
  refreshToken(refreshToken: string): Promise<any>;
  
  /**
   * Send a notification to the workflow tool
   */
  sendNotification(accessToken: string, channelId: string, message: string): Promise<any>;
  
  /**
   * Create a task or item in the workflow tool
   */
  createTask(accessToken: string, workspaceId: string, taskData: any): Promise<any>;
  
  /**
   * Get available workspaces or channels
   */
  getWorkspaces(accessToken: string): Promise<any[]>;
} 