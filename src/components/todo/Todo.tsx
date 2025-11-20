'use client';

import React, { useState, useEffect } from 'react';
import { useTodo, SortOption } from '../context/TodoContext';
import type { TodoItem } from '../context/TodoContext';
import { Button } from './ui/button/Button';
import { Card, CardBody, CardFooter, CardTitle } from './ui/card';
import { Input } from './ui/input/Input';
import { Checkbox } from './ui/checkbox/Checkbox';
import { Select } from './ui/select/Select';
import { DatePicker } from './ui/datepicker';
import DialogAdapter from './ui/dialog/DialogAdapter';
import SimplifiedTabs from './ui/tabs/SimplifiedTabs';
import Alert from './ui/alert';
import Spinner from './ui/spinner/Spinner';
import { useToast } from './ui/use-toast';

const priorityColors = {
  high: '#ef5350',
  medium: '#ff9800',
  low: '#66bb6a'
};

const TodoEditor: React.FC<{
  todo?: TodoItem;
  open: boolean;
  onClose: () => void;
}> = ({ todo, open, onClose }) => {
  const { addTodo, updateTodo, categories, addCategory } = useTodo();
  const [text, setText] = useState(todo?.text || '');
  const [category, setCategory] = useState<string | undefined>(todo?.category);
  const [dueDate, setDueDate] = useState<Date | null>(todo?.dueDate ? new Date(todo.dueDate) : null);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(todo?.priority || 'medium');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when todo changes
    setText(todo?.text || '');
    setCategory(todo?.category);
    setDueDate(todo?.dueDate ? new Date(todo.dueDate) : null);
    setPriority(todo?.priority || 'medium');
    setError(null);
  }, [todo]);

  const handleSubmit = async () => {
    if (text.trim() === '') return;
    
    try {
      setSaving(true);
      setError(null);

      if (todo) {
        // Update existing todo
        await updateTodo(todo.id, {
          text,
          category,
          dueDate: dueDate?.toISOString(),
          priority
        });
      } else {
        // Add new todo
        await addTodo(text, category, dueDate?.toISOString(), priority);
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

  // Prepare category options for select
  const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));
  
  // Prepare priority options
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
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
        
        <div>
          <label htmlFor="task-input" className="block text-sm font-medium text-gray-900 mb-1">Task</label>
          <Input
            id="task-input"
            fullWidth
            value={text}
            onChange={(e: any) => setText(e.target.value)}
            placeholder="Enter task description"
            aria-required="true"
            disabled={saving}
          />
        </div>
        
        {showNewCategory ? (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="new-category" className="block text-sm font-medium text-gray-900 mb-1">New Category</label>
              <Input
                id="new-category"
                fullWidth
                value={newCategory}
                onChange={(e: any) => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
                disabled={saving}
              />
            </div>
            <Button onClick={handleAddCategory} variant="primary" size="md" disabled={saving || newCategory.trim() === ''}>
              Add
            </Button>
            <Button onClick={() => setShowNewCategory(false)} variant="outline" size="md" disabled={saving}>
              Cancel
            </Button>
          </div>
        ) : (
          <Select
            id="category-select"
            label="Category"
            options={[
              { value: '', label: 'None' },
              ...categoryOptions,
              { value: 'add-new', label: '+ Add New Category' }
            ]}
            value={category || ''}
            onChange={(e: any) => {
              const value = e.target.value;
              if (value === 'add-new') {
                setShowNewCategory(true);
              } else {
                setCategory(value || undefined);
              }
            }}
            disabled={saving}
            aria-label="Select a category"
          />
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <span className="block text-sm font-medium text-gray-900 mb-1">Due Date</span>
            <DatePicker
              value={dueDate ? dueDate : undefined}
              onChange={(date) => setDueDate(date)}
              placeholder="Select due date"
              disabled={saving}
              aria-label="Select a due date"
            />
          </div>

          <div className="flex-1">
            <Select
              id="priority-select"
              label="Priority"
              options={priorityOptions}
              value={priority}
              onChange={(e: any) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              disabled={saving}
              aria-label="Select priority level"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-2">
          <Button onClick={onClose} variant="outline" size="md" disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="primary" 
            size="md" 
            disabled={saving || text.trim() === ''}
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

const FilterSortDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { categories, filter, setFilter, sort, setSort } = useTodo();
  const [localFilter, setLocalFilter] = useState(filter);
  const [localSort, setLocalSort] = useState<SortOption>(sort);

  useEffect(() => {
    // Reset local state when dialog opens
    if (open) {
      setLocalFilter(filter);
      setLocalSort(sort);
    }
  }, [open, filter, sort]);

  const handleApply = () => {
    setFilter(localFilter);
    setSort(localSort);
    onClose();
  };

  const handleReset = () => {
    const defaultFilter = {
      status: 'all' as const,
      category: null,
      search: ''
    };
    setLocalFilter(defaultFilter);
    setLocalSort('createdAt');
    setFilter(defaultFilter);
    setSort('createdAt');
    onClose();
  };

  // Category options for select
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat, label: cat }))
  ];

  // Sort options
  const sortOptions = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'alphabetical', label: 'Alphabetical' }
  ];

  return (
    <DialogAdapter
      open={open}
      onClose={onClose}
      title="Filter & Sort"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Filter by Status</h3>
          <div className="flex space-x-2 border-b" role="radiogroup" aria-label="Filter by status">
            <button 
              className={`px-4 py-2 ${localFilter.status === 'all' ? 'border-b-2 border-primary font-medium' : ''}`}
              onClick={() => setLocalFilter({ ...localFilter, status: 'all' })}
              role="radio"
              aria-checked={localFilter.status === 'all'}
            >
              All
            </button>
            <button 
              className={`px-4 py-2 ${localFilter.status === 'active' ? 'border-b-2 border-primary font-medium' : ''}`}
              onClick={() => setLocalFilter({ ...localFilter, status: 'active' })}
              role="radio"
              aria-checked={localFilter.status === 'active'}
            >
              Active
            </button>
            <button 
              className={`px-4 py-2 ${localFilter.status === 'completed' ? 'border-b-2 border-primary font-medium' : ''}`}
              onClick={() => setLocalFilter({ ...localFilter, status: 'completed' })}
              role="radio"
              aria-checked={localFilter.status === 'completed'}
            >
              Completed
            </button>
          </div>
        </div>

        <Select
          id="filter-category"
          label="Filter by Category"
          options={categoryOptions}
          value={localFilter.category || ''}
          onChange={(e: any) => setLocalFilter({ ...localFilter, category: e.target.value || null })}
          aria-label="Filter by category"
        />

        <Select
          id="sort-by"
          label="Sort By"
          options={sortOptions}
          value={localSort}
          onChange={(e: any) => setLocalSort(e.target.value as SortOption)}
          aria-label="Sort tasks by"
        />
        
        <div>
          <span className="block text-sm font-medium text-gray-900 mb-1">Search</span>
          <Input 
            value={localFilter.search} 
            onChange={(e: any) => setLocalFilter({ ...localFilter, search: e.target.value })}
            placeholder="Search tasks..."
            leftElement={<SearchIcon />}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleReset} variant="outline" size="md">
            Reset
          </Button>
          <Button onClick={handleApply} variant="primary" size="md">
            Apply
          </Button>
        </div>
      </div>
    </DialogAdapter>
  );
};

