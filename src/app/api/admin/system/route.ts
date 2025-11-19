import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/features/auth/route-handlers';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getFirestore as getAdminFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import * as admin from 'firebase-admin';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  setDoc,
  Timestamp,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';
import { RedisService } from '@/lib/core/cache/redis-service';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Collection name constants
const SYSTEM_SETTINGS_COLLECTION = 'systemSettings';
const AUDIT_LOGS_COLLECTION = 'auditLogs';
const SYSTEM_LOGS_COLLECTION = 'systemLogs';
const USERS_COLLECTION = 'users';

// Get admin firestore instance
const adminFirestore = getAdminFirestore();

// For memory cache access
declare global {
  var memoryCache: {
    clear(): void;
    clearNamespace?(namespace: string): void;
  } | undefined;
}

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(adminUser: { id: string, email: string, role: string }, action: string, details: any) {
  try {
    const logRef = adminFirestore.collection(AUDIT_LOGS_COLLECTION).doc();
    await logRef.set({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: adminUser.role,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    logger.error('Failed to create audit log', { error, action, adminId: adminUser.id });
  }
}

/**
 * System settings validation schema
 */
const systemSettingsSchema = z.object({
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string().optional(),
    plannedEndTime: z.string().datetime().optional().or(z.instanceof(Timestamp))
  }).optional(),
  
  security: z.object({
    passwordPolicy: z.object({
      minLength: z.number().int().min(8).max(32),
      requireUppercase: z.boolean(),
      requireLowercase: z.boolean(),
      requireNumbers: z.boolean(),
      requireSpecialChars: z.boolean(),
      passwordExpiryDays: z.number().int().min(0)
    }),
    mfaPolicy: z.object({
      requireMfa: z.boolean(),
      exemptRoles: z.array(z.string()).optional()
    }),
    loginAttempts: z.object({
      maxAttempts: z.number().int().min(1),
      lockoutDurationMinutes: z.number().int().min(1)
    })
  }).optional(),
  
  email: z.object({
    fromName: z.string(),
    fromEmail: z.string().email(),
    replyTo: z.string().email().optional(),
    templates: z.record(z.string()).optional()
  }).optional(),
  
  ai: z.object({
    providers: z.array(z.object({
      name: z.string(),
      enabled: z.boolean(),
      models: z.array(z.object({
        id: z.string(),
        name: z.string(),
        enabled: z.boolean(),
        contextWindow: z.number().int().optional(),
        maxOutputTokens: z.number().int().optional(),
        costPerInputToken: z.number().optional(),
        costPerOutputToken: z.number().optional()
      }))
    })),
    defaultProvider: z.string(),
    defaultModel: z.string(),
    rateLimit: z.object({
      enabled: z.boolean(),
      requestsPerMinute: z.number().int(),
      tokensPerDay: z.number().int().optional()
    })
  }).optional(),
  
  features: z.record(z.object({
    enabled: z.boolean(),
    restrictByRole: z.boolean().optional(),
    allowedRoles: z.array(z.string()).optional(),
    restrictBySubscription: z.boolean().optional(),
    allowedSubscriptions: z.array(z.string()).optional()
  })).optional(),
  
  integration: z.record(z.object({
    enabled: z.boolean(),
    config: z.record(z.any()).optional()
  })).optional()
});

/**
 * Format system settings for response
 */
function formatSettingsForResponse(settingsData: any) {
  // Remove sensitive data
  const formattedSettings = { ...settingsData };
  
  // Convert timestamps
  if (formattedSettings.updatedAt instanceof Timestamp) {
    formattedSettings.updatedAt = formattedSettings.updatedAt.toDate().toISOString();
  }
  
  if (formattedSettings.maintenance?.plannedEndTime instanceof Timestamp) {
    formattedSettings.maintenance.plannedEndTime = 
      formattedSettings.maintenance.plannedEndTime.toDate().toISOString();
  }
  
  return formattedSettings;
}

/**
 * GET handler for retrieving system settings and logs
 * Restricted to Super Admin role
 */
