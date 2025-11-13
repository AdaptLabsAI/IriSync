'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTeamTodo } from '../../context/TeamTodoContext';
import { useTeam } from '../../context/TeamContext';
import type { 
  TeamTodoItem, 
  TodoPermissions
} from '../../types/todo';
import { 
  TodoStatus, 
  TodoPriority, 
  TodoType,
  ENTERPRISE_FEATURES 
} from '../../types/todo';
import { Button } from '../ui/button/Button';
import { Card, CardBody, CardFooter, CardTitle } from '../ui/card';
import { Input } from '../ui/input/Input';
import { Checkbox } from '../ui/checkbox/Checkbox';
import { Select } from '../ui/select/Select';
import { DatePicker } from '../ui/datepicker';
import DialogAdapter from '../ui/dialog/DialogAdapter';
import SimplifiedTabs from '../ui/tabs/SimplifiedTabs';
import Alert from '../ui/alert';
import Spinner from '../ui/spinner/Spinner';
import { useToast } from '../ui/use-toast/index';
import TeamSwitcher from '../ui/TeamSwitcher';
import { BasicTodoForm } from '../todo/BasicTodoForm';
import { AdvancedTodoForm } from '../todo/AdvancedTodoForm';
import { CollaborationTodoForm } from '../todo/CollaborationTodoForm';

const priorityColors = {
  [TodoPriority.CRITICAL]: '#d32f2f',
  [TodoPriority.HIGH]: '#ef5350',
  [TodoPriority.MEDIUM]: '#ff9800',
  [TodoPriority.LOW]: '#66bb6a'
};

const statusColors = {
  [TodoStatus.DRAFT]: '#9e9e9e',
  [TodoStatus.OPEN]: '#2196f3',
  [TodoStatus.IN_PROGRESS]: '#ff9800',
  [TodoStatus.PENDING_REVIEW]: '#9c27b0',
  [TodoStatus.PENDING_APPROVAL]: '#673ab7',
  [TodoStatus.APPROVED]: '#4caf50',
  [TodoStatus.REJECTED]: '#f44336',
  [TodoStatus.COMPLETED]: '#4caf50',
  [TodoStatus.CANCELLED]: '#757575',
  [TodoStatus.ON_HOLD]: '#ff5722'
};

