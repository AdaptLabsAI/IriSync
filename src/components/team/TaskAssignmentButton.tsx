import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { CheckSquare, Plus, Calendar, Flag, Users, X, Edit, Trash2 } from 'lucide-react';
import Dialog from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input/Input';
import { Textarea } from '../ui/textarea/Textarea';
import { Select } from '../ui/select/Select';
import { DatePicker } from '../ui/datepicker/DatePicker';
import { Avatar } from '../ui/Avatar';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  created: Date;
  createdBy: string;
  contentId?: string;
  contentType?: string;
}

export interface TaskAssignmentButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Team members that tasks can be assigned to
   */
  teamMembers?: { id: string; name: string; avatar?: string; role?: string }[];
  /**
   * The current user ID
   */
  currentUserId: string;
  /**
   * Content ID that this task relates to (optional)
   */
  contentId?: string;
  /**
   * Content type of the content (optional)
   */
  contentType?: string;
  /**
   * Content title (optional)
   */
  contentTitle?: string;
  /**
   * Existing tasks
   */
  tasks?: Task[];
  /**
   * Callback when a task is created
   */
  onCreateTask?: (task: Omit<Task, 'id' | 'created'>) => Promise<void>;
  /**
   * Callback when a task is updated
   */
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  /**
   * Callback when a task is deleted
   */
  onDeleteTask?: (taskId: string) => Promise<void>;
  /**
   * Whether to show the task count badge
   */
  showCount?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
}

/**
 * A button for creating and assigning tasks to team members.
 * This component provides task management functionality for collaborative work.
 * This feature requires the 'team:manage_tasks' permission for creation,
 * but viewing tasks is available to all team members.
 */