export const GET = withSuperAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const section = url.searchParams.get('section') || 'all';
    const logsType = url.searchParams.get('logsType') || 'audit';
    const logsLimit = parseInt(url.searchParams.get('logsLimit') || '100');
    
    // Validate parameters
    if (logsType !== 'audit' && logsType !== 'system' && logsType !== 'error') {
      return NextResponse.json(
        { error: 'Invalid logsType parameter. Must be "audit", "system", or "error".' },
        { status: 400 }
      );
    }
    
    if (isNaN(logsLimit) || logsLimit < 1 || logsLimit > 1000) {
      return NextResponse.json(
        { error: 'Invalid logsLimit parameter. Must be between 1 and 1000.' },
        { status: 400 }
      );
    }

    const response: any = {};
    
    // Get system settings if requested
    if (section === 'all' || section === 'settings') {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const settingsDoc = await getDoc(doc(firestore, SYSTEM_SETTINGS_COLLECTION, 'general'));
      
      if (settingsDoc.exists()) {
        response.settings = formatSettingsForResponse(settingsDoc.data());
      } else {
        // Return default settings if none exist
        response.settings = {
          maintenance: { enabled: false },
          security: {
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: true,
              passwordExpiryDays: 0
            },
            mfaPolicy: {
              requireMfa: false,
              exemptRoles: []
            },
            loginAttempts: {
              maxAttempts: 5,
              lockoutDurationMinutes: 30
            }
          },
          updatedAt: new Date().toISOString()
        };
      }
    }
    
    // Get logs if requested
    if (section === 'all' || section === 'logs') {
      let logsCollection = AUDIT_LOGS_COLLECTION;
      
      if (logsType === 'system') {
        logsCollection = SYSTEM_LOGS_COLLECTION;
      } else if (logsType === 'error') {
        logsCollection = SYSTEM_LOGS_COLLECTION;
      }
      
      let logsQuery = query(
        collection(firestore, logsCollection),
        orderBy('timestamp', 'desc'),
        limit(logsLimit)
      );
      
      // Add level filter for error logs
      if (logsType === 'error') {
        logsQuery = query(
          collection(firestore, logsCollection),
          where('level', '==', 'error'),
          orderBy('timestamp', 'desc'),
          limit(logsLimit)
        );
      }
      
      const logsSnapshot = await getDocs(logsQuery);
      
      response.logs = logsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Format timestamp
        if (data.timestamp instanceof Timestamp) {
          data.timestamp = data.timestamp.toDate().toISOString();
        }
        
        return {
          id: doc.id,
          ...data
        };
      });
    }
    
    // Get system stats if requested
    if (section === 'all' || section === 'stats') {
      // Get analytics data for active users
      const now = new Date();
      const dayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
      
      // Get daily, weekly, and monthly active users
      const [dailyUsers, weeklyUsers, monthlyUsers] = await Promise.all([
        // Daily active users - users who logged in today
        getDocs(query(
          collection(firestore, USERS_COLLECTION),
          where('lastLoginAt', '>=', Timestamp.fromDate(dayStart))
        )),
        
        // Weekly active users - users who logged in this week
        getDocs(query(
          collection(firestore, USERS_COLLECTION),
          where('lastLoginAt', '>=', Timestamp.fromDate(weekStart))
        )),
        
        // Monthly active users - users who logged in this month
        getDocs(query(
          collection(firestore, USERS_COLLECTION),
          where('lastLoginAt', '>=', Timestamp.fromDate(monthStart))
        ))
      ]);
      
      // Get content counts from respective collections
      const [posts, media, knowledge] = await Promise.all([
        // Count posts
        getDocs(query(
          collection(firestore, 'posts'),
          where('deleted', '==', false)
        )),
        
        // Count media items
        getDocs(query(
          collection(firestore, 'media')
        )),
        
        // Count knowledge base articles
        getDocs(query(
          collection(firestore, 'knowledgeBase')
        ))
      ]);
      
      // Get API usage from the last 24 hours
      const apiUsageCollection = collection(firestore, 'apiUsage');
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      
      // First check if we have pre-aggregated stats
      const apiStatsRef = doc(firestore, 'systemStats', 'apiUsage');
      const apiStatsDoc = await getDoc(apiStatsRef);
      
      let totalApiUsage = 0;
      const apiUsageByEndpoint: Record<string, number> = {};
      
      if (apiStatsDoc.exists() && 
          apiStatsDoc.data().lastUpdated instanceof Timestamp && 
          apiStatsDoc.data().lastUpdated.toDate() > dayAgo) {
        // Use pre-aggregated stats if they're recent enough
        const apiStats = apiStatsDoc.data();
        totalApiUsage = apiStats.dailyTotal || 0;
        
        // Get endpoint breakdown
        if (apiStats.byEndpoint) {
          Object.assign(apiUsageByEndpoint, apiStats.byEndpoint);
        }
      } else {
        // If no recent pre-aggregated stats, query raw data
        const apiUsageSnapshot = await getDocs(query(
          apiUsageCollection,
          where('timestamp', '>=', Timestamp.fromDate(dayAgo)),
          orderBy('timestamp', 'desc')
        ));
        
        // Calculate total API usage and breakdown by endpoint
        apiUsageSnapshot.forEach(doc => {
          const data = doc.data();
          totalApiUsage += 1;
          
          // Aggregate by endpoint
          const endpoint = data.endpoint || 'unknown';
          apiUsageByEndpoint[endpoint] = (apiUsageByEndpoint[endpoint] || 0) + 1;
        });
        
        // Store the aggregated stats for future use
        try {
          await setDoc(apiStatsRef, {
            dailyTotal: totalApiUsage,
            byEndpoint: apiUsageByEndpoint,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          // Log but continue if stat storage fails
          logger.warn('Failed to update API usage stats', { error });
        }
      }
      
      // Return the complete stats object
      response.stats = {
        activeUsers: {
          daily: dailyUsers.size,
          weekly: weeklyUsers.size,
          monthly: monthlyUsers.size
        },
        contentCount: {
          posts: posts.size,
          media: media.size,
          knowledge: knowledge.size
        },
        apiUsage: {
          total: totalApiUsage,
          byEndpoint: apiUsageByEndpoint
        },
        systemHealth: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Log admin action
    await logAdminAction(adminUser, 'VIEW_SYSTEM_INFO', {
      section,
      logsType: section === 'logs' ? logsType : undefined
    });
    
    // Return response
    return NextResponse.json(response);
  } catch (error) {
    // Log error details
    logger.error('Error in admin system GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve system information',
        message: 'An unexpected error occurred while retrieving system information. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler for system operations like cache clearing, log purging, etc.
 * Restricted to Super Admin role
 */
export const POST = withSuperAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Check if operation type is provided
    if (!body.operation) {
      return NextResponse.json(
        { error: 'Operation type is required' },
        { status: 400 }
      );
    }
    
    const operation = body.operation;
    
    // Handle different operations
    switch (operation) {
      case 'clearCache':
        // Implement cache clearing logic based on target
        const target = body.target || 'all';
        const redisService = new RedisService();
        
        try {
          switch (target) {
            case 'all':
              // Clear all caches
              await redisService.clear();
              // Clear memory caches if applicable
              if (global.memoryCache) {
                global.memoryCache.clear();
              }
              break;
              
            case 'api':
              // Clear API response cache
              await redisService.delete('api:*');
              break;
              
            case 'content':
              // Clear content-related caches
              await redisService.delete('content:*');
              break;
              
            case 'user':
              // Clear user-related caches
              await redisService.delete('user:*');
              break;
              
            case 'analytics':
              // Clear analytics caches
              await redisService.delete('analytics:*');
              break;
              
            default:
              // Clear specific namespace
              await redisService.delete(`${target}:*`);
          }
          
          logger.info('Cache cleared successfully', { 
            adminId: adminUser.id,
            target
          });
          
          // Log admin action
          await logAdminAction(adminUser, 'CLEAR_SYSTEM_CACHE', {
            target
          });
          
          return NextResponse.json({
            message: 'Cache cleared successfully',
            details: {
              clearedAt: new Date().toISOString(),
              target
            }
          });
        } catch (error) {
          logger.error('Error clearing cache', {
            error: error instanceof Error ? error.message : String(error),
            adminId: adminUser.id,
            target
          });
          
          return NextResponse.json({ 
            error: 'Failed to clear cache', 
            message: 'An error occurred while clearing the cache.'
          }, { status: 500 });
        }
        
      case 'purgeLogs':
        // Implement log purging logic
        if (!body.logType) {
          return NextResponse.json(
            { error: 'Log type is required for purging' },
            { status: 400 }
          );
        }
        
        const maxAge = body.maxAgeDays || 30; // Default to 30 days
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() - maxAge);
        const maxTimestamp = Timestamp.fromDate(maxDate);
        
        try {
          // Determine which collection to purge
          let logsCollection: string;
          switch (body.logType) {
            case 'audit':
              logsCollection = AUDIT_LOGS_COLLECTION;
              break;
            case 'system':
            case 'error':
              logsCollection = SYSTEM_LOGS_COLLECTION;
              break;
            default:
              return NextResponse.json(
                { error: `Invalid log type: ${body.logType}` },
                { status: 400 }
              );
          }
          
          // Query for logs older than the max age
          const logsQuery = query(
            collection(firestore, logsCollection),
            where('timestamp', '<', maxTimestamp),
            orderBy('timestamp', 'asc')
          );
          
          // Get logs to delete
          const logsSnapshot = await getDocs(logsQuery);
          
          if (logsSnapshot.empty) {
            return NextResponse.json({
              message: `No ${body.logType} logs found older than ${maxAge} days`,
              details: {
                purgedAt: new Date().toISOString(),
                logType: body.logType,
                maxAgeDays: maxAge,
                logsDeleted: 0
              }
            });
          }
          
          // Delete logs in batches (Firestore has a limit of 500 operations per batch)
          let totalDeleted = 0;
          const batchSize = 450; // Slightly below the limit for safety
          const docs = logsSnapshot.docs;
          
          for (let i = 0; i < docs.length; i += batchSize) {
            const batch = writeBatch(firestore);
            const batchDocs = docs.slice(i, i + batchSize);
            
            batchDocs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            await batch.commit();
            totalDeleted += batchDocs.length;
            
            // Log progress for long operations
            if (docs.length > batchSize) {
              logger.info(`Purged batch of ${batchDocs.length} logs, total: ${totalDeleted}/${docs.length}`, {
                adminId: adminUser.id,
                logType: body.logType
              });
            }
          }
          
          // Log admin action
          await logAdminAction(adminUser, 'PURGE_LOGS', {
            logType: body.logType,
            maxAgeDays: maxAge,
            logsDeleted: totalDeleted
          });
          
          return NextResponse.json({
            message: `${body.logType} logs older than ${maxAge} days purged successfully`,
            details: {
              purgedAt: new Date().toISOString(),
              logType: body.logType,
              maxAgeDays: maxAge,
              logsDeleted: totalDeleted
            }
          });
        } catch (error) {
          logger.error('Error purging logs', {
            error: error instanceof Error ? error.message : String(error),
            adminId: adminUser.id,
            logType: body.logType
          });
          
          return NextResponse.json({ 
            error: 'Failed to purge logs', 
            message: 'An error occurred while purging logs.'
          }, { status: 500 });
        }
        
      case 'rebuildIndex':
        // Implement search index rebuilding logic
        if (!body.indexType) {
          return NextResponse.json(
            { error: 'Index type is required for rebuilding' },
            { status: 400 }
          );
        }
        
        try {
          // Determine which collection to reindex
          let collectionName: string;
          let batchSize = 500;
          let processingFunction: Function;
          
          switch (body.indexType) {
            case 'content':
              collectionName = 'posts';
              // Define content indexing function
              processingFunction = async (docs: any[]) => {
                const batch = writeBatch(firestore);
                
                docs.forEach(doc => {
                  const data = doc.data();
                  batch.update(doc.ref, { 
                    searchLastUpdated: serverTimestamp(),
                    searchVector: data.content + ' ' + data.title
                  });
                });
                
                return batch.commit();
              };
              break;
              
            case 'users':
              collectionName = 'users';
              // Define users indexing function
              processingFunction = async (docs: any[]) => {
                const batch = writeBatch(firestore);
                
                docs.forEach(doc => {
                  const data = doc.data();
                  batch.update(doc.ref, { 
                    searchLastUpdated: serverTimestamp(),
                    searchTerms: `${data.firstName} ${data.lastName} ${data.email}`
                  });
                });
                
                return batch.commit();
              };
              break;
              
            case 'media':
              collectionName = 'media';
              // Define media indexing function
              processingFunction = async (docs: any[]) => {
                const batch = writeBatch(firestore);
                
                docs.forEach(doc => {
                  const data = doc.data();
                  batch.update(doc.ref, { 
                    searchLastUpdated: serverTimestamp(),
                    searchTerms: [data.name, data.description, ...data.tags].join(' ')
                  });
                });
                
                return batch.commit();
              };
              break;
              
            case 'knowledge':
              collectionName = 'knowledgeBase';
              // Define knowledge base indexing function
              processingFunction = async (docs: any[]) => {
                const batch = writeBatch(firestore);
                
                docs.forEach(doc => {
                  const data = doc.data();
                  batch.update(doc.ref, { 
                    searchLastUpdated: serverTimestamp(),
                    searchVector: data.title + ' ' + data.content + ' ' + data.tags.join(' ')
                  });
                });
                
                return batch.commit();
              };
              break;
              
            default:
              return NextResponse.json(
                { error: `Invalid index type: ${body.indexType}` },
                { status: 400 }
              );
          }
          
          // Start the reindexing job
          const jobRef = await adminFirestore.collection('jobs').add({
            type: 'rebuildIndex',
            status: 'queued',
            indexType: body.indexType,
            collection: collectionName,
            createdAt: serverTimestamp(),
            createdBy: adminUser.id,
            progress: 0,
            total: 0
          });
          
          // Start the background job
          setTimeout(async () => {
            try {
              // Update job status
              await adminFirestore.collection('jobs').doc(jobRef.id).update({
                status: 'processing',
                startedAt: serverTimestamp()
              });
              
              // Get total document count
              const countSnapshot = await getDocs(query(collection(firestore, collectionName), limit(0)));
              const totalDocs = countSnapshot.size;
              
              // Update job with total
              await adminFirestore.collection('jobs').doc(jobRef.id).update({
                total: totalDocs
              });
              
              // Process in batches
              let processed = 0;
              let lastDoc: any = null;
              
              while (processed < totalDocs) {
                let q = query(
                  collection(firestore, collectionName),
                  orderBy('createdAt', 'asc'),
                  limit(batchSize)
                );
                
                if (lastDoc) {
                  q = query(q, where('createdAt', '>', lastDoc));
                }
                
                const snapshot = await getDocs(q);
                
                if (snapshot.empty) break;
                
                await processingFunction(snapshot.docs);
                
                processed += snapshot.docs.length;
                if (snapshot.docs.length > 0) {
                  const lastDocData = snapshot.docs[snapshot.docs.length - 1].data();
                  if (lastDocData && lastDocData.createdAt) {
                    lastDoc = lastDocData.createdAt;
                  }
                }
                
                // Update progress
                await adminFirestore.collection('jobs').doc(jobRef.id).update({
                  progress: processed,
                  updatedAt: serverTimestamp()
                });
              }
              
              // Mark job as complete
              await adminFirestore.collection('jobs').doc(jobRef.id).update({
                status: 'completed',
                completedAt: serverTimestamp(),
                progress: totalDocs
              });
            } catch (error) {
              console.error('Error in index rebuild job:', error);
              
              // Update job status on error
              await adminFirestore.collection('jobs').doc(jobRef.id).update({
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                updatedAt: serverTimestamp()
              });
            }
          }, 100); // Minimal delay to allow the API to respond first
          
          // Log admin action
          await logAdminAction(adminUser, 'REBUILD_INDEX', {
            indexType: body.indexType,
            jobId: jobRef.id
          });
          
          return NextResponse.json({
            message: `${body.indexType} index rebuild initiated`,
            details: {
              startedAt: new Date().toISOString(),
              indexType: body.indexType,
              status: 'queued',
              jobId: jobRef.id
            }
          });
        } catch (error) {
          logger.error('Error initiating index rebuild', {
            error: error instanceof Error ? error.message : String(error),
            adminId: adminUser.id,
            indexType: body.indexType
          });
          
          return NextResponse.json({ 
            error: 'Failed to initiate index rebuild', 
            message: 'An error occurred while setting up the index rebuild job.'
          }, { status: 500 });
        }
        
      case 'backupData':
        // Implement backup logic with Firestore export
        try {
          const dataTypes = body.dataTypes || 'all';
          let collections: string[] = [];
          
          // Determine which collections to back up
          if (dataTypes === 'all') {
            collections = [
              'users', 
              'organizations', 
              'posts', 
              'media', 
              'knowledgeBase',
              'teams',
              'subscriptions',
              'analytics'
            ];
          } else if (Array.isArray(dataTypes)) {
            collections = dataTypes;
          } else {
            return NextResponse.json(
              { error: 'dataTypes must be "all" or an array of collection names' },
              { status: 400 }
            );
          }
          
          // Create a backup job
          const jobRef = await adminFirestore.collection('jobs').add({
            type: 'backup',
            status: 'queued',
            collections: collections,
            createdAt: serverTimestamp(),
            createdBy: adminUser.id
          });
          
          // Start the backup process using Firebase Cloud Functions
          try {
            // Call the Firebase Cloud Function directly
            await adminFirestore.collection('jobs').doc(jobRef.id).update({
              status: 'processing',
              startedAt: serverTimestamp()
            });
            
            // Generate backup ID
            const backupId = `backup_${Date.now()}`;
            
            // Use a callable HTTPS function to trigger the backup process
            const backupData = {
              jobId: jobRef.id,
              collections: collections,
              backupId: backupId,
              initiatedBy: adminUser.id
            };
            
            // Trigger the Cloud Function by writing to the backupRequests collection
            await adminFirestore.collection('backupRequests').doc(backupId).set({
              ...backupData,
              status: 'pending', 
              createdAt: serverTimestamp()
            });
            
            // Log admin action
            await logAdminAction(adminUser, 'BACKUP_DATA', {
              dataTypes: collections,
              jobId: jobRef.id,
              backupId: backupId
            });
            
            return NextResponse.json({
              message: 'Data backup initiated',
              details: {
                startedAt: new Date().toISOString(),
                dataTypes: collections,
                status: 'queued',
                jobId: jobRef.id,
                backupId: backupId
              }
            });
          } catch (error) {
            logger.error('Error initiating backup', {
              error: error instanceof Error ? error.message : String(error),
              adminId: adminUser.id,
              dataTypes: body.dataTypes
            });
            
            // Update job status on error
            await adminFirestore.collection('jobs').doc(jobRef.id).update({
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
              updatedAt: serverTimestamp()
            });
            
            return NextResponse.json({ 
              error: 'Failed to initiate backup', 
              message: 'An error occurred while triggering the backup process.'
            }, { status: 500 });
          }
        } catch (error) {
          logger.error('Error initiating backup', {
            error: error instanceof Error ? error.message : String(error),
            adminId: adminUser.id,
            dataTypes: body.dataTypes
          });
          
          return NextResponse.json({ 
            error: 'Failed to initiate backup', 
            message: 'An error occurred while setting up the backup job.'
          }, { status: 500 });
        }
        
      default:
        return NextResponse.json(
          { error: `Unsupported operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    // Log error details
    logger.error('Error in admin system POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to perform system operation',
        message: 'An unexpected error occurred while performing the system operation. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH handler for updating system settings
 * Restricted to Super Admin role
 */
export const PATCH = withSuperAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate settings data
    const validationResult = systemSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const settingsData = validationResult.data;
    
    // Get existing settings
    const settingsDocRef = doc(firestore, SYSTEM_SETTINGS_COLLECTION, 'general');
    const settingsDoc = await getDoc(settingsDocRef);
    
    // Convert planned end time to Timestamp if provided
    if (settingsData.maintenance?.plannedEndTime) {
      const plannedEndTime = settingsData.maintenance.plannedEndTime;
      if (typeof plannedEndTime === 'string') {
        settingsData.maintenance.plannedEndTime = Timestamp.fromDate(new Date(plannedEndTime));
      }
      // If it's already a Timestamp, no conversion needed
    }
    
    // Prepare settings data for update
    const now = new Date();
    const firestoreSettingsData = {
      ...(settingsDoc.exists() ? settingsDoc.data() : {}),
      ...settingsData,
      updatedAt: Timestamp.fromDate(now),
      updatedBy: adminUser.id
    };
    
    // Update settings in Firestore
    await setDoc(settingsDocRef, firestoreSettingsData);
    
    // Log admin action
    await logAdminAction(adminUser, 'UPDATE_SYSTEM_SETTINGS', {
      updatedSections: Object.keys(settingsData),
      maintenanceModeChanged: settingsData.maintenance?.enabled !== undefined
    });
    
    // Return success response with updated settings
    return NextResponse.json({
      message: 'System settings updated successfully',
      settings: formatSettingsForResponse(firestoreSettingsData)
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin system PATCH handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to update system settings',
        message: 'An unexpected error occurred while updating system settings. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}); 