import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { useRouter } from 'next/navigation';
import Dialog from '../ui/dialog';
import { DialogContent, DialogTitle } from '@mui/material';
import Tabs from '../ui/tabs';
import { Users, Settings, PlusCircle, ArrowRight, CheckCircle, LoaderCircle } from 'lucide-react';
import { Input } from '../ui/input/Input';
import { Checkbox } from '../ui/checkbox/Checkbox';
import { Select } from '../ui/select/Select';

// Local Label component to avoid MUI import issues
const Label = ({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
);

export interface WorkflowStep {
  id: string;
  name: string;
  role: string;
  isOptional: boolean;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  steps: WorkflowStep[];
  contentTypes: string[];
}

export interface ApprovalWorkflowButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Custom handler for the approval workflow action
   */
  onManageWorkflows?: () => void;
  /**
   * Available roles for assignment
   */
  availableRoles?: { id: string; name: string }[];
  /**
   * Existing workflows
   */
  existingWorkflows?: Workflow[];
  /**
   * Content types that can be put through approval
   */
  contentTypes?: { id: string; name: string }[];
  /**
   * Callback when a workflow is created or updated
   */
  onWorkflowSave?: (workflow: Workflow) => Promise<void>;
  /**
   * Callback when a workflow is activated/deactivated
   */
  onWorkflowStatusChange?: (workflowId: string, isActive: boolean) => Promise<void>;
  /**
   * Whether to show the quick setup dialog
   */
  showSetupDialog?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
}

/**
 * A button for managing approval workflows.
 * This feature requires the 'team:manage_workflows' permission.
 */