const TaskAssignmentButton: React.FC<TaskAssignmentButtonProps> = ({
  teamMembers = [],
  currentUserId,
  contentId,
  contentType,
  contentTitle,
  tasks = [],
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  showCount = true,
  iconOnly = false,
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // New task state
  const [newTask, setNewTask] = useState<Omit<Task, 'id' | 'created'>>({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium',
    status: 'todo',
    createdBy: currentUserId,
    contentId,
    contentType
  });
  
  const openTasks = tasks.filter(task => task.status !== 'completed');
  
  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedTask(null);
    setIsEditMode(false);
    resetNewTaskForm();
  };

  const resetNewTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      assigneeId: '',
      priority: 'medium',
      status: 'todo',
      createdBy: currentUserId,
      contentId,
      contentType
    });
  };

  const handleCreateTask = async () => {
    if (!onCreateTask || !newTask.title.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await onCreateTask(newTask);
      resetNewTaskForm();
      setActiveTab('tasks');
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!onUpdateTask || !selectedTask || isLoading) return;
    
    const updates: Partial<Task> = {};
    
    if (selectedTask.title !== newTask.title) updates.title = newTask.title;
    if (selectedTask.description !== newTask.description) updates.description = newTask.description;
    if (selectedTask.assigneeId !== newTask.assigneeId) updates.assigneeId = newTask.assigneeId;
    if (selectedTask.dueDate !== newTask.dueDate) updates.dueDate = newTask.dueDate;
    if (selectedTask.priority !== newTask.priority) updates.priority = newTask.priority;
    if (selectedTask.status !== newTask.status) updates.status = newTask.status;
    
    if (Object.keys(updates).length === 0) {
      setIsEditMode(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onUpdateTask(selectedTask.id, updates);
      setIsEditMode(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!onDeleteTask || isLoading) return;
    
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    setIsLoading(true);
    
    try {
      await onDeleteTask(taskId);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      assigneeId: task.assigneeId || '',
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      createdBy: task.createdBy,
      contentId: task.contentId,
      contentType: task.contentType
    });
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'review': return 'In Review';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-100';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-[#00FF6A]/10 text-[#00CC44]';
      default: return '';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'text-gray-500';
      case 'medium': return 'text-blue-500';
      case 'high': return 'text-orange-500';
      case 'urgent': return 'text-red-500';
      default: return '';
    }
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    return (
      <Flag 
        className={`h-4 w-4 ${getPriorityColor(priority)}`} 
        fill={priority !== 'low' ? 'currentColor' : 'none'} 
        fillOpacity={priority === 'low' ? 0 : priority === 'medium' ? 0.3 : priority === 'high' ? 0.5 : 0.8}
      />
    );
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return 'Unassigned';
    const member = teamMembers.find(m => m.id === assigneeId);
    return member ? member.name : 'Unknown User';
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<CheckSquare className="h-4 w-4" />}
        requiredPermission="team:view_tasks"
        {...buttonProps}
      >
        {iconOnly ? null : (
          <>
            {children || 'Tasks'}
            {showCount && openTasks.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                {openTasks.length}
              </span>
            )}
          </>
        )}
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        title={selectedTask && !isEditMode ? `Task: ${selectedTask.title}` : 'Team Tasks'}
        className="max-w-2xl"
      >
        {selectedTask && !isEditMode ? (
          // Task details view
          <div className="space-y-4">
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="small"
                onClick={() => setSelectedTask(null)}
                leftIcon={<X className="h-4 w-4" />}
                className="text-gray-500"
              >
                Back to list
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setIsEditMode(true)}
                  leftIcon={<Edit className="h-4 w-4" />}
                  requiredPermission="team:manage_tasks"
                >
                  Edit
                </Button>
                
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  className="text-red-500 hover:bg-red-50"
                  requiredPermission="team:manage_tasks"
                >
                  Delete
                </Button>
              </div>
            </div>
            
            <div className="border-b pb-3">
              <h3 className="text-lg font-medium">{selectedTask.title}</h3>
              {selectedTask.contentTitle && (
                <div className="text-sm text-gray-500 mt-1">
                  Related to: {selectedTask.contentTitle}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Status</p>
                <div className={`inline-block px-2 py-1 text-sm rounded-md ${getStatusColor(selectedTask.status)}`}>
                  {getStatusLabel(selectedTask.status)}
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Priority</p>
                <div className="flex items-center gap-1.5">
                  {getPriorityIcon(selectedTask.priority)}
                  <span className="capitalize">{selectedTask.priority}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Assignee</p>
                <div className="flex items-center gap-2">
                  {selectedTask.assigneeId ? (
                    <>
                      {teamMembers.find(m => m.id === selectedTask.assigneeId)?.avatar ? (
                        <Avatar
                          src={teamMembers.find(m => m.id === selectedTask.assigneeId)?.avatar}
                          alt={getAssigneeName(selectedTask.assigneeId)}
                          fallback={getAssigneeName(selectedTask.assigneeId).charAt(0)}
                          size="small"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-gray-400" />
                      )}
                      <span>{getAssigneeName(selectedTask.assigneeId)}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">Unassigned</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Due Date</p>
                <div>
                  {selectedTask.dueDate ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">No due date</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
                {selectedTask.description ? (
                  <p className="whitespace-pre-wrap text-sm">{selectedTask.description}</p>
                ) : (
                  <p className="text-gray-400 italic text-sm">No description provided</p>
                )}
              </div>
            </div>
            
            <div className="pt-3 text-xs text-gray-500">
              Created {new Date(selectedTask.created).toLocaleString()} by {teamMembers.find(m => m.id === selectedTask.createdBy)?.name || 'Unknown'}
            </div>
          </div>
        ) : selectedTask && isEditMode ? (
          // Task edit view
          <div className="space-y-4">
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  setIsEditMode(false);
                  setNewTask({
                    title: selectedTask.title,
                    description: selectedTask.description || '',
                    assigneeId: selectedTask.assigneeId || '',
                    dueDate: selectedTask.dueDate,
                    priority: selectedTask.priority,
                    status: selectedTask.status,
                    createdBy: selectedTask.createdBy,
                    contentId: selectedTask.contentId,
                    contentType: selectedTask.contentType
                  });
                }}
                leftIcon={<X className="h-4 w-4" />}
                className="text-gray-500"
              >
                Cancel
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title*
                </label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e: any) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e: any) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  <Select
                    id="assignee"
                    value={newTask.assigneeId}
                    onChange={(e: any) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.role ? `(${member.role})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <DatePicker
                    id="dueDate"
                    selected={newTask.dueDate}
                    onChange={(date) => setNewTask({ ...newTask, dueDate: date as Date })}
                    placeholderText="Select a due date"
                    minDate={new Date()}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <Select
                    id="priority"
                    value={newTask.priority}
                    onChange={(e: any) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select
                    id="status"
                    value={newTask.status}
                    onChange={(e: any) => setNewTask({ ...newTask, status: e.target.value as Task['status'] })}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="completed">Completed</option>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  onClick={handleUpdateTask}
                  disabled={!newTask.title.trim() || isLoading}
                  loading={isLoading}
                >
                  Update Task
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Tasks list and create view
          <div className="space-y-4">
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="tasks">All Tasks ({tasks.length})</TabsTrigger>
                <TabsTrigger value="create" disabled={!onCreateTask}>Create New</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tasks" className="space-y-4">
                {tasks.length > 0 ? (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 border rounded-lg hover:border-gray-400 cursor-pointer transition-colors"
                        onClick={() => handleSelectTask(task)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <div className="font-medium">{task.title}</div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm">
                              <div className={`px-2 py-0.5 rounded-md ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                {getPriorityIcon(task.priority)}
                                <span className="capitalize">{task.priority}</span>
                              </div>
                              
                              {task.dueDate && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            {task.description && (
                              <div className="mt-2 text-sm text-gray-600 truncate max-w-md">
                                {task.description}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            {task.assigneeId ? (
                              <Avatar
                                src={teamMembers.find(m => m.id === task.assigneeId)?.avatar}
                                alt={getAssigneeName(task.assigneeId)}
                                fallback={getAssigneeName(task.assigneeId).charAt(0)}
                                size="small"
                                tooltip={getAssigneeName(task.assigneeId)}
                              />
                            ) : (
                              <span className="text-xs text-gray-500">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-md border-dashed">
                    <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No tasks found</p>
                    {onCreateTask && (
                      <Button
                        variant="outline"
                        size="small"
                        className="mt-3"
                        onClick={() => setActiveTab('create')}
                        leftIcon={<Plus className="h-4 w-4" />}
                      >
                        Create New Task
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="create" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-title" className="block text-sm font-medium text-gray-700 mb-1">
                      Task Title*
                    </label>
                    <Input
                      id="new-title"
                      value={newTask.title}
                      onChange={(e: any) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="new-description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Textarea
                      id="new-description"
                      value={newTask.description}
                      onChange={(e: any) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Enter task description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="new-assignee" className="block text-sm font-medium text-gray-700 mb-1">
                        Assignee
                      </label>
                      <Select
                        id="new-assignee"
                        value={newTask.assigneeId}
                        onChange={(e: any) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name} {member.role ? `(${member.role})` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <label htmlFor="new-dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <DatePicker
                        id="new-dueDate"
                        selected={newTask.dueDate}
                        onChange={(date) => setNewTask({ ...newTask, dueDate: date as Date })}
                        placeholderText="Select a due date"
                        minDate={new Date()}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="new-priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <Select
                        id="new-priority"
                        value={newTask.priority}
                        onChange={(e: any) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </Select>
                    </div>
                    
                    <div>
                      <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <Select
                        id="new-status"
                        value={newTask.status}
                        onChange={(e: any) => setNewTask({ ...newTask, status: e.target.value as Task['status'] })}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">In Review</option>
                        <option value="completed">Completed</option>
                      </Select>
                    </div>
                  </div>
                  
                  {contentTitle && (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      <p className="font-medium">Related Content</p>
                      <p className="text-gray-700 mt-1">{contentTitle}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => {
                        resetNewTaskForm();
                        setActiveTab('tasks');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCreateTask}
                      disabled={!newTask.title.trim() || isLoading}
                      loading={isLoading}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Create Task
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default TaskAssignmentButton; 