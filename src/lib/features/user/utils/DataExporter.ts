import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  UserConfig, 
  ExportFormat, 
  GDPRRequestType,
  UserErrorType 
} from '../types';
import { User, UserUtils, UserActivity, ActivityUtils } from '../models';

/**
 * Export options interface
 */
export interface ExportOptions {
  format: ExportFormat;
  includeProfile: boolean;
  includeActivities: boolean;
  includeTeams: boolean;
  includePermissions: boolean;
  includeAnalytics: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Export result interface
 */
export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: Date;
  error?: string;
}

/**
 * GDPR export data interface
 */
export interface GDPRExportData {
  user: {
    profile: any;
    preferences: any;
    settings: any;
  };
  activities: any[];
  teams: any[];
  permissions: any[];
  analytics: any;
  exportMetadata: {
    requestedAt: Date;
    exportedAt: Date;
    format: ExportFormat;
    version: string;
  };
}

/**
 * Data exporter utility
 * Handles GDPR-compliant data export and user data portability
 */
export class DataExporter {
  private config: UserConfig;

  constructor(config: UserConfig) {
    this.config = config;
  }

  /**
   * Export user data for GDPR compliance
   */
  public async exportUserData(
    userId: string,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const exportOptions: ExportOptions = {
        format: ExportFormat.JSON,
        includeProfile: true,
        includeActivities: true,
        includeTeams: true,
        includePermissions: true,
        includeAnalytics: true,
        ...options
      };

      // Collect user data
      const exportData = await this.collectUserData(userId, exportOptions);
      
      // Generate export file
      const result = await this.generateExportFile(exportData, exportOptions);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export user data'
      };
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string, options: ExportOptions): Promise<GDPRExportData> {
    const exportData: GDPRExportData = {
      user: {
        profile: null,
        preferences: null,
        settings: null
      },
      activities: [],
      teams: [],
      permissions: [],
      analytics: null,
      exportMetadata: {
        requestedAt: new Date(),
        exportedAt: new Date(),
        format: options.format,
        version: '1.0'
      }
    };

    // Collect user profile data
    if (options.includeProfile) {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const user = UserUtils.fromFirestore(userId, userDoc.data() as any);
        exportData.user.profile = this.sanitizeUserData(user);
      }

      // Collect preferences
      const preferencesDoc = await getDoc(doc(firestore, 'user_preferences', userId));
      if (preferencesDoc.exists()) {
        exportData.user.preferences = preferencesDoc.data();
      }

      // Collect settings
      const settingsDoc = await getDoc(doc(firestore, 'user_settings', userId));
      if (settingsDoc.exists()) {
        exportData.user.settings = settingsDoc.data();
      }
    }

    // Collect activity data
    if (options.includeActivities) {
      const activitiesRef = collection(firestore, 'user_activities');
      let activitiesQuery = query(activitiesRef, where('userId', '==', userId));

      const activitiesSnapshot = await getDocs(activitiesQuery);
      exportData.activities = activitiesSnapshot.docs.map(doc => {
        const activity = ActivityUtils.fromFirestore(doc.data() as any);
        return this.sanitizeActivityData(activity, options.dateRange);
      }).filter(Boolean);
    }

    // Collect team data
    if (options.includeTeams) {
      const teamsRef = collection(firestore, 'teams');
      const teamsQuery = query(teamsRef, where('memberIds', 'array-contains', userId));
      
      const teamsSnapshot = await getDocs(teamsQuery);
      exportData.teams = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        role: this.getUserRoleInTeam(userId, doc.data()),
        joinedAt: doc.data().members?.[userId]?.joinedAt,
        permissions: doc.data().members?.[userId]?.permissions || []
      }));
    }

    // Collect permissions data
    if (options.includePermissions) {
      const permissionsRef = collection(firestore, 'user_permissions');
      const permissionsQuery = query(permissionsRef, where('userId', '==', userId));
      
      const permissionsSnapshot = await getDocs(permissionsQuery);
      exportData.permissions = permissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    // Collect analytics data
    if (options.includeAnalytics) {
      const analyticsDoc = await getDoc(doc(firestore, 'user_analytics', userId));
      if (analyticsDoc.exists()) {
        exportData.analytics = analyticsDoc.data();
      }
    }

    return exportData;
  }

  /**
   * Generate export file in specified format
   */
  private async generateExportFile(data: GDPRExportData, options: ExportOptions): Promise<ExportResult> {
    try {
      let content: string;
      let fileName: string;
      let mimeType: string;

      switch (options.format) {
        case ExportFormat.JSON:
          content = JSON.stringify(data, null, 2);
          fileName = `user_data_export_${Date.now()}.json`;
          mimeType = 'application/json';
          break;

        case ExportFormat.CSV:
          content = this.convertToCSV(data);
          fileName = `user_data_export_${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;

        case ExportFormat.XML:
          content = this.convertToXML(data);
          fileName = `user_data_export_${Date.now()}.xml`;
          mimeType = 'application/xml';
          break;

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // In a real implementation, you would upload this to cloud storage
      // For now, we'll return a data URL
      const blob = new Blob([content], { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (this.config.exportRetention || 30));

      return {
        success: true,
        downloadUrl,
        fileName,
        fileSize: blob.size,
        expiresAt
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate export file'
      };
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: GDPRExportData): string {
    const lines: string[] = [];
    
    // Add header
    lines.push('Export Type,Data,Timestamp');
    
    // Add profile data
    if (data.user.profile) {
      lines.push(`Profile,"${JSON.stringify(data.user.profile).replace(/"/g, '""')}","${data.exportMetadata.exportedAt.toISOString()}"`);
    }
    
    // Add activities
    data.activities.forEach(activity => {
      lines.push(`Activity,"${JSON.stringify(activity).replace(/"/g, '""')}","${activity.timestamp}"`);
    });
    
    // Add teams
    data.teams.forEach(team => {
      lines.push(`Team,"${JSON.stringify(team).replace(/"/g, '""')}","${data.exportMetadata.exportedAt.toISOString()}"`);
    });
    
    return lines.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: GDPRExportData): string {
    const xmlParts: string[] = [];
    
    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
    xmlParts.push('<userDataExport>');
    xmlParts.push(`  <metadata>`);
    xmlParts.push(`    <exportedAt>${data.exportMetadata.exportedAt.toISOString()}</exportedAt>`);
    xmlParts.push(`    <format>${data.exportMetadata.format}</format>`);
    xmlParts.push(`    <version>${data.exportMetadata.version}</version>`);
    xmlParts.push(`  </metadata>`);
    
    if (data.user.profile) {
      xmlParts.push('  <profile>');
      xmlParts.push(`    <![CDATA[${JSON.stringify(data.user.profile)}]]>`);
      xmlParts.push('  </profile>');
    }
    
    xmlParts.push('  <activities>');
    data.activities.forEach(activity => {
      xmlParts.push('    <activity>');
      xmlParts.push(`      <![CDATA[${JSON.stringify(activity)}]]>`);
      xmlParts.push('    </activity>');
    });
    xmlParts.push('  </activities>');
    
    xmlParts.push('  <teams>');
    data.teams.forEach(team => {
      xmlParts.push('    <team>');
      xmlParts.push(`      <![CDATA[${JSON.stringify(team)}]]>`);
      xmlParts.push('    </team>');
    });
    xmlParts.push('  </teams>');
    
    xmlParts.push('</userDataExport>');
    
    return xmlParts.join('\n');
  }

  /**
   * Sanitize user data for export (remove sensitive information)
   */
  private sanitizeUserData(user: User): any {
    const sanitized = { ...user };
    
    // Remove sensitive fields
    if ('passwordHash' in sanitized) delete (sanitized as any).passwordHash;
    if ('resetTokens' in sanitized) delete (sanitized as any).resetTokens;
    if ('verificationTokens' in sanitized) delete (sanitized as any).verificationTokens;
    if ('apiKeys' in sanitized) delete (sanitized as any).apiKeys;
    
    return sanitized;
  }

  /**
   * Sanitize activity data for export
   */
  private sanitizeActivityData(activity: UserActivity, dateRange?: { start: Date; end: Date }): any | null {
    // Filter by date range if specified
    if (dateRange) {
      if (activity.timestamp < dateRange.start || activity.timestamp > dateRange.end) {
        return null;
      }
    }
    
    const sanitized = { ...activity };
    
    // Remove sensitive metadata
    if (activity.metadata) {
      if ('sessionId' in activity.metadata) delete (activity.metadata as any).sessionId;
      if ('device' in activity.metadata && activity.metadata.device) {
        // Keep device info but remove any sensitive device identifiers
      }
    }
    
    return sanitized;
  }

  /**
   * Get user's role in a team
   */
  private getUserRoleInTeam(userId: string, teamData: any): string {
    if (teamData.ownerUserId === userId) {
      return 'owner';
    }
    
    if (teamData.managers?.includes(userId)) {
      return 'manager';
    }
    
    return teamData.members?.[userId]?.role || 'member';
  }

  /**
   * Delete user export data (cleanup)
   */
  public async deleteExportData(exportId: string): Promise<boolean> {
    try {
      // In a real implementation, you would delete from cloud storage
      // For now, we'll just return success
      return true;
    } catch (error) {
      console.error('Failed to delete export data:', error);
      return false;
    }
  }

  /**
   * Update exporter configuration
   */
  public updateConfig(config: UserConfig): void {
    this.config = config;
  }
} 