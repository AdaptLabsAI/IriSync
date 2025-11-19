import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { 
  collection, 
  getDocs, 
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  doc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { logger } from '@/lib/core/logging/logger';
import { handleApiError } from '@/lib/features/auth/utils';
import axios from 'axios';
import { getGoogleOAuthClientId } from '@/lib/server/env';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


interface ExternalTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  source: 'google' | 'microsoft';
  sourceId: string;
  lastSynced: number;
}

interface Connection {
  id: string;
  type: 'google_tasks' | 'microsoft_todo';
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  [key: string]: any;
}

interface TodoItem {
  id: string;
  firebaseId: string;
  text: string;
  completed: boolean;
  category?: string;
  source?: 'google' | 'microsoft';
  sourceId?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: number;
  userId: string;
  [key: string]: any;
}

// Map of external task status to our internal status
const EXTERNAL_TASK_PRIORITIES: Record<string, 'low' | 'medium' | 'high'> = {
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
  // Google Tasks doesn't have priorities, we'll default to medium
  'google_default': 'medium',
  // Microsoft To-Do priorities
  'normal': 'medium',
  'urgent': 'high'
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Cast session.user to include id property
    const userId = (session.user as any).id || session.user.email;
    
    // Parse request body to see which services to sync
    const { services = ['google', 'microsoft'] } = await request.json();
    
    const todosRef = collection(firestore, 'todos');
    const connectionsRef = collection(firestore, 'connections');
    
    // Prepare sync results
    const syncResults = {
      added: 0,
      updated: 0,
      failed: 0,
      services: {} as Record<string, { added: number; updated: number; failed: number }>
    };
    
    // Get user's existing todos for comparison
    const userTodosQuery = query(todosRef, where('userId', '==', userId));
    const todosSnapshot = await getDocs(userTodosQuery);
    const existingTodos = todosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      firebaseId: doc.id // Store the Firebase ID for later use
    })) as TodoItem[];
    
    // Get user's external service connections
    const connectionsQuery = query(connectionsRef, 
      where('userId', '==', userId),
      where('type', 'in', ['google_tasks', 'microsoft_todo'])
    );
    const connectionsSnapshot = await getDocs(connectionsQuery);
    
    if (connectionsSnapshot.empty) {
      // No external connections found
      return NextResponse.json({ 
        message: 'No external task services connected',
        added: 0,
        updated: 0,
        services: {}
      });
    }
    
    const connections = connectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Connection[];
    
    const batch = writeBatch(firestore);
    const externalTasks: ExternalTask[] = [];
    
    // Sync with Google Tasks if connection exists and requested
    if (services.includes('google')) {
      const googleConnection = connections.find(conn => conn.type === 'google_tasks');
      
      if (googleConnection && googleConnection.accessToken) {
        try {
          // Initialize service stats
          syncResults.services.google = { added: 0, updated: 0, failed: 0 };
          
          // Check if token needs refresh
          if (googleConnection.expiresAt && new Date(googleConnection.expiresAt) < new Date()) {
            // Token expired, needs refresh
            const refreshedToken = await refreshGoogleToken(googleConnection.refreshToken);
            if (refreshedToken) {
              googleConnection.accessToken = refreshedToken.access_token;
              googleConnection.expiresAt = new Date(Date.now() + refreshedToken.expires_in * 1000).toISOString();
              
              // Update the connection in Firestore
              const connRef = doc(connectionsRef, googleConnection.id);
              batch.update(connRef, {
                accessToken: refreshedToken.access_token,
                expiresAt: googleConnection.expiresAt
              });
            }
          }
          
          // Fetch tasks from Google Tasks API
          const googleTasks = await fetchGoogleTasks(googleConnection.accessToken);
          
          // Process Google Tasks
          for (const task of googleTasks) {
            externalTasks.push({
              id: `google_${task.id}`,
              title: task.title || 'Untitled Task',
              completed: task.status === 'completed',
              dueDate: task.due,
              source: 'google',
              sourceId: task.id,
              lastSynced: Date.now()
            });
          }
        } catch (error) {
          logger.error({
            type: 'google_tasks_sync_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            userId
          });
          
          syncResults.services.google.failed = 1;
          syncResults.failed += 1;
        }
      }
    }
    
    // Sync with Microsoft To-Do if connection exists and requested
    if (services.includes('microsoft')) {
      const microsoftConnection = connections.find(conn => conn.type === 'microsoft_todo');
      
      if (microsoftConnection && microsoftConnection.accessToken) {
        try {
          // Initialize service stats
          syncResults.services.microsoft = { added: 0, updated: 0, failed: 0 };
          
          // Check if token needs refresh
          if (microsoftConnection.expiresAt && new Date(microsoftConnection.expiresAt) < new Date()) {
            // Token expired, needs refresh
            const refreshedToken = await refreshMicrosoftToken(microsoftConnection.refreshToken);
            if (refreshedToken) {
              microsoftConnection.accessToken = refreshedToken.access_token;
              microsoftConnection.expiresAt = new Date(Date.now() + refreshedToken.expires_in * 1000).toISOString();
              
              // Update the connection in Firestore
              const connRef = doc(connectionsRef, microsoftConnection.id);
              batch.update(connRef, {
                accessToken: refreshedToken.access_token,
                expiresAt: microsoftConnection.expiresAt
              });
            }
          }
          
          // Fetch tasks from Microsoft To-Do API
          const microsoftTasks = await fetchMicrosoftTasks(microsoftConnection.accessToken);
          
          // Process Microsoft Tasks
          for (const task of microsoftTasks) {
            externalTasks.push({
              id: `microsoft_${task.id}`,
              title: task.title || task.subject || 'Untitled Task',
              completed: task.status === 'completed' || task.completedDateTime !== null,
              dueDate: task.dueDateTime ? new Date(task.dueDateTime.dateTime).toISOString() : undefined,
              source: 'microsoft',
              sourceId: task.id,
              lastSynced: Date.now()
            });
          }
        } catch (error) {
          logger.error({
            type: 'microsoft_todo_sync_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            userId
          });
          
          syncResults.services.microsoft.failed = 1;
          syncResults.failed += 1;
        }
      }
    }
    
    // Process external tasks and update/add to Firestore
    for (const task of externalTasks) {
      // Check if this task already exists in our system (by source and sourceId)
      const existingTodo = existingTodos.find(todo => 
        todo.source === task.source && todo.sourceId === task.sourceId
      );
      
      if (existingTodo) {
        // Update existing todo
        const todoRef = doc(todosRef, existingTodo.firebaseId);
        batch.update(todoRef, {
          text: task.title,
          completed: task.completed,
          dueDate: task.dueDate,
          updatedAt: serverTimestamp(),
          lastSynced: task.lastSynced
        });
        
        syncResults.updated += 1;
        if (syncResults.services[task.source]) {
          syncResults.services[task.source].updated += 1;
        }
      } else {
        // Add new todo
        const newTodo = {
          text: task.title,
          completed: task.completed,
          category: 'Synced',
          priority: 'medium',
          userId,
          createdAt: Date.now(),
          updatedAt: serverTimestamp(),
          source: task.source,
          sourceId: task.sourceId,
          lastSynced: task.lastSynced
        };
        
        const newTodoRef = doc(todosRef);
        batch.set(newTodoRef, newTodo);
        
        syncResults.added += 1;
        if (syncResults.services[task.source]) {
          syncResults.services[task.source].added += 1;
        }
      }
    }
    
    // Commit all changes in one batch
    await batch.commit();
    
    logger.info({
      type: 'todos_sync',
      userId,
      syncResults
    }, `Synced todos for user ${userId}`);
    
    return NextResponse.json({ 
      message: 'Todo data synced successfully',
      ...syncResults
    });
  } catch (error) {
    console.error('Error syncing todos:', error);
    logger.error({
      type: 'todos_sync_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Failed to sync todos');
    
    return NextResponse.json(
      handleApiError(error, '/api/content/todos/sync', 'syncing todos'),
      { status: 500 }
    );
  }
}