const TodoItem: React.FC<{
  todo: TodoItem;
  onEdit: (todo: TodoItem) => void;
  onDelete: (id: string) => void;
}> = ({ todo, onEdit, onDelete }) => {
  const { toggleTodo } = useTodo();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await toggleTodo(todo.id);
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      // Revert the checkbox state
      e.target.checked = todo.completed;
      setError('Failed to update task status');
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(todo.id);
    } catch (error) {
      setError('Failed to delete task');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      console.error('Invalid date format:', e);
      return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-3 bg-white shadow-sm hover:shadow transition-shadow">
      {error && (
        <Alert variant="standard" severity="error" title="Error" onClose={() => setError(null)} className="mb-2">
          {error}
        </Alert>
      )}
      
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Checkbox 
            checked={todo.completed} 
            onChange={handleToggle} 
            aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          />
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <p className={`text-lg font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {todo.text}
            </p>
            
            <div className="flex items-center gap-1 mt-2 sm:mt-0">
              {todo.category && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  {todo.category}
                </span>
              )}
              
              {todo.priority && (
                <span 
                  className="text-xs font-medium px-2.5 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${priorityColors[todo.priority]}20`, 
                    color: priorityColors[todo.priority] 
                  }}
                >
                  {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                </span>
              )}
              
              {todo.dueDate && (
                <span className="flex items-center text-xs text-gray-500 ml-2">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {formatDate(todo.dueDate)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onEdit(todo)}
              className="text-xs flex items-center text-gray-500 hover:text-gray-700"
              aria-label={`Edit task: ${todo.text}`}
            >
              <EditIcon />
              <span className="ml-1">Edit</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="text-xs flex items-center text-red-500 hover:text-red-700"
              aria-label={`Delete task: ${todo.text}`}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner size="sm" className="w-3 h-3 mr-1" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <DeleteIcon />
                  <span className="ml-1">Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TodoList: React.FC = () => {
  const { filteredTodos, loading, toggleTodo, deleteTodo } = useTodo();
  const [editingTodo, setEditingTodo] = useState<TodoItem | undefined>(undefined);

  const handleEdit = (todo: TodoItem) => {
    setEditingTodo(todo);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">Loading tasks...</p>
      </div>
    );
  }

  if (filteredTodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="mb-3 text-5xl text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-1">No tasks found</h3>
        <p className="text-gray-500 max-w-sm">
          {filteredTodos.length === 0 ? 'Add your first task to get started!' : 'No tasks match your current filters.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      {filteredTodos.map(todo => (
        <TodoItem 
          key={todo.id} 
          todo={todo} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
        />
      ))}
      
      {editingTodo && (
        <TodoEditor 
          todo={editingTodo} 
          open={!!editingTodo} 
          onClose={() => setEditingTodo(undefined)} 
        />
      )}
    </div>
  );
};