interface FeatureGateProps {
  feature: string;
  subscriptionTier: 'creator' | 'influencer' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  subscriptionTier, 
  children, 
  fallback = null 
}) => {
  const hasAccess = ENTERPRISE_FEATURES[subscriptionTier].includes(feature as any);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

const UpgradePrompt: React.FC<{ 
  feature: string; 
  requiredTier: 'influencer' | 'enterprise';
  currentTier: 'creator' | 'influencer' | 'enterprise';
}> = ({ feature, requiredTier, currentTier }) => (
  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-blue-800">
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
        </h3>
        <div className="mt-2 text-sm text-blue-700">
          <p>
            {feature} is available in the {requiredTier} tier. 
            <a href="/pricing" className="font-medium underline hover:text-blue-600 ml-1">
              Upgrade now
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
);

const TeamTodoEditor: React.FC<{
  todo?: TeamTodoItem;
  open: boolean;
  onClose: () => void;
  permissions: TodoPermissions;
  subscriptionTier: 'creator' | 'influencer' | 'enterprise';
  teamMembers: Array<{
    userId: string;
    name: string;
    email: string;
  }>;
}> = ({ todo, open, onClose, permissions, subscriptionTier, teamMembers }) => {
  const { addTodo, updateTodo, categories, addCategory } = useTeamTodo();
  
  // Basic fields (available to all tiers)
  const [title, setTitle] = useState(todo?.title || '');
  const [description, setDescription] = useState(todo?.description || '');
  const [category, setCategory] = useState<string | undefined>(todo?.category);
  const [dueDate, setDueDate] = useState<Date | null>(todo?.dueDate ? new Date(todo.dueDate) : null);
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority || TodoPriority.MEDIUM);
  const [assignedTo, setAssignedTo] = useState<string | undefined>(todo?.assignedTo);
  
  // Advanced fields (tier-dependent)
  const [status, setStatus] = useState<TodoStatus>(todo?.status || TodoStatus.OPEN);
  const [type, setType] = useState<TodoType>(todo?.type || TodoType.TASK);
  const [tags, setTags] = useState<string[]>(todo?.tags || []);
  const [labels, setLabels] = useState<string[]>(todo?.labels || []);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(todo?.estimatedHours);
  const [startDate, setStartDate] = useState<Date | null>(todo?.startDate ? new Date(todo.startDate) : null);
  const [watchers, setWatchers] = useState<string[]>(todo?.watchers || []);
  const [reviewers, setReviewers] = useState<string[]>(todo?.reviewers || []);
  const [confidentialityLevel, setConfidentialityLevel] = useState<'public' | 'internal' | 'confidential' | 'restricted'>(
    (todo?.confidentialityLevel as 'public' | 'internal' | 'confidential' | 'restricted') || 'public'
  );
  
  // UI state
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    // Reset form when todo changes
    setTitle(todo?.title || '');
    setDescription(todo?.description || '');
    setCategory(todo?.category);
    setDueDate(todo?.dueDate ? new Date(todo.dueDate) : null);
    setPriority(todo?.priority || TodoPriority.MEDIUM);
    setStatus(todo?.status || TodoStatus.OPEN);
    setType(todo?.type || TodoType.TASK);
    setAssignedTo(todo?.assignedTo);
    setTags(todo?.tags || []);
    setLabels(todo?.labels || []);
    setEstimatedHours(todo?.estimatedHours);
    setStartDate(todo?.startDate ? new Date(todo.startDate) : null);
    setWatchers(todo?.watchers || []);
    setReviewers(todo?.reviewers || []);
    setConfidentialityLevel((todo?.confidentialityLevel as 'public' | 'internal' | 'confidential' | 'restricted') || 'public');
    setError(null);
  }, [todo]);

  const handleSubmit = async () => {
    if (title.trim() === '') return;
    
    try {
      setSaving(true);
      setError(null);

      // Convert TodoPriority enum to legacy string format
      const priorityMap = {
        [TodoPriority.LOW]: 'low' as const,
        [TodoPriority.MEDIUM]: 'medium' as const,
        [TodoPriority.HIGH]: 'high' as const,
        [TodoPriority.CRITICAL]: 'high' as const // Map critical to high for legacy API
      };

      // Prepare the options object for addTodo
      const options = {
        description,
        category,
        dueDate: dueDate?.toISOString(),
        priority: priorityMap[priority],
        assignedTo,
        // Include advanced fields based on tier access
        ...(ENTERPRISE_FEATURES[subscriptionTier].includes('time_tracking') && {
          estimatedHours
        }),
        // Only include tags if available (basic feature)
        tags
      };

      if (todo) {
        // For updates, we can include more fields
        const updateData = {
          title,
          description,
          category,
          dueDate: dueDate?.toISOString(),
          priority,
          assignedTo,
          // Include advanced fields based on tier access
          ...(ENTERPRISE_FEATURES[subscriptionTier].includes('time_tracking') && {
            estimatedHours
          }),
          // Include enterprise features if available
          ...(subscriptionTier === 'enterprise' && {
            status,
            type,
            tags,
            labels,
            startDate: startDate?.toISOString(),
            watchers,
            reviewers,
            confidentialityLevel
          })
        };
        await updateTodo(todo.id, updateData);
      } else {
        // For new todos, use the text parameter as expected by addTodo
        await addTodo(title, options);
      }
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() === '') return;
    try {
      addCategory(newCategory);
      setCategory(newCategory);
      setNewCategory('');
      setShowNewCategory(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add category');
    }
  };

  // Prepare options for form components
  const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));
  
  const priorityOptions = [
    { value: TodoPriority.LOW, label: 'Low' },
    { value: TodoPriority.MEDIUM, label: 'Medium' },
    { value: TodoPriority.HIGH, label: 'High' },
    { value: TodoPriority.CRITICAL, label: 'Critical' }
  ];
  
  const statusOptions = [
    { value: TodoStatus.DRAFT, label: 'Draft' },
    { value: TodoStatus.OPEN, label: 'Open' },
    { value: TodoStatus.IN_PROGRESS, label: 'In Progress' },
    { value: TodoStatus.PENDING_REVIEW, label: 'Pending Review' },
    { value: TodoStatus.COMPLETED, label: 'Completed' }
  ];
  
  const typeOptions = [
    { value: TodoType.TASK, label: 'Task' },
    { value: TodoType.BUG, label: 'Bug' },
    { value: TodoType.FEATURE, label: 'Feature' },
    { value: TodoType.IMPROVEMENT, label: 'Improvement' },
    { value: TodoType.RESEARCH, label: 'Research' }
  ];
  
  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...teamMembers.map(member => ({ 
      value: member.userId, 
      label: member.name || member.email 
    }))
  ];

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    ...(subscriptionTier !== 'creator' ? [
      { id: 'advanced', label: 'Advanced' }
    ] : []),
    ...(subscriptionTier === 'enterprise' ? [
      { id: 'collaboration', label: 'Collaboration' }
    ] : [])
  ];

  return (
    <DialogAdapter
      open={open}
      onClose={onClose}
      title={todo ? 'Edit Task' : 'Add New Task'}
    >
      <div className="flex flex-col gap-4">
        {error && (
          <Alert variant="standard" severity="error" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <FeatureGate 
          feature="basic_todos" 
          subscriptionTier={subscriptionTier}
          fallback={
            <div className="space-y-4">
              {/* Basic form for creator tier */}
              <BasicTodoForm 
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                dueDate={dueDate}
                setDueDate={setDueDate}
                priority={priority}
                setPriority={setPriority}
                assignedTo={assignedTo}
                setAssignedTo={setAssignedTo}
                estimatedHours={estimatedHours}
                setEstimatedHours={setEstimatedHours}
                categoryOptions={categoryOptions}
                priorityOptions={priorityOptions}
                memberOptions={memberOptions}
                permissions={permissions}
                subscriptionTier={subscriptionTier}
                saving={saving}
                showNewCategory={showNewCategory}
                setShowNewCategory={setShowNewCategory}
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                handleAddCategory={handleAddCategory}
              />
            </div>
          }
        >
          <SimplifiedTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          
            {activeTab === 'basic' && (
              <BasicTodoForm 
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                dueDate={dueDate}
                setDueDate={setDueDate}
                priority={priority}
                setPriority={setPriority}
                assignedTo={assignedTo}
                setAssignedTo={setAssignedTo}
                estimatedHours={estimatedHours}
                setEstimatedHours={setEstimatedHours}
                categoryOptions={categoryOptions}
                priorityOptions={priorityOptions}
                memberOptions={memberOptions}
                permissions={permissions}
                subscriptionTier={subscriptionTier}
                saving={saving}
                showNewCategory={showNewCategory}
                setShowNewCategory={setShowNewCategory}
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                handleAddCategory={handleAddCategory}
              />
            )}

            {activeTab === 'advanced' && (
              <AdvancedTodoForm 
                status={status}
                setStatus={setStatus}
                type={type}
                setType={setType}
                tags={tags}
                setTags={setTags}
                labels={labels}
                setLabels={setLabels}
                startDate={startDate}
                setStartDate={setStartDate}
                confidentialityLevel={confidentialityLevel}
                setConfidentialityLevel={setConfidentialityLevel}
                statusOptions={statusOptions}
                typeOptions={typeOptions}
                permissions={permissions}
                subscriptionTier={subscriptionTier}
                saving={saving}
              />
            )}

            {activeTab === 'collaboration' && (
              <CollaborationTodoForm 
                watchers={watchers}
                setWatchers={setWatchers}
                reviewers={reviewers}
                setReviewers={setReviewers}
                memberOptions={memberOptions}
                permissions={permissions}
                subscriptionTier={subscriptionTier}
                saving={saving}
              />
            )}
        </FeatureGate>
        
        <div className="flex justify-end gap-2 mt-2">
          <Button onClick={onClose} variant="outline" size="md" disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="primary" 
            size="md" 
            disabled={saving || title.trim() === ''}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {todo ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              todo ? 'Update' : 'Add'
            )}
          </Button>
        </div>
      </div>
    </DialogAdapter>
  );
};