const ApprovalWorkflowButton: React.FC<ApprovalWorkflowButtonProps> = ({
  onManageWorkflows,
  availableRoles = [],
  existingWorkflows = [],
  contentTypes = [],
  onWorkflowSave,
  onWorkflowStatusChange,
  showSetupDialog = false,
  iconOnly = false,
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [newWorkflow, setNewWorkflow] = useState<Partial<Workflow>>({
    name: '',
    description: '',
    isActive: true,
    steps: [{ id: crypto.randomUUID(), name: 'Approval', role: '', isOptional: false, order: 1 }],
    contentTypes: [],
  });

  const handleClick = () => {
    if (showSetupDialog) {
      setIsDialogOpen(true);
    } else if (onManageWorkflows) {
      onManageWorkflows();
    } else {
      router.push('/dashboard/settings/team/workflows');
    }
  };

  const handleAddStep = () => {
    if (!newWorkflow.steps) return;
    
    setNewWorkflow({
      ...newWorkflow,
      steps: [
        ...newWorkflow.steps,
        {
          id: crypto.randomUUID(),
          name: `Step ${newWorkflow.steps.length + 1}`,
          role: '',
          isOptional: false,
          order: newWorkflow.steps.length + 1
        }
      ]
    });
  };

  const handleRemoveStep = (stepId: string) => {
    if (!newWorkflow.steps) return;
    
    const updatedSteps = newWorkflow.steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({ ...step, order: index + 1 }));
    
    setNewWorkflow({
      ...newWorkflow,
      steps: updatedSteps
    });
  };

  const handleStepChange = (stepId: string, field: keyof WorkflowStep, value: any) => {
    if (!newWorkflow.steps) return;
    
    setNewWorkflow({
      ...newWorkflow,
      steps: newWorkflow.steps.map(step => 
        step.id === stepId ? { ...step, [field]: value } : step
      )
    });
  };

  const handleToggleContentType = (typeId: string, checked: boolean) => {
    const updatedTypes = checked
      ? [...(newWorkflow.contentTypes || []), typeId]
      : (newWorkflow.contentTypes || []).filter(id => id !== typeId);
    
    setNewWorkflow({
      ...newWorkflow,
      contentTypes: updatedTypes
    });
  };

  const handleSaveWorkflow = async () => {
    if (!onWorkflowSave || isLoading || !newWorkflow.name || !newWorkflow.steps?.length) return;
    
    setIsLoading(true);
    
    try {
      await onWorkflowSave(newWorkflow as Workflow);
      setIsDialogOpen(false);
      // Reset form
      setNewWorkflow({
        name: '',
        description: '',
        isActive: true,
        steps: [{ id: crypto.randomUUID(), name: 'Approval', role: '', isOptional: false, order: 1 }],
        contentTypes: [],
      });
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (workflowId: string, isActive: boolean) => {
    if (!onWorkflowStatusChange) return;
    
    setIsLoading(true);
    
    try {
      await onWorkflowStatusChange(workflowId, isActive);
    } catch (error) {
      console.error('Error changing workflow status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom modal instead of using the Dialog component which has compatibility issues
  const CustomDialog = isDialogOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-4">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Approval Workflows</h2>
        </div>

        <div className="p-6">
          <div className="flex border-b mb-6">
            <button 
              className={`px-4 py-2 ${activeTab === 0 ? 'border-b-2 border-blue-500 -mb-px font-medium' : ''}`}
              onClick={() => setActiveTab(0)}
            >
              Existing Workflows ({existingWorkflows.length})
            </button>
            <button 
              className={`px-4 py-2 ${activeTab === 1 ? 'border-b-2 border-blue-500 -mb-px font-medium' : ''}`}
              onClick={() => setActiveTab(1)}
            >
              Create New
            </button>
          </div>

          {activeTab === 0 && (
            <div className="space-y-4">
              {existingWorkflows.length === 0 ? (
                <div className="text-center p-6 border rounded-md">
                  <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No approval workflows found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Create your first workflow to streamline content approvals
                  </p>
                  <Button
                    variant="primary"
                    size="small"
                    className="mt-4"
                    onClick={() => setActiveTab(1)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {existingWorkflows.map(workflow => (
                    <div
                      key={workflow.id}
                      className="border rounded-lg p-4 hover:border-gray-400 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium flex items-center">
                            {workflow.name}
                            {workflow.isActive && (
                              <span className="ml-2 text-xs bg-[#00FF6A]/10 text-[#00CC44] rounded-full px-2 py-0.5 flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </span>
                            )}
                          </h4>
                          {workflow.description && (
                            <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
                          )}
                        </div>
                        <Button
                          variant={workflow.isActive ? "destructive" : "outline"}
                          size="small"
                          onClick={() => handleStatusChange(workflow.id, !workflow.isActive)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : workflow.isActive ? (
                            'Deactivate'
                          ) : (
                            'Activate'
                          )}
                        </Button>
                      </div>

                      <div className="mt-3">
                        <h5 className="text-xs font-medium text-gray-500 mb-1">Approval Flow:</h5>
                        <div className="flex items-center flex-wrap">
                          {workflow.steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                              <span className="text-sm bg-gray-100 rounded-md px-2 py-1">
                                {step.name}
                                <span className="text-xs text-gray-500 ml-1">({step.role})</span>
                              </span>
                              {index < workflow.steps.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-gray-400 mx-1" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {workflow.contentTypes.length > 0 && (
                        <div className="mt-2">
                          <h5 className="text-xs font-medium text-gray-500 mb-1">Applied to:</h5>
                          <div className="flex flex-wrap gap-1">
                            {workflow.contentTypes.map(typeId => {
                              const contentType = contentTypes.find(t => t.id === typeId);
                              return (
                                <span
                                  key={typeId}
                                  className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5"
                                >
                                  {contentType?.name || typeId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/settings/team/workflows')}
                >
                  Manage All Workflows
                </Button>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={newWorkflow.name}
                  onChange={e =>
                    setNewWorkflow({ ...newWorkflow, name: e.target.value })
                  }
                  placeholder="Content Approval Process"
                />
              </div>

              <div>
                <Label htmlFor="workflow-description">Description (Optional)</Label>
                <Input
                  id="workflow-description"
                  value={newWorkflow.description || ''}
                  onChange={e =>
                    setNewWorkflow({ ...newWorkflow, description: e.target.value })
                  }
                  placeholder="Standard approval workflow for social media posts"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Approval Steps</Label>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={handleAddStep}
                    disabled={newWorkflow.steps ? newWorkflow.steps.length >= 5 : false}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Step
                  </Button>
                </div>

                {newWorkflow.steps?.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 mb-2">
                    <div className="w-5 text-sm text-gray-500">{index + 1}.</div>
                    <Input
                      value={step.name}
                      onChange={e => handleStepChange(step.id, 'name', e.target.value)}
                      placeholder="Step Name"
                      className="flex-1"
                    />
                    <Select
                      label=""
                      options={availableRoles.map(role => ({ value: role.id, label: role.name }))}
                      value={step.role}
                      onChange={(e: any) => handleStepChange(step.id, 'role', e.target.value)}
                      placeholder="Select role"
                    />
                    <div className="flex items-center gap-1">
                      <Checkbox
                        id={`optional-${step.id}`}
                        checked={step.isOptional}
                        onChange={(e: any) => handleStepChange(step.id, 'isOptional', e.target.checked)}
                      />
                      <Label htmlFor={`optional-${step.id}`} className="text-xs cursor-pointer">
                        Optional
                      </Label>
                    </div>
                    {newWorkflow.steps && newWorkflow.steps.length > 1 && (
                      <Button
                        variant="outline"
                        size="small"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRemoveStep(step.id)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <Label className="mb-2 block">Apply to Content Types</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                  {contentTypes.map(type => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`content-type-${type.id}`}
                        checked={(newWorkflow.contentTypes || []).includes(type.id)}
                        onChange={(e: any) => handleToggleContentType(type.id, e.target.checked)}
                      />
                      <Label
                        htmlFor={`content-type-${type.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {type.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            
            {activeTab === 1 && (
              <Button
                variant="primary"
                onClick={handleSaveWorkflow}
                disabled={
                  isLoading ||
                  !newWorkflow.name ||
                  !newWorkflow.steps?.length ||
                  newWorkflow.steps.some(step => !step.role) ||
                  (newWorkflow.contentTypes || []).length === 0
                }
              >
                {isLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Save Workflow
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        // Available to all tier levels, but requires specific permission
        data-feature-tier="all"
        // Requires the 'team:manage_workflows' permission  
        data-required-permission="team:manage_workflows"
        title="Configure content approval workflows for your team"
        className={iconOnly ? 'px-2' : ''}
        {...buttonProps}
      >
        {iconOnly ? (
          <Settings className="h-4 w-4" />
        ) : (
          <>
            <Settings className="h-4 w-4 mr-2" />
            {children || 'Approval Workflows'}
          </>
        )}
      </Button>

      {showSetupDialog && CustomDialog}
    </>
  );
};

export default ApprovalWorkflowButton; 