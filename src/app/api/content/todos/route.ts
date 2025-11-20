import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  limit,
  startAfter
} from 'firebase/firestore';
import { firestore } from '../../../../lib/core/firebase';
import { handleApiError } from '../../../../lib/auth/utils';
import { 
  TeamTodoItem, 
  getTodoPermissions, 
  TodoStatus, 
  TodoPriority, 
  TodoType,
  ENTERPRISE_FEATURES 
} from '../../../../types/todo';
import { OrganizationRole, TeamRole } from '../../../../lib/features/user/types';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Get user's subscription tier from session or database
 */
async function getUserSubscriptionTier(userId: string): Promise<'creator' | 'influencer' | 'enterprise'> {
  // This would typically come from your user/subscription service
  // For now, defaulting to creator - implement based on your subscription system
  try {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }

    const userDoc = await getDoc(doc(firestore, 'users', userId));
    const userData = userDoc.data();
    return userData?.subscriptionTier || 'creator';
  } catch (error) {
    console.warn('Could not fetch subscription tier, defaulting to creator:', error);
    return 'creator';
  }
}

/**
 * Check if user has access to a specific feature
 */
function hasFeatureAccess(feature: string, tier: 'creator' | 'influencer' | 'enterprise'): boolean {
  return ENTERPRISE_FEATURES[tier].includes(feature as any);
}

