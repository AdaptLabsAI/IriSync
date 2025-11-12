import React from 'react';
import { Select } from '../ui/select/Select';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { TodoPermissions } from '@/types/todo';

interface CollaborationTodoFormProps {
  // Collaboration fields
  watchers: string[];
  setWatchers: (watchers: string[]) => void;
  reviewers: string[];
  setReviewers: (reviewers: string[]) => void;
  
  // Options
  memberOptions: { value: string; label: string }[];
  
  // State
  permissions: TodoPermissions;
  subscriptionTier: 'creator' | 'influencer' | 'enterprise';
  saving: boolean;
}

export const CollaborationTodoForm: React.FC<CollaborationTodoFormProps> = ({
  watchers, setWatchers, reviewers, setReviewers,
  memberOptions, permissions, subscriptionTier, saving
}) => {
  const handleWatchersChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setWatchers(selectedOptions);
  };

  const handleReviewersChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setReviewers(selectedOptions);
  };

  return (
    <div className="space-y-4">
      {/* Watchers */}
      <FeatureGate feature="team_collaboration" subscriptionTier={subscriptionTier}>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Watchers
            <span className="text-xs text-gray-500 ml-2">
              (People who will be notified of updates)
            </span>
          </label>
          <select
            multiple
            value={watchers}
            onChange={handleWatchersChange}
            disabled={saving || !permissions.canEdit}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          >
            {memberOptions.filter(option => option.value !== '').map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Hold Ctrl/Cmd to select multiple members
          </p>
        </div>
      </FeatureGate>

      {/* Reviewers */}
      <FeatureGate feature="approval_workflows" subscriptionTier={subscriptionTier}>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Reviewers
            <span className="text-xs text-gray-500 ml-2">
              (People who need to approve this task)
            </span>
          </label>
          <select
            multiple
            value={reviewers}
            onChange={handleReviewersChange}
            disabled={saving || !permissions.canApprove}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          >
            {memberOptions.filter(option => option.value !== '').map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Hold Ctrl/Cmd to select multiple reviewers
          </p>
        </div>
      </FeatureGate>

      {/* Collaboration Notes */}
      <FeatureGate feature="team_collaboration" subscriptionTier={subscriptionTier}>
        <div className="bg-blue-50 p-3 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Collaboration Features</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Watchers receive notifications when the task is updated</li>
            <li>• Reviewers must approve the task before it can be marked complete</li>
            <li>• All team members can view task progress and comments</li>
            <li>• Task history and audit trail are automatically maintained</li>
          </ul>
        </div>
      </FeatureGate>
    </div>
  );
}; 