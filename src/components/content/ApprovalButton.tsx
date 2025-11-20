import React, { useState } from 'react';
import { Button } from '../ui/button';
import { CheckCircle, User, Users, AlertCircle, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

export interface TeamMember {
  /**
   * Unique identifier for the team member
   */
  id: string;
  /**
   * Display name of the team member
   */
  name: string;
  /**
   * Role of the team member
   */
  role?: string;
  /**
   * Optional avatar URL for the team member
   */
  avatarUrl?: string;
}

export interface ApprovalButtonProps {
  /**
   * Content data to be submitted for approval
   */
  contentData: Record<string, any>;
  /**
   * Team members who can approve content
   */
  teamMembers: TeamMember[];
  /**
   * Current user's subscription tier
   */
  userTier?: 'creator' | 'influencer' | 'enterprise';
  /**
   * Minimum required tier for using approval workflows
   */
  requiredTier?: 'influencer' | 'enterprise';
  /**
   * Function to call when submitting for approval
   */
  onSubmitForApproval: (approverIds: string[], note: string, contentData: Record<string, any>) => Promise<void>;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
  /**
   * Whether to show the button in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional custom label for the button
   */
  label?: string;
  /**
   * Optional tooltip
   */
  tooltip?: string;
  /**
   * Optional variant for the button
   */
  variant?: 'default' | 'outline' | 'ghost';
  /**
   * Optional size for the button
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ApprovalButton - Button to submit content for approval in team workflows
 */
export const ApprovalButton: React.FC<ApprovalButtonProps> = ({
  contentData,
  teamMembers,
  userTier = 'creator',
  requiredTier = 'influencer',
  onSubmitForApproval,
  className = '',
  disabled = false,
  isLoading = false,
  label = 'Submit for Approval',
  tooltip = 'Submit this content for team approval',
  variant = 'outline',
  size = 'sm',
}) => {
  const [open, setOpen] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has access to this feature based on their subscription tier
  const tierLevels = { creator: 1, influencer: 2, enterprise: 3 };
  const requiredTierLevel = tierLevels[requiredTier];
  const userTierLevel = tierLevels[userTier];
  const hasAccess = userTierLevel >= requiredTierLevel;

  // Handle approver selection
  const handleApproverChange = (value: string) => {
    // If "all" is selected, add all team members
    if (value === 'all') {
      setSelectedApprovers(teamMembers.map(member => member.id));
    } else {
      // Toggle the selected approver
      setSelectedApprovers(prev => 
        prev.includes(value)
          ? prev.filter(id => id !== value)
          : [...prev, value]
      );
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedApprovers.length === 0) {
      setError('Please select at least one approver');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmitForApproval(selectedApprovers, note, contentData);
      setOpen(false);
      // Reset form
      setSelectedApprovers([]);
      setNote('');
    } catch (err) {
      setError('Failed to submit for approval. Please try again.');
      console.error('Error submitting for approval:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get user names for selected approvers
  const getSelectedApproverNames = () => {
    return selectedApprovers
      .map(id => teamMembers.find(member => member.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading || !hasAccess}
          title={!hasAccess ? `Requires ${requiredTier} plan or higher` : tooltip}
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {label}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
        </DialogHeader>

        {!hasAccess ? (
          <div className="py-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upgrade Required</h3>
            <p className="text-sm text-gray-500 mb-4">
              Approval workflows require the {requiredTier} plan or higher.
            </p>
            <Button className="mt-2">Upgrade Now</Button>
          </div>
        ) : (
          <div className="py-2 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Approvers</label>
              <div className="grid grid-cols-2 gap-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedApprovers.includes(member.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => handleApproverChange(member.id)}
                  >
                    <div className="flex-shrink-0 mr-2">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      {member.role && (
                        <p className="text-xs text-gray-500 truncate">{member.role}</p>
                      )}
                    </div>
                    {selectedApprovers.includes(member.id) && (
                      <CheckCircle className="h-4 w-4 text-primary ml-2" />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline flex items-center"
                  onClick={() => handleApproverChange('all')}
                >
                  <Users className="h-3 w-3 mr-1" />
                  Select All
                </button>
                
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:underline"
                  onClick={() => setSelectedApprovers([])}
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="approval-note" className="text-sm font-medium">
                Add a Note (Optional)
              </label>
              <Textarea
                id="approval-note"
                placeholder="Add any context or specific requests for the approvers..."
                rows={3}
                value={note}
                onChange={(e: any) => setNote(e.target.value)}
              />
            </div>
            
            {selectedApprovers.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p className="font-medium">Approval Request Summary:</p>
                <p className="text-gray-600 mt-1">
                  This content will be sent to {selectedApprovers.length} approver(s): 
                  <span className="font-medium"> {getSelectedApproverNames()}</span>
                </p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedApprovers.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalButton; 