const TeamTodoItem: React.FC<{
  todo: TeamTodoItem;
  onEdit: (todo: TeamTodoItem) => void;
  onDelete: (id: string) => void;
  permissions: TodoPermissions;
  teamMembers: Array<{
    userId: string;
    name: string;
    email: string;
  }>;
}> = ({ todo, onEdit, onDelete, permissions, teamMembers }) => {
  const { toggleTodo, assignTodo } = useTeamTodo();
  const [isToggling, setIsToggling] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    try {
      setIsToggling(true);
      await toggleTodo(todo.id);
    } catch (error) {
      console.error('Error toggling todo:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAssignmentChange = async (newAssignee: string) => {
    if (!permissions.canAssign) return;
    
    try {
      setIsAssigning(true);
      await assignTodo(todo.id, newAssignee || undefined);
    } catch (error) {
      console.error('Error assigning todo:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(todo.id);
      } catch (error) {
        console.error('Error deleting todo:', error);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const isOverdue = date < now && !todo.completed;
    
    return (
      <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
        {isOverdue && '⚠️ '}
        {date.toLocaleDateString()}
      </span>
    );
  };

  const getAssigneeName = (userId?: string) => {
    if (!userId) return 'Unassigned';
    const member = teamMembers.find(m => m.userId === userId);
    return member?.name || member?.email || userId;
  };

  const canEdit = permissions.canEdit && (
    permissions.canEdit === true || 
    todo.createdBy === 'current-user' || // Would be replaced with actual current user check
    todo.assignedTo === 'current-user'
  );

  const canDelete = permissions.canDelete && (
    permissions.canDelete === true ||
    todo.createdBy === 'current-user'
  );

  return (
    <Card className={`mb-3 ${todo.completed ? 'opacity-75' : ''}`}>
      <CardBody className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={todo.completed}
            onChange={handleToggle}
            disabled={isToggling || !permissions.canEdit}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {todo.title}
                </h3>
                
                {todo.description && (
                  <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                )}
                
                <div className="flex items-center space-x-4 mt-2">
                  {todo.category && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {todo.category}
                    </span>
                  )}
                  
                  {todo.priority && (
                    <span 
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: priorityColors[todo.priority] }}
                    >
                      {todo.priority.toUpperCase()}
                    </span>
                  )}
                  
                  {todo.dueDate && formatDate(todo.dueDate)}
                  
                  {todo.estimatedHours && (
                    <span className="text-xs text-gray-500">
                      ~{todo.estimatedHours}h
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    {permissions.canAssign ? (
                      <select
                        value={todo.assignedTo || ''}
                        onChange={(e) => handleAssignmentChange(e.target.value)}
                        disabled={isAssigning}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(member => (
                          <option key={member.userId} value={member.userId}>
                            {member.name || member.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Assigned to: {getAssigneeName(todo.assignedTo)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(todo)}
                      >
                        Edit
                      </Button>
                    )}
                    
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

const TeamTodoApp: React.FC = () => {
  const { data: session } = useSession();
  const {
    filteredTodos,
    categories,
    teamMembers,
    permissions,
    filter,
    sort,
    loading,
    error,
    stats,
    deleteTodo,
    clearCompleted,
    setFilter,
    setSort
  } = useTeamTodo();

  // Get team context separately
  const { 
    currentTeamId, 
    currentOrganizationId, 
    currentTeam,
    switchTeam 
  } = useTeam();

  const currentTeamName = currentTeam?.teamName;
  
  // Get subscription tier from session, default to 'creator'
  const subscriptionTier = (session?.user as any)?.subscriptionTier || 'creator';

  const [editingTodo, setEditingTodo] = useState<TeamTodoItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filter.search);
  const toastMethods = useToast();

  const handleEdit = (todo: TeamTodoItem) => {
    setEditingTodo(todo);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
    } catch (error) {
      toastMethods.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete task"
      });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFilter({ search: value });
  };

  const handleClearCompleted = async () => {
    if (window.confirm('Are you sure you want to clear all completed tasks?')) {
      try {
        await clearCompleted();
      } catch (error) {
        toastMethods.error({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to clear completed tasks"
        });
      }
    }
  };

  const handleTeamChange = (team: any) => {
    switchTeam(team.id);
  };

  if (!currentTeamId || !currentOrganizationId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardBody className="text-center p-8">
            <h2 className="text-xl font-semibold mb-4">Select a Team</h2>
            <p className="text-gray-600 mb-6">Please select a team to view and manage tasks.</p>
            {currentOrganizationId && (
              <TeamSwitcher
                currentOrganizationId={currentOrganizationId}
                onTeamChange={handleTeamChange}
                className="max-w-sm mx-auto"
              />
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Tasks</h1>
            <p className="text-gray-600">{currentTeamName}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <TeamSwitcher
              currentTeamId={currentTeamId}
              currentOrganizationId={currentOrganizationId}
              onTeamChange={handleTeamChange}
              className="w-64"
            />
            
            {permissions.canCreate && (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingTodo(null);
                  setShowEditor(true);
                }}
              >
                Add Task
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Tasks</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center p-4">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-gray-500">Overdue</div>
            </CardBody>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="flex-1"
          />
          
          <Select
            value={Array.isArray(filter.status) ? filter.status[0] || 'all' : filter.status}
            onChange={(e) => setFilter({ status: e.target.value === 'all' ? 'all' : [e.target.value as any] })}
            options={[
              { value: 'all', label: 'All Tasks' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' }
            ]}
          />
          
          <Select
            value={Array.isArray(filter.category) ? filter.category[0] || '' : filter.category || ''}
            onChange={(e) => setFilter({ category: e.target.value ? [e.target.value] : undefined })}
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat, label: cat }))
            ]}
          />
          
          {stats.completed > 0 && permissions.canDelete && (
            <Button
              variant="outline"
              onClick={handleClearCompleted}
              className="text-red-600"
            >
              Clear Completed
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="standard" severity="error" title="Error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      )}

      {/* Tasks List */}
      {!loading && (
        <div>
          {filteredTodos.length === 0 ? (
            <Card>
              <CardBody className="text-center p-8">
                <p className="text-gray-500">
                  {filter.search || filter.category || filter.status !== 'all'
                    ? 'No tasks match your current filters.'
                    : 'No tasks yet. Create your first task to get started!'}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div>
              {filteredTodos.map((todo) => (
                <TeamTodoItem
                  key={todo.id}
                  todo={todo}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  permissions={permissions}
                  teamMembers={teamMembers}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Todo Editor Dialog */}
      <TeamTodoEditor
        todo={editingTodo || undefined}
        open={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingTodo(null);
        }}
        permissions={permissions}
        subscriptionTier={subscriptionTier}
        teamMembers={teamMembers}
      />
    </div>
  );
};

export default TeamTodoApp; 