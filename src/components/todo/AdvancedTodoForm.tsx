import React from 'react';
import { Input } from '../ui/input/Input';
import { Select } from '../ui/select/Select';
import { DatePicker } from '../ui/datepicker';
import { TagInput } from '../ui/tag-input';
import { FeatureGate } from '../subscription/FeatureGate';
import { TodoStatus, TodoType, TodoPriority, TodoPermissions } from '@/types/todo';

interface AdvancedTodoFormProps {
  // Advanced fields
  status: TodoStatus;
  setStatus: (status: TodoStatus) => void;
  type: TodoType;
  setType: (type: TodoType) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  labels: string[];
  setLabels: (labels: string[]) => void;
  startDate: Date | null;
  setStartDate: (date: Date | null) => void;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  setConfidentialityLevel: (level: 'public' | 'internal' | 'confidential' | 'restricted') => void;
  
  // Options
  statusOptions: { value: TodoStatus; label: string }[];
  typeOptions: { value: TodoType; label: string }[];
  
  // State
  permissions: TodoPermissions;
  subscriptionTier: 'creator' | 'influencer' | 'enterprise';
  saving: boolean;
}

export const AdvancedTodoForm: React.FC<AdvancedTodoFormProps> = ({
  status, setStatus, type, setType,
  tags, setTags, labels, setLabels,
  startDate, setStartDate,
  confidentialityLevel, setConfidentialityLevel,
  statusOptions, typeOptions,
  permissions, subscriptionTier, saving
}) => {
  const confidentialityOptions = [
    { value: 'public' as const, label: 'Public' },
    { value: 'internal' as const, label: 'Internal' },
    { value: 'confidential' as const, label: 'Confidential' },
    { value: 'restricted' as const, label: 'Restricted' }
  ];

  return (
    <div className="space-y-4">
      {/* Status and Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Select
            id="status-select"
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as TodoStatus)}
            disabled={saving || !permissions.canEdit}
          />
        </div>
        
        <div>
          <Select
            id="type-select"
            label="Type"
            options={typeOptions}
            value={type}
            onChange={(e) => setType(e.target.value as TodoType)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
        <DatePicker
          value={startDate || undefined}
          onChange={(date) => setStartDate(date || null)}
          placeholder="Select start date"
          disabled={saving}
        />
      </div>

      {/* Tags and Labels */}
      <FeatureGate feature="advanced_filtering" subscriptionTier={subscriptionTier}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Tags</label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags..."
              isDisabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Labels</label>
            <TagInput
              value={labels}
              onChange={setLabels}
              placeholder="Add labels..."
              isDisabled={saving}
            />
          </div>
        </div>
      </FeatureGate>

      {/* Confidentiality Level (Enterprise only) */}
      <FeatureGate feature="confidentiality_levels" subscriptionTier={subscriptionTier}>
        <div>
          <Select
            id="confidentiality-select"
            label="Confidentiality Level"
            options={confidentialityOptions}
            value={confidentialityLevel}
            onChange={(e) => setConfidentialityLevel(e.target.value as 'public' | 'internal' | 'confidential' | 'restricted')}
            disabled={saving || !permissions.canEditConfidential}
          />
        </div>
      </FeatureGate>
    </div>
  );
}; 