/**
 * Refresh Google OAuth token using refresh token
 */
async function refreshGoogleToken(refreshToken: string) {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: getGoogleOAuthClientId(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to refresh Google token', error);
    return null;
  }
}

/**
 * Fetch tasks from Google Tasks API
 */
async function fetchGoogleTasks(accessToken: string) {
  try {
    // First get all tasklists
    const tasklistsResponse = await axios.get('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    const tasklists = tasklistsResponse.data.items || [];
    
    // Then get tasks from each tasklist
    const allTasks = [];
    
    for (const tasklist of tasklists) {
      const tasksResponse = await axios.get(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist.id}/tasks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          maxResults: 100,
          showCompleted: true,
          showHidden: false
        }
      });
      
      if (tasksResponse.data.items) {
        allTasks.push(...tasksResponse.data.items);
      }
    }
    
    return allTasks;
  } catch (error) {
    logger.error('Failed to fetch Google tasks', error);
    throw error;
  }
}

/**
 * Refresh Microsoft OAuth token using refresh token
 */
async function refreshMicrosoftToken(refreshToken: string) {
  try {
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const response = await axios.post(
      tokenEndpoint,
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        scope: 'Tasks.ReadWrite',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || ''
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Failed to refresh Microsoft token', error);
    return null;
  }
}

/**
 * Fetch tasks from Microsoft To-Do API
 */
async function fetchMicrosoftTasks(accessToken: string) {
  try {
    // First get all task lists
    const taskListsResponse = await axios.get('https://graph.microsoft.com/v1.0/me/todo/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    const taskLists = taskListsResponse.data.value || [];
    
    // Then get tasks from each list
    const allTasks = [];
    
    for (const list of taskLists) {
      const tasksResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (tasksResponse.data.value) {
        allTasks.push(...tasksResponse.data.value);
      }
    }
    
    return allTasks;
  } catch (error) {
    logger.error('Failed to fetch Microsoft tasks', error);
    throw error;
  }
} 