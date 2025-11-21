import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from '../ui/use-toast';

import {
  Webhook,
  Plus,
  Save,
  Trash,
  Loader2,
  PlayCircle,
  Calendar,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

export type WebhookEvent = 
  'content.created' | 
  'content.updated' | 
  'content.published' | 
  'content.deleted' | 
  'media.uploaded' |
  'analytics.report' | 
  'team.member_added' | 
  'team.member_removed' |
  'subscription.changed';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  createdAt: Date;
  active: boolean;
  lastTriggered?: Date;
  lastResponse?: {
    status: number;
    success: boolean;
    timestamp: Date;
  };
}

export interface WebhookConfigButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Webhook configurations
   */
  webhooks?: WebhookConfig[];
  /**
   * Callback for creating a new webhook
   */
  onCreateWebhook?: (webhook: Omit<WebhookConfig, 'id' | 'createdAt' | 'lastTriggered' | 'lastResponse'>) => Promise<WebhookConfig>;
  /**
   * Callback for updating a webhook
   */
  onUpdateWebhook?: (id: string, webhook: Partial<WebhookConfig>) => Promise<WebhookConfig>;
  /**
   * Callback for deleting a webhook
   */
  onDeleteWebhook?: (id: string) => Promise<void>;
  /**
   * Callback for testing a webhook
   */
  onTestWebhook?: (id: string) => Promise<{ success: boolean; status: number; message: string }>;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * WebhookConfigButton - A component for managing webhook configurations.
 * This component allows users to create, update, and delete webhooks for event notifications.
 */