const TodoApp: React.FC = () => {
  const { 
    filteredTodos, 
    todos, 
    filter, 
    setFilter, 
    sort, 
    setSort, 
    clearCompleted, 
    loading,
    syncTodos
  } = useTodo();
  const [editingTodo, setEditingTodo] = useState<TodoItem | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncingData, setSyncingData] = useState(false);
  const toast = useToast();

  const handleEdit = (todo: TodoItem) => {
    setEditingTodo(todo);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    // Handled in the TodoItem component
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFilter({ search: value });
  };

  const handleSyncData = async () => {
    try {
      setSyncingData(true);
      await syncTodos();
    } catch (error) {
      console.error('Error syncing data:', error);
      toast.error({
        title: "Sync failed",
        description: `Failed to sync with Firebase. Collection: todos. ${error instanceof Error ? error.message : ''}`
      });
    } finally {
      setSyncingData(false);
    }
  };

  // Calculate counts
  const totalTodos = todos.length;
  const activeTodos = todos.filter(todo => !todo.completed).length;
  const completedTodos = todos.filter(todo => todo.completed).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
            <SearchIcon />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="border-0 bg-transparent w-full focus:ring-0"
              aria-label="Search tasks"
            />
            {searchTerm && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setFilter({ search: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowFilterDialog(true)}
            className="ml-2 gap-1"
            aria-label="Filter and sort tasks"
          >
            <FilterIcon /> Filter
          </Button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowEditor(true)}
            className="flex-1 md:flex-none gap-1"
            aria-label="Add new task"
          >
            <PlusIcon /> Add Task
          </Button>
          
          <Button
            variant="outline"
            size="md"
            onClick={handleSyncData}
            disabled={syncingData}
            className="gap-1"
            aria-label="Sync tasks with server"
          >
            {syncingData ? (
              <>
                <Spinner size="sm" className="mr-1" />
                Syncing...
              </>
            ) : (
              <>
                <SyncIcon className="w-4 h-4" /> Sync
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex justify-between mb-4">
        <SimplifiedTabs
          tabs={[
            { id: 'all', label: `All (${totalTodos})` },
            { id: 'active', label: `Active (${activeTodos})` },
            { id: 'completed', label: `Completed (${completedTodos})` },
          ]}
          value={filter.status}
          onChange={(value) => setFilter({ status: value as 'all' | 'active' | 'completed' })}
        />

        {completedTodos > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompleted}
            className="text-red-500 hover:text-red-700"
            aria-label="Clear completed tasks"
          >
            Clear completed
          </Button>
        )}
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardBody className="p-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Spinner size="md" />
              <p className="ml-2 text-gray-500">Loading tasks...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-32 p-6">
              <p className="text-gray-500 mb-2">No tasks found</p>
              {filter.status !== 'all' || filter.category || filter.search ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilter({ status: 'all', category: null, search: '' });
                    setSearchTerm('');
                  }}
                  aria-label="Clear filters"
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowEditor(true)}
                  aria-label="Add your first task"
                >
                  Add your first task
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredTodos.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </CardBody>
        
        <CardFooter className="py-2 px-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="w-full flex justify-between items-center">
            <div>
              {activeTodos} item{activeTodos !== 1 ? 's' : ''} left
            </div>
            <div className="flex items-center">
              <span className="mr-2">Sort:</span>
              <Select
                id="sort-select"
                value={sort}
                onChange={(e: any) => setSort(e.target.value as SortOption)}
                className="text-xs py-1 h-auto min-h-0"
                aria-label="Sort tasks"
                options={[
                  { value: 'createdAt', label: 'Date created' },
                  { value: 'dueDate', label: 'Due date' },
                  { value: 'priority', label: 'Priority' },
                  { value: 'alphabetical', label: 'Alphabetical' },
                ]}
              />
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Task editor dialog */}
      <TodoEditor
        todo={editingTodo}
        open={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingTodo(undefined);
        }}
      />

      {/* Filter/sort dialog */}
      <FilterSortDialog
        open={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
      />
    </div>
  );
};

// Icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CalendarIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const SyncIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
);

export default TodoApp; 