/**
 * Get team TODOs with proper permission checking and tier-based features
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const url = new URL(request.url);
    const teamId = url.searchParams.get('teamId');
    const organizationId = url.searchParams.get('organizationId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    
    // Advanced filtering (available for all tiers)
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const type = url.searchParams.get('type');
    const assignedTo = url.searchParams.get('assignedTo');
    const category = url.searchParams.get('category');
    const tags = url.searchParams.get('tags')?.split(',');
    const search = url.searchParams.get('search');
    
    if (!teamId || !organizationId) {
      return NextResponse.json({ 
        error: 'teamId and organizationId are required' 
      }, { status: 400 });
    }
    
    // Get user's subscription tier
    const subscriptionTier = await getUserSubscriptionTier(userId);
    
    // Get user's role information
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const teamsRef = collection(firestore, 'teams');
    const teamQuery = query(teamsRef, where('id', '==', teamId));
    const teamSnapshot = await getDocs(teamQuery);
    
    if (teamSnapshot.empty) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    const teamData = teamSnapshot.docs[0].data();
    const userMember = teamData.members?.find((m: any) => m.userId === userId);
    
    if (!userMember) {
      return NextResponse.json({ error: 'User not a member of this team' }, { status: 403 });
    }
    
    // Check permissions
    const permissions = getTodoPermissions(
      userMember.organizationRole as OrganizationRole,
      userMember.teamRole as TeamRole,
      false,
      false,
      subscriptionTier
    );
    
    if (!permissions.canView) {
      return NextResponse.json({ error: 'Insufficient permissions to view team TODOs' }, { status: 403 });
    }
    
    // Build query with filters
    const todosRef = collection(firestore, 'teamTodos');
    let todoQuery = query(
      todosRef, 
      where('teamId', '==', teamId),
      where('organizationId', '==', organizationId)
    );
    
    // Apply filters based on subscription tier
    if (status && hasFeatureAccess('basic_filtering', subscriptionTier)) {
      todoQuery = query(todoQuery, where('status', '==', status));
    }
    
    if (priority && hasFeatureAccess('basic_filtering', subscriptionTier)) {
      todoQuery = query(todoQuery, where('priority', '==', priority));
    }
    
    if (type && hasFeatureAccess('advanced_filtering', subscriptionTier)) {
      todoQuery = query(todoQuery, where('type', '==', type));
    }
    
    if (assignedTo && hasFeatureAccess('basic_assignment', subscriptionTier)) {
      todoQuery = query(todoQuery, where('assignedTo', '==', assignedTo));
    }
    
    if (category && hasFeatureAccess('basic_categories', subscriptionTier)) {
      todoQuery = query(todoQuery, where('category', '==', category));
    }
    
    // Add sorting
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'dueDate') {
      todoQuery = query(todoQuery, orderBy(sortBy, sortOrder as 'asc' | 'desc'));
    }
    
    // Add pagination for performance
    if (page > 1) {
      const offset = (page - 1) * pageSize;
      todoQuery = query(todoQuery, limit(pageSize));
      // Note: For proper pagination, you'd need to implement cursor-based pagination
    } else {
      todoQuery = query(todoQuery, limit(pageSize));
    }
    
    const snapshot = await getDocs(todoQuery);
    
    let todos: TeamTodoItem[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure backward compatibility with existing data
        title: data.title || data.text || '',
        status: data.status || TodoStatus.OPEN,
        type: data.type || TodoType.TASK,
        priority: data.priority || TodoPriority.MEDIUM,
        tags: data.tags || [],
        labels: data.labels || [],
        watchers: data.watchers || [],
        reviewers: data.reviewers || [],
        timeEntries: data.timeEntries || [],
        dependencies: data.dependencies || [],
        childTodoIds: data.childTodoIds || [],
        comments: data.comments || [],
        attachments: data.attachments || [],
        customFields: data.customFields || {},
        workflowHistory: data.workflowHistory || [],
        aiSuggestions: data.aiSuggestions || {
          confidence: 0,
          lastUpdated: Date.now()
        },
        autoAssignmentRules: data.autoAssignmentRules || [],
        confidentialityLevel: data.confidentialityLevel || 'public',
        complianceFlags: data.complianceFlags || [],
        externalReferences: data.externalReferences || [],
        metrics: data.metrics || {
          viewCount: 0,
          editCount: 0,
          commentCount: 0,
          reopenCount: 0,
          escalationCount: 0
        },
        notificationSettings: data.notificationSettings || {
          emailNotifications: true,
          slackNotifications: false,
          pushNotifications: true,
          digestFrequency: 'daily'
        },
        slaStatus: data.slaStatus || 'on_track',
        lastActivityAt: data.lastActivityAt || data.updatedAt || data.createdAt
      } as TeamTodoItem;
    });
    
    // Apply client-side filters for features not available in Firestore queries
    if (search && hasFeatureAccess('basic_filtering', subscriptionTier)) {
      const searchLower = search.toLowerCase();
      todos = todos.filter(todo => 
        todo.title.toLowerCase().includes(searchLower) ||
        todo.description?.toLowerCase().includes(searchLower) ||
        (hasFeatureAccess('comments', subscriptionTier) && 
         todo.comments.some(comment => comment.content.toLowerCase().includes(searchLower)))
      );
    }
    
    if (tags && hasFeatureAccess('advanced_filtering', subscriptionTier)) {
      todos = todos.filter(todo => 
        tags.some(tag => todo.tags.includes(tag))
      );
    }
    
    // Filter out confidential TODOs if user doesn't have access
    if (!permissions.canViewConfidential) {
      todos = todos.filter(todo => 
        todo.confidentialityLevel === 'public' || 
        todo.confidentialityLevel === 'internal'
      );
    }
    
    // Calculate statistics (available for all tiers)
    const stats = {
      total: todos.length,
      completed: todos.filter(t => t.status === TodoStatus.COMPLETED).length,
      active: todos.filter(t => t.status !== TodoStatus.COMPLETED && t.status !== TodoStatus.CANCELLED).length,
      overdue: todos.filter(t => 
        t.dueDate && 
        new Date(t.dueDate).getTime() < Date.now() && 
        t.status !== TodoStatus.COMPLETED
      ).length,
      byStatus: todos.reduce((acc, todo) => {
        acc[todo.status] = (acc[todo.status] || 0) + 1;
        return acc;
      }, {} as Record<TodoStatus, number>),
      byPriority: todos.reduce((acc, todo) => {
        acc[todo.priority] = (acc[todo.priority] || 0) + 1;
        return acc;
      }, {} as Record<TodoPriority, number>),
      byType: todos.reduce((acc, todo) => {
        acc[todo.type] = (acc[todo.type] || 0) + 1;
        return acc;
      }, {} as Record<TodoType, number>)
    };
    
    // Add advanced analytics for higher tiers
    const response: any = {
      todos,
      stats,
      permissions,
      teamName: teamData.name,
      subscriptionTier,
      availableFeatures: ENTERPRISE_FEATURES[subscriptionTier],
      pagination: {
        page,
        pageSize,
        hasMore: snapshot.docs.length === pageSize
      }
    };
    
    // Add advanced metrics for influencer+ tiers
    if (hasFeatureAccess('advanced_analytics', subscriptionTier)) {
      response.advancedStats = {
        timeMetrics: {
          totalEstimatedHours: todos.reduce((sum, todo) => sum + (todo.estimatedHours || 0), 0),
          totalActualHours: todos.reduce((sum, todo) => sum + (todo.actualHours || 0), 0),
          averageCompletionTime: todos
            .filter(t => t.completedAt && t.createdAt)
            .reduce((sum, todo) => sum + (todo.completedAt! - todo.createdAt), 0) / 
            Math.max(1, todos.filter(t => t.completedAt).length),
          productivityScore: Math.min(100, Math.max(0, 
            (stats.completed / Math.max(1, stats.total)) * 100
          ))
        },
        collaborationMetrics: {
          totalComments: todos.reduce((sum, todo) => sum + todo.comments.length, 0),
          totalAttachments: todos.reduce((sum, todo) => sum + todo.attachments.length, 0),
          averageCommentsPerTodo: todos.reduce((sum, todo) => sum + todo.comments.length, 0) / Math.max(1, todos.length)
        }
      };
    }
    
    // Add SLA metrics for enterprise tier
    if (hasFeatureAccess('sla_tracking', subscriptionTier)) {
      response.slaMetrics = {
        onTrack: todos.filter(t => t.slaStatus === 'on_track').length,
        atRisk: todos.filter(t => t.slaStatus === 'at_risk').length,
        breached: todos.filter(t => t.slaStatus === 'breached').length
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching team todos:', error);
    return NextResponse.json(
      handleApiError(error, '/api/content/todos', 'fetching team todos'),
      { status: 500 }
    );
  }
}

/**
 * Create a new team TODO with tier-appropriate features
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const body = await request.json();
    
    const { 
      title,
      text, // Backward compatibility
      description,
      teamId, 
      organizationId, 
      teamName,
      status = TodoStatus.OPEN,
      type = TodoType.TASK,
      priority = TodoPriority.MEDIUM,
      category, 
      dueDate,
      startDate,
      assignedTo,
      tags = [],
      labels = [],
      estimatedHours,
      customFields = {},
      confidentialityLevel = 'public',
      workflowId,
      parentTodoId,
      watchers = [],
      reviewers = []
    } = body;
    
    const todoTitle = title || text; // Support both new and legacy field names
    
    if (!todoTitle || !teamId || !organizationId || !teamName) {
      return NextResponse.json(
        { error: 'title (or text), teamId, organizationId, and teamName are required' },
        { status: 400 }
      );
    }
    
    // Get user's subscription tier
    const subscriptionTier = await getUserSubscriptionTier(userId);
    
    // Get user's role information and check permissions
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const teamsRef = collection(firestore, 'teams');
    const teamQuery = query(teamsRef, where('id', '==', teamId));
    const teamSnapshot = await getDocs(teamQuery);
    
    if (teamSnapshot.empty) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    const teamData = teamSnapshot.docs[0].data();
    const userMember = teamData.members?.find((m: any) => m.userId === userId);
    
    if (!userMember) {
      return NextResponse.json({ error: 'User not a member of this team' }, { status: 403 });
    }
    
    const permissions = getTodoPermissions(
      userMember.organizationRole as OrganizationRole,
      userMember.teamRole as TeamRole,
      false,
      false,
      subscriptionTier
    );
    
    if (!permissions.canCreate) {
      return NextResponse.json({ error: 'Insufficient permissions to create TODOs' }, { status: 403 });
    }
    
    // Validate tier-specific features
    if (customFields && Object.keys(customFields).length > 0 && !hasFeatureAccess('custom_fields', subscriptionTier)) {
      return NextResponse.json({ 
        error: 'Custom fields are only available in Enterprise tier' 
      }, { status: 403 });
    }
    
    if (confidentialityLevel !== 'public' && !hasFeatureAccess('confidentiality_levels', subscriptionTier)) {
      return NextResponse.json({ 
        error: 'Confidentiality levels are only available in Enterprise tier' 
      }, { status: 403 });
    }
    
    if (workflowId && !hasFeatureAccess('advanced_workflows', subscriptionTier)) {
      return NextResponse.json({ 
        error: 'Advanced workflows are only available in Enterprise tier' 
      }, { status: 403 });
    }
    
    // If assigning to someone, check if user has assign permission
    if (assignedTo && !permissions.canAssign) {
      return NextResponse.json({ error: 'Insufficient permissions to assign TODOs' }, { status: 403 });
    }
    
    const todosRef = collection(firestore, 'teamTodos');
    const now = Date.now();
    
    // Build the new TODO with tier-appropriate features
    const newTodo: Omit<TeamTodoItem, 'id'> = {
      title: todoTitle,
      description,
      status,
      type,
      priority,
      completed: status === TodoStatus.COMPLETED,
      teamId,
      organizationId,
      teamName,
      createdBy: userId,
      assignedTo,
      watchers: hasFeatureAccess('team_collaboration', subscriptionTier) ? watchers : [],
      reviewers: hasFeatureAccess('approval_processes', subscriptionTier) ? reviewers : [],
      category,
      tags: hasFeatureAccess('advanced_filtering', subscriptionTier) ? tags : [],
      labels: hasFeatureAccess('advanced_filtering', subscriptionTier) ? labels : [],
      dueDate,
      startDate: hasFeatureAccess('advanced_filtering', subscriptionTier) ? startDate : undefined,
      estimatedHours: hasFeatureAccess('time_tracking', subscriptionTier) ? estimatedHours : undefined,
      actualHours: 0,
      timeEntries: [],
      slaStatus: 'on_track',
      dependencies: [],
      parentTodoId: hasFeatureAccess('dependencies', subscriptionTier) ? parentTodoId : undefined,
      childTodoIds: [],
      comments: [],
      attachments: [],
      customFields: hasFeatureAccess('custom_fields', subscriptionTier) ? customFields : {},
      workflowId: hasFeatureAccess('advanced_workflows', subscriptionTier) ? workflowId : undefined,
      currentWorkflowStep: undefined,
      workflowHistory: [],
      aiSuggestions: {
        confidence: 0,
        lastUpdated: now
      },
      autoAssignmentRules: [],
      confidentialityLevel: hasFeatureAccess('confidentiality_levels', subscriptionTier) ? confidentialityLevel : 'public',
      complianceFlags: [],
      externalReferences: [],
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      metrics: {
        viewCount: 0,
        editCount: 0,
        commentCount: 0,
        reopenCount: 0,
        escalationCount: 0
      },
      notificationSettings: {
        emailNotifications: true,
        slackNotifications: false,
        pushNotifications: true,
        digestFrequency: 'daily'
      }
    };
    
    const docRef = await addDoc(todosRef, {
      ...newTodo,
      updatedAt: serverTimestamp()
    });
    
    return NextResponse.json({
      todo: {
        id: docRef.id,
        ...newTodo
      },
      subscriptionTier,
      availableFeatures: ENTERPRISE_FEATURES[subscriptionTier]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating team todo:', error);
    return NextResponse.json(
      handleApiError(error, '/api/content/todos', 'creating team todo'),
      { status: 500 }
    );
  }
}

/**
 * Update a team TODO
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const { id, ...updates } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }
    
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const todoRef = doc(firestore, 'teamTodos', id);
    const todoDoc = await getDoc(todoRef);
    
    if (!todoDoc.exists()) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    
    const todoData = todoDoc.data() as TeamTodoItem;
    
    // Get user's role information and check permissions
    const teamsRef = collection(firestore, 'teams');
    const teamQuery = query(teamsRef, where('id', '==', todoData.teamId));
    const teamSnapshot = await getDocs(teamQuery);
    
    if (teamSnapshot.empty) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    const teamData = teamSnapshot.docs[0].data();
    const userMember = teamData.members?.find((m: any) => m.userId === userId);
    
    if (!userMember) {
      return NextResponse.json({ error: 'User not a member of this team' }, { status: 403 });
    }
    
    const isCreator = todoData.createdBy === userId;
    const isAssignee = todoData.assignedTo === userId;
    
    const permissions = getTodoPermissions(
      userMember.organizationRole as OrganizationRole,
      userMember.teamRole as TeamRole,
      isCreator,
      isAssignee
    );
    
    if (!permissions.canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions to edit this TODO' }, { status: 403 });
    }
    
    // If updating assignment, check assign permission
    if (updates.assignedTo !== undefined && !permissions.canAssign) {
      return NextResponse.json({ error: 'Insufficient permissions to assign TODOs' }, { status: 403 });
    }
    
    // Add completion timestamp if marking as completed
    if (updates.completed === true && !todoData.completed) {
      updates.completedAt = Date.now();
    } else if (updates.completed === false) {
      updates.completedAt = undefined;
    }
    
    await updateDoc(todoRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return NextResponse.json({
      todo: {
        ...todoData,
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating team todo:', error);
    return NextResponse.json(
      handleApiError(error, '/api/content/todos', 'updating team todo'),
      { status: 500 }
    );
  }
}

/**
 * Delete team TODO(s)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const clearCompleted = url.searchParams.get('clearCompleted');
    const teamId = url.searchParams.get('teamId');
    const organizationId = url.searchParams.get('organizationId');
    
    if (!teamId || !organizationId) {
      return NextResponse.json({ 
        error: 'teamId and organizationId are required' 
      }, { status: 400 });
    }
    
    // Get user's role information
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const teamsRef = collection(firestore, 'teams');
    const teamQuery = query(teamsRef, where('id', '==', teamId));
    const teamSnapshot = await getDocs(teamQuery);
    
    if (teamSnapshot.empty) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    const teamData = teamSnapshot.docs[0].data();
    const userMember = teamData.members?.find((m: any) => m.userId === userId);
    
    if (!userMember) {
      return NextResponse.json({ error: 'User not a member of this team' }, { status: 403 });
    }
    
    if (clearCompleted === 'true') {
      // Clear all completed todos for this team
      const todosRef = collection(firestore, 'teamTodos');
      const completedTodosQuery = query(
        todosRef,
        where('teamId', '==', teamId),
        where('organizationId', '==', organizationId),
        where('completed', '==', true)
      );
      
      const snapshot = await getDocs(completedTodosQuery);
      
      if (snapshot.empty) {
        return NextResponse.json({ message: 'No completed todos to delete' });
      }
      
      // Check if user has permission to delete (need to check each TODO)
      const permissions = getTodoPermissions(
        userMember.organizationRole as OrganizationRole,
        userMember.teamRole as TeamRole
      );
      
      // Only TEAM_ADMIN, ORG_ADMIN, or OWNER can bulk delete
      if (userMember.organizationRole !== OrganizationRole.OWNER && 
          userMember.organizationRole !== OrganizationRole.ORG_ADMIN &&
          userMember.teamRole !== TeamRole.TEAM_ADMIN) {
        return NextResponse.json({ error: 'Insufficient permissions to bulk delete TODOs' }, { status: 403 });
      }
      
      const batch = writeBatch(firestore);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      return NextResponse.json({ 
        message: `${snapshot.size} completed todos deleted successfully`,
        count: snapshot.size
      });
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }
    
    const todoRef = doc(firestore, 'teamTodos', id);
    const todoDoc = await getDoc(todoRef);
    
    if (!todoDoc.exists()) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    
    const todoData = todoDoc.data() as TeamTodoItem;
    
    const isCreator = todoData.createdBy === userId;
    const isAssignee = todoData.assignedTo === userId;
    
    const permissions = getTodoPermissions(
      userMember.organizationRole as OrganizationRole,
      userMember.teamRole as TeamRole,
      isCreator,
      isAssignee
    );
    
    if (!permissions.canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions to delete this TODO' }, { status: 403 });
    }
    
    await deleteDoc(todoRef);
    
    return NextResponse.json({ 
      message: 'Todo deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting team todo:', error);
    return NextResponse.json(
      handleApiError(error, '/api/content/todos', 'deleting team todo'),
      { status: 500 }
    );
  }
} 