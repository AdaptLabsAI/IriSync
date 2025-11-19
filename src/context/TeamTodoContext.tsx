'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useTeam } from './TeamContext';
import { 
  TeamTodoItem, 
  TeamTodoFilter, 
  TodoSortOption, 
  TodoPermissions, 
  TeamTodoStats,
  getTodoPermissions,
  DEFAULT_TODO_CATEGORIES,
  TodoPriority,
  TodoStatus,
  TodoType
} from '@/types/todo';
import { OrganizationRole, TeamRole } from '@/lib/features/user/types';
import { logger } from '@/lib/core/logging/logger';

interface TeamTodoContextType {
  // Data
  todos: TeamTodoItem[];
  filteredTodos: TeamTodoItem[];
  categories: string[];
  teamMembers: Array<{
    userId: string;
    name: string;
    email: string;
    organizationRole: OrganizationRole;
    teamRole?: TeamRole;
  }>;
  
  // User permissions
  permissions: TodoPermissions;
  
  // Filters and sorting
  filter: TeamTodoFilter;
  sort: TodoSortOption;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Statistics
  stats: TeamTodoStats;
  
  // Actions
  addTodo: (
    text: string, 
    options?: {
      category?: string;
      dueDate?: string;
      priority?: 'low' | 'medium' | 'high';
      description?: string;
      assignedTo?: string;
      tags?: string[];
      estimatedHours?: number;
    }
  ) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  updateTodo: (id: string, updates: Partial<TeamTodoItem>) => Promise<void>;
  assignTodo: (id: string, assignedTo: string | undefined) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (category: string) => Promise<void>;
  setFilter: (filter: Partial<TeamTodoFilter>) => void;
  setSort: (sort: TodoSortOption) => void;
  refreshTodos: () => Promise<void>;
}

const TeamTodoContext = createContext<TeamTodoContextType | undefined>(undefined);

