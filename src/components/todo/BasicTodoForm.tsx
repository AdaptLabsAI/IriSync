import React from 'react';
import { Input } from '../ui/input/Input';
import { Select } from '../ui/select/Select';
import { DatePicker } from '../ui/datepicker';
import { Button } from '../ui/button/Button';
import { FeatureGate } from '../subscription/FeatureGate';
import { TodoPriority, TodoPermissions } from '@/types/todo';

interface BasicTodoFormProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  category?: string;
  setCategory: (category: string | undefined) => void;
  dueDate: Date | null;
  setDueDate: (date: Date | null) => void;
  priority: TodoPriority;
  setPriority: (priority: TodoPriority) => void;
  assignedTo?: string;
  setAssignedTo: (userId: string | undefined) => void;
  estimatedHours?: number;
  setEstimatedHours: (hours: number | undefined) => void;
  
  // Options
  categoryOptions: { value: string; label: string }[];
  priorityOptions: { value: TodoPriority; label: string }[];
  memberOptions: { value: string; label: string }[];
  
  // State
  permissions: TodoPermissions;
  subscriptionTier: 'creator' | 'influencer' | 'enterprise';
  saving: boolean;
  
  // Category management
  showNewCategory: boolean;
  setShowNewCategory: (show: boolean) => void;
  newCategory: string;
  setNewCategory: (category: string) => void;
  handleAddCategory: () => void;
}

export const BasicTodoForm: React.FC<BasicTodoFormProps> = ({
  title, setTitle, description, setDescription,
  category, setCategory, dueDate, setDueDate,
  priority, setPriority, assignedTo, setAssignedTo,
  estimatedHours, setEstimatedHours,
  categoryOptions, priorityOptions, memberOptions,
  permissions, subscriptionTier, saving,
  showNewCategory, setShowNewCategory,
  newCategory, setNewCategory, handleAddCategory
}) => {
  return (
    <div className="space-y-4">
      {/* Title Field */}
      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-900 mb-1">
          Task Title *
        </label>
        <Input
          id="task-title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          disabled={saving}
          required
        />
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-900 mb-1">
          Description
        </label>
        <textarea
          id="task-description"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details about this task..."
          disabled={saving}
        />
      </div>

      {/* Category Selection */}
      {showNewCategory ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label htmlFor="new-category" className="block text-sm font-medium text-gray-900 mb-1">
              New Category
            </label>
            <Input
              id="new-category"
              fullWidth
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name"
              disabled={saving || !permissions.canManageCategories}
            />
          </div>
          <Button 
            onClick={handleAddCategory} 
            variant="primary" 
            disabled={saving || newCategory.trim() === '' || !permissions.canManageCategories}
          >
            Add
          </Button>
          <Button 
            onClick={() => setShowNewCategory(false)} 
            variant="outline" 
            disabled={saving}
          >
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
            ...(permissions.canManageCategories ? [{ value: 'add-new', label: '+ Add New Category' }] : [])
          ]}
          value={category || ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'add-new') {
              setShowNewCategory(true);
            } else {
              setCategory(value || undefined);
            }
          }}
          disabled={saving}
        />
      )}

      {/* Due Date and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Due Date</label>
          <DatePicker
            value={dueDate || undefined}
            onChange={(date) => setDueDate(date || null)}
            placeholder="Select due date"
            disabled={saving}
          />
        </div>
        
        <div>
          <Select
            id="priority-select"
            label="Priority"
            options={priorityOptions}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Assignment */}
      {permissions.canAssign && (
        <Select
          id="assignee-select"
          label="Assign To"
          options={memberOptions}
          value={assignedTo || ''}
          onChange={(e) => setAssignedTo(e.target.value || undefined)}
          disabled={saving}
        />
      )}

      {/* Time Tracking (Available to all tiers) */}
      <FeatureGate feature="time_tracking" subscriptionTier={subscriptionTier}>
        <div>
          <label htmlFor="estimated-hours" className="block text-sm font-medium text-gray-900 mb-1">
            Estimated Hours
          </label>
          <Input
            id="estimated-hours"
            type="number"
            min="0"
            step="0.5"
            value={estimatedHours || ''}
            onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g., 2.5"
            disabled={saving}
          />
        </div>
      </FeatureGate>
    </div>
  );
}; 