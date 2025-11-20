import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { TeamAuditLogger, AuditLogCategory, AuditLogSeverity, AuditLogEntry } from '@/lib/features/team/activity/audit-logger';
import { getFirestore } from '@/lib/core/firebase/admin';
import { logger as appLogger } from '@/lib/core/logging/logger';
import { Parser } from '@json2csv/plainjs';

// Configure route as fully dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const auditLogger = new TeamAuditLogger();

function parseMultiValue(param: string | null): string[] | undefined {
  if (!param) return undefined;
  return param.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Get the total count of audit logs matching the given filters
 * This is needed for proper pagination
 */
async function getAuditLogCount(filters: any): Promise<number> {
  try {
    const db = getFirestore();
    let query: any = db.collection('audit_logs');
    
    // Apply filters to count query
    // We need to replicate the same filters from getAuditLogs
    
    // Multi-value filters
    if (filters.severities && filters.severities.length > 0 && filters.severities.length <= 10) {
      query = query.where('severity', 'in', filters.severities);
    } else if (filters.severity) {
      query = query.where('severity', '==', filters.severity);
    }
    
    if (filters.categories && filters.categories.length > 0 && filters.categories.length <= 10) {
      query = query.where('category', 'in', filters.categories);
    } else if (filters.category) {
      query = query.where('category', '==', filters.category);
    }
    
    // Apply other filters
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    
    if (filters.resourceId) {
      query = query.where('resourceId', '==', filters.resourceId);
    }
    
    if (filters.resourceType) {
      query = query.where('resourceType', '==', filters.resourceType);
    }
    
    if (filters.organizationId) {
      query = query.where('organizationId', '==', filters.organizationId);
    }
    
    if (filters.teamId) {
      query = query.where('teamId', '==', filters.teamId);
    }
    
    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }
    
    // Apply date range filters
    if (filters.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }
    
    // Execute count
    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (error) {
    appLogger.error('Error getting audit log count', { error });
    // Return a large number as fallback to enable pagination
    return 1000;
  }
}

/**
 * Apply fuzzy search to log entries
 */
function applyFuzzySearch(logs: AuditLogEntry[], fuzzyUser?: string | null, fuzzyAction?: string | null): AuditLogEntry[] {
  if (!fuzzyUser && !fuzzyAction) return logs;
  
  return logs.filter(log => {
    // Apply fuzzy user filter
    if (fuzzyUser && (!log.userId || !log.userId.toLowerCase().includes(fuzzyUser.toLowerCase()))) {
      return false;
    }
    
    // Apply fuzzy action filter
    if (fuzzyAction && (!log.action || !log.action.toLowerCase().includes(fuzzyAction.toLowerCase()))) {
      return false;
    }
    
    return true;
  });
}

/**
 * GET handler for retrieving audit logs
 * Restricted to Admin role
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const url = new URL(request.url);
    const filters: any = {};
    
    // Track start time for performance logging
    const startTime = Date.now();
    
    // Multi-value filters
    const severities = parseMultiValue(url.searchParams.get('severities'));
    const categories = parseMultiValue(url.searchParams.get('categories'));
    if (severities && severities.length > 0) filters.severities = severities;
    if (categories && categories.length > 0) filters.categories = categories;
    
    // Single-value filters
    if (url.searchParams.get('userId')) filters.userId = url.searchParams.get('userId');
    if (url.searchParams.get('category')) filters.category = url.searchParams.get('category') as AuditLogCategory;
    if (url.searchParams.get('severity')) filters.severity = url.searchParams.get('severity') as AuditLogSeverity;
    if (url.searchParams.get('resourceId')) filters.resourceId = url.searchParams.get('resourceId');
    if (url.searchParams.get('resourceType')) filters.resourceType = url.searchParams.get('resourceType');
    if (url.searchParams.get('organizationId')) filters.organizationId = url.searchParams.get('organizationId');
    if (url.searchParams.get('teamId')) filters.teamId = url.searchParams.get('teamId');
    if (url.searchParams.get('action')) filters.action = url.searchParams.get('action');
    
    // Date filters
    if (url.searchParams.get('startDate')) {
      try {
        filters.startDate = new Date(url.searchParams.get('startDate')!);
      } catch (error) {
        appLogger.warn('Invalid startDate parameter', { error });
      }
    }
    
    if (url.searchParams.get('endDate')) {
      try {
        filters.endDate = new Date(url.searchParams.get('endDate')!);
      } catch (error) {
        appLogger.warn('Invalid endDate parameter', { error });
      }
    }
    
    // Fuzzy search parameters
    const fuzzyUser = url.searchParams.get('fuzzyUser');
    const fuzzyAction = url.searchParams.get('fuzzyAction');
    
    // Pagination parameters
    const limit = url.searchParams.get('limit') 
      ? Math.min(parseInt(url.searchParams.get('limit')!), 1000) // Cap at 1000 for performance
      : 100;
    const offset = url.searchParams.get('offset') 
      ? parseInt(url.searchParams.get('offset')!) 
      : 0;
    
    // Output format
    const format = url.searchParams.get('format') || 'json';
    
    // Get total count first for pagination if requested
    let total = 0;
    if (url.searchParams.get('includeTotal') === 'true') {
      total = await getAuditLogCount(filters);
    }
    
    // Fetch logs using the TeamAuditLogger service
    const logs = await auditLogger.getAuditLogs(filters, limit, offset);
    
    // Apply fuzzy search filters if needed
    const filteredLogs = applyFuzzySearch(logs, fuzzyUser, fuzzyAction);
    
    // If total wasn't explicitly requested, estimate it based on result size
    if (!url.searchParams.get('includeTotal')) {
      total = filteredLogs.length < limit 
        ? offset + filteredLogs.length // Reached the end
        : offset + filteredLogs.length + 1; // More results exist
    }
    
    // Log performance metrics
    const executionTime = Date.now() - startTime;
    appLogger.info('Audit log query executed', {
      adminId: adminUser.id,
      filters,
      resultCount: filteredLogs.length,
      totalCount: total,
      executionTimeMs: executionTime
    });
    
    // Add the request to the audit log
    await auditLogger.log({
      userId: adminUser.id,
      category: AuditLogCategory.SECURITY,
      action: 'view_audit_logs',
      severity: AuditLogSeverity.INFO,
      metadata: {
        filters,
        resultCount: filteredLogs.length,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      }
    });
    
    // Handle CSV export if requested
    if (format === 'csv') {
      try {
        // Transform data for CSV export
        const csvData = filteredLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp.toISOString(),
          userId: log.userId,
          category: log.category,
          action: log.action,
          severity: log.severity,
          resourceId: log.resourceId || '',
          resourceType: log.resourceType || '',
          organizationId: log.organizationId || '',
          teamId: log.teamId || '',
          ipAddress: log.ipAddress || '',
          userAgent: log.userAgent || '',
          metadata: JSON.stringify(log.metadata || {})
        }));
        
        // Generate CSV
        const parser = new Parser();
        const csv = parser.parse(csvData);
        
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`
          }
        });
      } catch (csvError) {
        appLogger.error('Error generating CSV export', { error: csvError });
        return NextResponse.json(
          { error: 'Failed to generate CSV export', details: (csvError as Error).message }, 
          { status: 500 }
        );
      }
    }
    
    // Default: Return JSON response
    return NextResponse.json({ 
      logs: filteredLogs, 
      total, 
      meta: {
        limit,
        offset,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        executionTimeMs: executionTime
      }
    });
  } catch (error) {
    appLogger.error('Failed to fetch audit logs', { 
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser?.id
    });
    
    return NextResponse.json({ 
      error: 'Failed to fetch audit logs', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}); 