export const TeamTodoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [todos, setTodos] = useState<TeamTodoItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_TODO_CATEGORIES);
  const [teamMembers, setTeamMembers] = useState<TeamTodoContextType['teamMembers']>([]);
  const [permissions, setPermissions] = useState<TodoPermissions>({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canAssign: false,
    canManageCategories: false,
    canViewConfidential: false,
    canEditConfidential: false,
    canApprove: false,
    canEscalate: false,
    canManageWorkflows: false,
    canManageCustomFields: false,
    canViewTimeEntries: false,
    canEditTimeEntries: false,
    canApproveTimeEntries: false,
    canManageDependencies: false,
    canViewAnalytics: false,
    canExportData: false,
    canManageIntegrations: false,
    canViewAuditLogs: false,
    canManageRetention: false,
    canBulkEdit: false,
    canManageNotifications: false
  });
  const [filter, setFilterState] = useState<TeamTodoFilter>({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: '',
    searchFields: ['title', 'description']
  });
  const [sort, setSortState] = useState<TodoSortOption>('createdAt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get team context from TeamProvider
  const { 
    currentTeam, 
    currentTeamId, 
    currentOrganizationId,
    loading: teamLoading 
  } = useTeam();

  // Auto-fetch todos when team context changes
  useEffect(() => {
    if (currentTeamId && currentOrganizationId && !teamLoading) {
      fetchTodos();
    } else if (!teamLoading) {
      // Clear todos if no team context
      setTodos([]);
      setTeamMembers([]);
      setPermissions({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canAssign: false,
        canManageCategories: false,
        canViewConfidential: false,
        canEditConfidential: false,
        canApprove: false,
        canEscalate: false,
        canManageWorkflows: false,
        canManageCustomFields: false,
        canViewTimeEntries: false,
        canEditTimeEntries: false,
        canApproveTimeEntries: false,
        canManageDependencies: false,
        canViewAnalytics: false,
        canExportData: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
        canManageRetention: false,
        canBulkEdit: false,
        canManageNotifications: false
      });
    }
  }, [currentTeamId, currentOrganizationId, teamLoading]);

  // Update permissions when team context changes
  useEffect(() => {
    if (currentTeam) {
      const todoPermissions = getTodoPermissions(
        currentTeam.organizationRole,
        currentTeam.teamRole
      );
      setPermissions(todoPermissions);
    }
  }, [currentTeam]);

  // Calculate statistics
  const stats: TeamTodoStats = React.useMemo(() => {
    const now = Date.now();
    const overdue = todos.filter(todo => 
      !todo.completed && 
      todo.dueDate && 
      new Date(todo.dueDate).getTime() < now
    ).length;

    const byPriority = todos.reduce((acc, todo) => {
      const priority = todo.priority || TodoPriority.MEDIUM;
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<TodoPriority, number>);

    const byStatus = todos.reduce((acc, todo) => {
      acc[todo.status] = (acc[todo.status] || 0) + 1;
      return acc;
    }, {} as Record<TodoStatus, number>);

    const byType = todos.reduce((acc, todo) => {
      acc[todo.type] = (acc[todo.type] || 0) + 1;
      return acc;
    }, {} as Record<TodoType, number>);

    const byCategory = todos.reduce((acc, todo) => {
      const category = todo.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byAssignee = todos.reduce((acc, todo) => {
      const assignee = todo.assignedTo || 'Unassigned';
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: todos.length,
      completed: todos.filter(t => t.status === TodoStatus.COMPLETED).length,
      active: todos.filter(t => t.status !== TodoStatus.COMPLETED && t.status !== TodoStatus.CANCELLED).length,
      overdue,
      byStatus,
      byType,
      byPriority,
      byCategory,
      byAssignee,
      slaMetrics: {
        onTrack: todos.filter(t => t.slaStatus === 'on_track').length,
        atRisk: todos.filter(t => t.slaStatus === 'at_risk').length,
        breached: todos.filter(t => t.slaStatus === 'breached').length,
        averageResponseTime: 0,
        averageResolutionTime: 0
      },
      timeMetrics: {
        totalEstimatedHours: todos.reduce((sum, todo) => sum + (todo.estimatedHours || 0), 0),
        totalActualHours: todos.reduce((sum, todo) => sum + (todo.actualHours || 0), 0),
        averageCompletionTime: 0,
        productivityScore: 0
      },
      collaborationMetrics: {
        totalComments: todos.reduce((sum, todo) => sum + todo.comments.length, 0),
        totalAttachments: todos.reduce((sum, todo) => sum + todo.attachments.length, 0),
        averageCommentsPerTodo: todos.reduce((sum, todo) => sum + todo.comments.length, 0) / Math.max(1, todos.length),
        mostActiveCollaborators: []
      },
      trends: {
        createdTrend: [],
        completedTrend: [],
        overdueRate: 0,
        escalationRate: 0
      }
    };
  }, [todos]);

  // Filter and sort todos
  const filteredTodos = React.useMemo(() => {
    let result = todos;
    
    // Filter by status
    if (filter.status !== 'all') {
      if (Array.isArray(filter.status)) {
        result = result.filter(todo => filter.status.includes(todo.status));
      }
    }
    
    // Filter by type
    if (filter.type !== 'all') {
      if (Array.isArray(filter.type)) {
        result = result.filter(todo => filter.type.includes(todo.type));
      }
    }
    
    // Filter by category
    if (filter.category && Array.isArray(filter.category)) {
      result = result.filter(todo => filter.category!.includes(todo.category || ''));
    }
    
    // Filter by assigned user
    if (filter.assignedTo && Array.isArray(filter.assignedTo)) {
      result = result.filter(todo => filter.assignedTo!.includes(todo.assignedTo || ''));
    }
    
    // Filter by creator
    if (filter.createdBy && Array.isArray(filter.createdBy)) {
      result = result.filter(todo => filter.createdBy!.includes(todo.createdBy));
    }
    
    // Filter by priority
    if (filter.priority !== 'all') {
      if (Array.isArray(filter.priority)) {
        result = result.filter(todo => filter.priority.includes(todo.priority));
      }
    }
    
    // Filter by search term
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(todo => 
        todo.title.toLowerCase().includes(searchLower) ||
        todo.description?.toLowerCase().includes(searchLower) ||
        todo.category?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by date range
    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start).getTime();
      const end = new Date(filter.dateRange.end).getTime();
      result = result.filter(todo => {
        if (!todo.dueDate) return false;
        const dueTime = new Date(todo.dueDate).getTime();
        return dueTime >= start && dueTime <= end;
      });
    }
    
    // Sort todos
    return result.sort((a, b) => {
      switch (sort) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          
        case 'priority':
          const priorityValues = { 
            [TodoPriority.CRITICAL]: 0, 
            [TodoPriority.HIGH]: 1, 
            [TodoPriority.MEDIUM]: 2, 
            [TodoPriority.LOW]: 3 
          };
          return priorityValues[a.priority] - priorityValues[b.priority];
          
        case 'title':
          return a.title.localeCompare(b.title);
          
        case 'assignedTo':
          const aAssignee = a.assignedTo || 'Unassigned';
          const bAssignee = b.assignedTo || 'Unassigned';
          return aAssignee.localeCompare(bAssignee);
          
        case 'createdAt':
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [todos, filter, sort]);

  // Fetch todos for current team
  const fetchTodos = async () => {
    if (!currentTeamId || !currentOrganizationId) {
      setError('No team context available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/content/todos?teamId=${currentTeamId}&organizationId=${currentOrganizationId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch todos');
      }
      
      const data = await response.json();
      setTodos(data.todos || []);
      
      // Extract team members from todos for assignment dropdown
      const members = new Map();
      data.todos?.forEach((todo: TeamTodoItem) => {
        if (todo.createdBy && !members.has(todo.createdBy)) {
          members.set(todo.createdBy, {
            userId: todo.createdBy,
            name: todo.createdBy, // Would be replaced with actual name from team data
            email: todo.createdBy,
            organizationRole: OrganizationRole.MEMBER,
            teamRole: TeamRole.CONTRIBUTOR
          });
        }
        if (todo.assignedTo && !members.has(todo.assignedTo)) {
          members.set(todo.assignedTo, {
            userId: todo.assignedTo,
            name: todo.assignedTo,
            email: todo.assignedTo,
            organizationRole: OrganizationRole.MEMBER,
            teamRole: TeamRole.CONTRIBUTOR
          });
        }
      });
      setTeamMembers(Array.from(members.values()));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch todos';
      setError(errorMessage);
      logger.error('Error', { type: 'team_todo_fetch_error',
        teamId: currentTeamId,
        organizationId: currentOrganizationId,
        error: errorMessage
      });
      
      toast({
        title: "Error loading team tasks",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (text: string, options: Parameters<TeamTodoContextType['addTodo']>[1] = {}) => {
    if (!currentTeamId || !currentOrganizationId || !currentTeam) {
      throw new Error('No team context available');
    }

    try {
      const response = await fetch('/api/content/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          teamId: currentTeamId,
          organizationId: currentOrganizationId,
          teamName: currentTeam.teamName,
          ...options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create todo');
      }

      const data = await response.json();
      setTodos(prev => [data.todo, ...prev]);
      
      toast({
        title: "Task created",
        description: "Your task has been added successfully.",
        variant: "default"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create todo';
      logger.error('Error', { type: 'team_todo_create_error',
        error: errorMessage
      });
      throw error;
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    await updateTodo(id, { completed: !todo.completed });
  };

  const updateTodo = async (id: string, updates: Partial<TeamTodoItem>) => {
    try {
      const response = await fetch('/api/content/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update todo');
      }

      const data = await response.json();
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, ...data.todo } : todo
      ));
      
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update todo';
      logger.error('Error', { type: 'team_todo_update_error',
        todoId: id,
        error: errorMessage
      });
      throw error;
    }
  };

  const assignTodo = async (id: string, assignedTo: string | undefined) => {
    await updateTodo(id, { assignedTo });
  };

  const deleteTodo = async (id: string) => {
    if (!currentTeamId || !currentOrganizationId) {
      throw new Error('No team context available');
    }

    try {
      const response = await fetch(`/api/content/todos?id=${id}&teamId=${currentTeamId}&organizationId=${currentOrganizationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete todo');
      }

      setTodos(prev => prev.filter(todo => todo.id !== id));
      
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully.",
        variant: "default"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete todo';
      logger.error('Error', { type: 'team_todo_delete_error',
        todoId: id,
        error: errorMessage
      });
      throw error;
    }
  };

  const clearCompleted = async () => {
    if (!currentTeamId || !currentOrganizationId) {
      throw new Error('No team context available');
    }

    try {
      const response = await fetch(`/api/content/todos?clearCompleted=true&teamId=${currentTeamId}&organizationId=${currentOrganizationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear completed todos');
      }

      const data = await response.json();
      setTodos(prev => prev.filter(todo => !todo.completed));
      
      toast({
        title: "Completed tasks cleared",
        description: data.message,
        variant: "default"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear completed todos';
      logger.error('Error', { type: 'team_todo_clear_error',
        error: errorMessage
      });
      throw error;
    }
  };

  const addCategory = async (category: string) => {
    if (categories.includes(category)) {
      throw new Error('Category already exists');
    }
    
    setCategories(prev => [...prev, category]);
    
    toast({
      title: "Category added",
      description: `Category "${category}" has been added.`,
      variant: "default"
    });
  };

  const deleteCategory = async (category: string) => {
    setCategories(prev => prev.filter(cat => cat !== category));
    
    // Update todos that use this category
    const todosWithCategory = todos.filter(todo => todo.category === category);
    for (const todo of todosWithCategory) {
      await updateTodo(todo.id, { category: undefined });
    }
    
    toast({
      title: "Category deleted",
      description: `Category "${category}" has been deleted.`,
      variant: "default"
    });
  };

  const setFilter = (newFilter: Partial<TeamTodoFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  };

  const setSort = (newSort: TodoSortOption) => {
    setSortState(newSort);
  };

  const refreshTodos = async () => {
    await fetchTodos();
  };

  const value: TeamTodoContextType = {
    todos,
    filteredTodos,
    categories,
    teamMembers,
    permissions,
    filter,
    sort,
    loading,
    error,
    stats,
    addTodo,
    toggleTodo,
    deleteTodo,
    clearCompleted,
    updateTodo,
    assignTodo,
    addCategory,
    deleteCategory,
    setFilter,
    setSort,
    refreshTodos
  };

  return (
    <TeamTodoContext.Provider value={value}>
      {children}
    </TeamTodoContext.Provider>
  );
};

export const useTeamTodo = (): TeamTodoContextType => {
  const context = useContext(TeamTodoContext);
  if (context === undefined) {
    throw new Error('useTeamTodo must be used within a TeamTodoProvider');
  }
  return context;
};