const WebhookConfigButton: React.FC<WebhookConfigButtonProps> = ({
  webhooks = [],
  onCreateWebhook,
  onUpdateWebhook,
  onDeleteWebhook,
  onTestWebhook,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localWebhooks, setLocalWebhooks] = useState<WebhookConfig[]>([...webhooks]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  
  // Form state for creating/editing webhooks
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; status: number; message: string } | null>(null);
  
  React.useEffect(() => {
    setLocalWebhooks([...webhooks]);
  }, [webhooks]);
  
  const handleOpenDialog = () => {
    setIsOpen(true);
  };
  
  const resetForm = () => {
    setName('');
    setUrl('');
    setSecret('');
    setEvents([]);
    setActive(true);
    setFormError('');
    setTestResult(null);
    setSelectedWebhookId(null);
    setIsCreating(false);
    setIsEditing(false);
  };
  
  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
  };
  
  const handleStartEdit = (webhook: WebhookConfig) => {
    resetForm();
    setName(webhook.name);
    setUrl(webhook.url);
    setSecret(webhook.secret);
    setEvents([...webhook.events]);
    setActive(webhook.active);
    setSelectedWebhookId(webhook.id);
    setIsEditing(true);
  };
  
  const validateForm = () => {
    if (!name.trim()) {
      setFormError('Name is required');
      return false;
    }
    
    if (!url.trim()) {
      setFormError('URL is required');
      return false;
    }
    
    try {
      new URL(url);
    } catch (e) {
      setFormError('URL is invalid');
      return false;
    }
    
    if (events.length === 0) {
      setFormError('At least one event must be selected');
      return false;
    }
    
    setFormError('');
    return true;
  };
  
  const handleCreateWebhook = async () => {
    if (!onCreateWebhook || !validateForm()) return;
    
    setIsCreating(true);
    
    try {
      const newWebhook = await onCreateWebhook({
        name,
        url,
        secret,
        events,
        active
      });
      
      setLocalWebhooks(prev => [...prev, newWebhook]);
      
      toast({
        title: "Webhook created",
        description: "Your webhook has been created successfully"
      });
      
      resetForm();
    } catch (err) {
      console.error('Error creating webhook:', err);
      toast({
        title: "Failed to create webhook",
        description: "An error occurred while creating the webhook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleUpdateWebhook = async () => {
    if (!onUpdateWebhook || !selectedWebhookId || !validateForm()) return;
    
    try {
      const updatedWebhook = await onUpdateWebhook(selectedWebhookId, {
        name,
        url,
        secret,
        events,
        active
      });
      
      setLocalWebhooks(prev => 
        prev.map(webhook => webhook.id === selectedWebhookId ? updatedWebhook : webhook)
      );
      
      toast({
        title: "Webhook updated",
        description: "Your webhook has been updated successfully"
      });
      
      resetForm();
    } catch (err) {
      console.error('Error updating webhook:', err);
      toast({
        title: "Failed to update webhook",
        description: "An error occurred while updating the webhook. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteWebhook = async (id: string) => {
    if (!onDeleteWebhook) return;
    
    setIsDeleting(true);
    setSelectedWebhookId(id);
    
    try {
      await onDeleteWebhook(id);
      
      setLocalWebhooks(prev => prev.filter(webhook => webhook.id !== id));
      
      toast({
        title: "Webhook deleted",
        description: "The webhook has been deleted successfully"
      });
    } catch (err) {
      console.error('Error deleting webhook:', err);
      toast({
        title: "Failed to delete webhook",
        description: "An error occurred while deleting the webhook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setSelectedWebhookId(null);
    }
  };
  
  const handleTestWebhook = async (id: string) => {
    if (!onTestWebhook) return;
    
    setIsTesting(true);
    setSelectedWebhookId(id);
    setTestResult(null);
    
    try {
      const result = await onTestWebhook(id);
      
      setTestResult(result);
      
      toast({
        title: result.success ? "Test successful" : "Test failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (err) {
      console.error('Error testing webhook:', err);
      toast({
        title: "Test failed",
        description: "An error occurred while testing the webhook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
      // Leave the selected ID and test result for display
    }
  };
  
  const handleToggleEvent = (event: WebhookEvent) => {
    if (events.includes(event)) {
      setEvents(events.filter(e => e !== event));
    } else {
      setEvents([...events, event]);
    }
  };
  
  // Function to get event label
  const getEventLabel = (event: WebhookEvent) => {
    switch (event) {
      case 'content.created': return 'Content Created';
      case 'content.updated': return 'Content Updated';
      case 'content.published': return 'Content Published';
      case 'content.deleted': return 'Content Deleted';
      case 'media.uploaded': return 'Media Uploaded';
      case 'analytics.report': return 'Analytics Report';
      case 'team.member_added': return 'Team Member Added';
      case 'team.member_removed': return 'Team Member Removed';
      case 'subscription.changed': return 'Subscription Changed';
    }
  };
  
  // Function to format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={handleOpenDialog}
        {...buttonProps}
      >
        <Webhook className="h-4 w-4 mr-2" />
        {!iconOnly && "Webhooks"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open: any) => {
          setIsOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Webhook className="h-5 w-5 text-blue-500 mr-2" />
              Webhooks
            </DialogTitle>
            <DialogDescription>
              Manage webhooks to receive notifications when events occur in your account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {!(isCreating || isEditing) && (
              <div className="flex justify-end">
                <Button
                  onClick={handleStartCreate}
                  className="space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Webhook</span>
                </Button>
              </div>
            )}
            
            {(isCreating || isEditing) && (
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="text-base font-medium">
                  {isCreating ? 'Create Webhook' : 'Edit Webhook'}
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., Content Notification"
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Endpoint URL</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://example.com/webhook"
                      value={url}
                      onChange={(e: any) => setUrl(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Secret</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Secret key for signature verification"
                      value={secret}
                      onChange={(e: any) => setSecret(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      This secret will be used to sign webhook payloads so you can verify they came from us.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Events</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {([
                        'content.created',
                        'content.updated',
                        'content.published',
                        'content.deleted',
                        'media.uploaded',
                        'analytics.report',
                        'team.member_added',
                        'team.member_removed',
                        'subscription.changed'
                      ] as WebhookEvent[]).map(event => (
                        <label key={event} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={events.includes(event)}
                            onChange={() => handleToggleEvent(event)}
                          />
                          <span>{getEventLabel(event)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Active</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={active}
                        onChange={(e: any) => setActive(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {formError && (
                    <div className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {formError}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={isCreating ? handleCreateWebhook : handleUpdateWebhook}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditing ? 'Update' : 'Create'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {testResult && selectedWebhookId && (
              <div className={`p-4 border rounded-md ${testResult.success ? 'border-[#00CC44] bg-[#00FF6A]/5' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {testResult.success ? (
                      <Check className="h-5 w-5 text-[#00CC44]" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className={`text-sm font-medium ${testResult.success ? 'text-[#00CC44]' : 'text-red-800'}`}>
                      Test {testResult.success ? 'Successful' : 'Failed'}
                    </h4>
                    <p className={`text-xs ${testResult.success ? 'text-[#00CC44]' : 'text-red-700'} mt-1`}>
                      Status: {testResult.status} | {testResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t space-y-3">
              <h3 className="text-sm font-medium">Your Webhooks</h3>
              
              {localWebhooks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Webhook className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No webhooks configured</p>
                  <p className="text-xs mt-1">Create your first webhook to receive event notifications.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localWebhooks.map((webhook) => (
                    <div key={webhook.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <h4 className="text-sm font-medium">{webhook.name}</h4>
                            {webhook.active ? (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-[#00FF6A]/10 text-[#00CC44]">
                                Active
                              </span>
                            ) : (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{webhook.url}</p>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {webhook.events.map((event) => (
                              <span key={event} className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {getEventLabel(event)}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex items-center mt-3 text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            Created: {formatDate(webhook.createdAt)}
                            {webhook.lastTriggered && (
                              <span className="ml-3">
                                Last triggered: {formatDate(webhook.lastTriggered)}
                              </span>
                            )}
                          </div>
                          
                          {webhook.lastResponse && (
                            <div className="mt-1 flex items-center text-xs">
                              <span className={webhook.lastResponse.success ? 'text-[#00CC44]' : 'text-red-500'}>
                                Last response: {webhook.lastResponse.status} ({webhook.lastResponse.success ? 'Success' : 'Failed'})
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="small"
                            onClick={() => handleTestWebhook(webhook.id)}
                            disabled={isTesting && selectedWebhookId === webhook.id}
                          >
                            {isTesting && selectedWebhookId === webhook.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <PlayCircle className="h-4 w-4" />
                            )}
                            <span className="ml-1">Test</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="small"
                            onClick={() => handleStartEdit(webhook)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="small"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            disabled={isDeleting && selectedWebhookId === webhook.id}
                          >
                            {isDeleting && selectedWebhookId === webhook.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-4">
                <p>Webhook endpoints must be publicly accessible HTTPS URLs. Learn more about <a href="/docs/webhooks" className="text-blue-600 hover:underline">implementing webhooks</a>.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WebhookConfigButton; 