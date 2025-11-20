import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from '../ui/use-toast';

import {
  Settings,
  PlusCircle,
  Trash,
  Loader2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  InfoIcon
} from 'lucide-react';

export type IntegrationType = 
  'analytics' | 
  'crm' | 
  'content' | 
  'media' | 
  'communication' | 
  'automation';

export interface Integration {
  id: string;
  name: string;
  provider: string;
  type: IntegrationType;
  description: string;
  enabled: boolean;
  connected: boolean;
  lastSynced?: Date;
  icon: string; // URL to the provider icon
  configuration: Record<string, any>;
}

export interface IntegrationSettingsButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * List of available integrations
   */
  integrations?: Integration[];
  /**
   * Callback for toggling an integration's enabled status
   */
  onToggleIntegration?: (id: string, enabled: boolean) => Promise<void>;
  /**
   * Callback for updating integration configuration
   */
  onUpdateConfiguration?: (id: string, config: Record<string, any>) => Promise<void>;
  /**
   * Callback for removing an integration
   */
  onRemoveIntegration?: (id: string) => Promise<void>;
  /**
   * Callback for refreshing integration data
   */
  onRefreshIntegration?: (id: string) => Promise<void>;
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
 * IntegrationSettingsButton - A component for managing third-party integrations.
 * This component allows users to enable/disable, configure, and manage integrations with various services.
 */
const IntegrationSettingsButton: React.FC<IntegrationSettingsButtonProps> = ({
  integrations = [],
  onToggleIntegration,
  onUpdateConfiguration,
  onRemoveIntegration,
  onRefreshIntegration,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<IntegrationType | 'all'>('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [localIntegrations, setLocalIntegrations] = useState<Integration[]>([...integrations]);

  
  React.useEffect(() => {
    setLocalIntegrations([...integrations]);
  }, [integrations]);
  
  const handleOpenDialog = () => {
    setIsOpen(true);
  };
  
  const handleToggleIntegration = async (id: string, enabled: boolean) => {
    if (!onToggleIntegration) return;
    
    setIsLoading(id);
    
    try {
      await onToggleIntegration(id, enabled);
      
      // Update local state
      setLocalIntegrations(prev => 
        prev.map(integration => 
          integration.id === id ? { ...integration, enabled } : integration
        )
      );
      
      toast({
        title: enabled ? "Integration enabled" : "Integration disabled",
        description: `The integration has been ${enabled ? 'enabled' : 'disabled'} successfully.`
      });
    } catch (err) {
      console.error('Error toggling integration:', err);
      toast({
        title: "Action failed",
        description: `Failed to ${enabled ? 'enable' : 'disable'} the integration. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };
  
  const handleRemoveIntegration = async (id: string) => {
    if (!onRemoveIntegration) return;
    
    if (!confirm('Are you sure you want to remove this integration? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(id);
    
    try {
      await onRemoveIntegration(id);
      
      // Update local state
      setLocalIntegrations(prev => prev.filter(integration => integration.id !== id));
      
      if (selectedIntegration?.id === id) {
        setSelectedIntegration(null);
      }
      
      toast({
        title: "Integration removed",
        description: "The integration has been removed successfully."
      });
    } catch (err) {
      console.error('Error removing integration:', err);
      toast({
        title: "Action failed",
        description: "Failed to remove the integration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };
  
  const handleRefreshIntegration = async (id: string) => {
    if (!onRefreshIntegration) return;
    
    setIsLoading(id);
    
    try {
      await onRefreshIntegration(id);
      
      // Update last synced time in local state
      setLocalIntegrations(prev => 
        prev.map(integration => 
          integration.id === id 
            ? { ...integration, lastSynced: new Date() } 
            : integration
        )
      );
      
      toast({
        title: "Integration refreshed",
        description: "The integration data has been refreshed successfully."
      });
    } catch (err) {
      console.error('Error refreshing integration:', err);
      toast({
        title: "Action failed",
        description: "Failed to refresh the integration data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };
  
  const saveIntegrationConfig = async (id: string, config: Record<string, any>) => {
    if (!onUpdateConfiguration) return;
    
    setIsLoading(id);
    
    try {
      await onUpdateConfiguration(id, config);
      
      // Update configuration in local state
      setLocalIntegrations(prev => 
        prev.map(integration => 
          integration.id === id 
            ? { ...integration, configuration: config } 
            : integration
        )
      );
      
      toast({
        title: "Configuration saved",
        description: "The integration configuration has been updated successfully."
      });
      
      // Close the detail view
      setSelectedIntegration(null);
    } catch (err) {
      console.error('Error updating configuration:', err);
      toast({
        title: "Save failed",
        description: "Failed to save the integration configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };
  
  const filteredIntegrations = selectedIntegrationType === 'all' 
    ? localIntegrations
    : localIntegrations.filter(integration => integration.type === selectedIntegrationType);
  
  const getIntegrationTypeLabel = (type: IntegrationType) => {
    switch (type) {
      case 'analytics': return 'Analytics';
      case 'crm': return 'CRM';
      case 'content': return 'Content';
      case 'media': return 'Media';
      case 'communication': return 'Communication';
      case 'automation': return 'Automation';
    }
  };
  
  const formatDate = (date?: Date) => {
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
        <Settings className="h-4 w-4 mr-2" />
        {!iconOnly && "Integrations"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSelectedIntegration(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="h-5 w-5 text-blue-500 mr-2" />
              Integration Settings
            </DialogTitle>
            <DialogDescription>
              Manage your third-party service integrations and configure their settings.
            </DialogDescription>
          </DialogHeader>
          
          {!selectedIntegration ? (
            <div className="py-4 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedIntegrationType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIntegrationType('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedIntegrationType === 'analytics' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIntegrationType('analytics')}
                >
                  Analytics
                </Button>
                <Button
                  variant={selectedIntegrationType === 'crm' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIntegrationType('crm')}
                >
                  CRM
                </Button>
                <Button
                  variant={selectedIntegrationType === 'content' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIntegrationType('content')}
                >
                  Content
                </Button>
                <Button
                  variant={selectedIntegrationType === 'media' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIntegrationType('media')}
                >
                  Media
                </Button>
                <Button
                  variant={selectedIntegrationType === 'communication' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIntegrationType('communication')}
                >
                  Communication
                </Button>
                <Button
                  variant={selectedIntegrationType === 'automation' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIntegrationType('automation')}
                >
                  Automation
                </Button>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center"
                  onClick={() => {
                    window.open('/dashboard/settings/connections', '_blank');
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add New Integration
                </Button>
              </div>
              
              <div className="space-y-4">
                {filteredIntegrations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No integrations found</p>
                    <p className="text-xs mt-1">
                      {selectedIntegrationType === 'all' 
                        ? 'Connect integrations to enhance your workflow.' 
                        : `No ${getIntegrationTypeLabel(selectedIntegrationType as IntegrationType)} integrations available.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIntegrations.map(integration => (
                      <div 
                        key={integration.id}
                        className="border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={() => setSelectedIntegration(integration)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <img 
                              src={integration.icon} 
                              alt={integration.provider} 
                              className="w-8 h-8 mr-3 rounded-md"
                            />
                            <div>
                              <h3 className="text-sm font-medium">{integration.name}</h3>
                              <p className="text-xs text-gray-500">{integration.provider}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleIntegration(integration.id, !integration.enabled);
                              }}
                              className="text-gray-500 hover:text-blue-500 focus:outline-none"
                              disabled={!!isLoading}
                              title={integration.enabled ? "Disable" : "Enable"}
                            >
                              {isLoading === integration.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : integration.enabled ? (
                                <ToggleRight className="h-5 w-5" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            integration.connected
                              ? 'bg-[#00FF6A]/10 text-[#00CC44]'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {integration.connected ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Connected
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Disconnected
                              </>
                            )}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {integration.lastSynced && (
                              <>Last synced: {formatDate(integration.lastSynced)}</>
                            )}
                          </span>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                          {integration.description}
                        </div>
                        
                        <div className="mt-3 flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshIntegration(integration.id);
                            }}
                            disabled={!!isLoading || !integration.connected}
                          >
                            {isLoading === integration.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveIntegration(integration.id);
                            }}
                            disabled={!!isLoading}
                          >
                            {isLoading === integration.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash className="h-3 w-3 mr-1" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedIntegration(null)}
                  className="text-sm text-blue-600 hover:underline flex items-center"
                >
                  ← Back to all integrations
                </button>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleIntegration(selectedIntegration.id, !selectedIntegration.enabled)}
                    className="text-sm text-gray-600 hover:text-blue-600 flex items-center"
                    disabled={!!isLoading}
                  >
                    {isLoading === selectedIntegration.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : selectedIntegration.enabled ? (
                      <ToggleRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 mr-1" />
                    )}
                    {selectedIntegration.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleRemoveIntegration(selectedIntegration.id)}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center"
                    disabled={!!isLoading}
                  >
                    {isLoading === selectedIntegration.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Trash className="h-4 w-4 mr-1" />
                    )}
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex items-center">
                  <img 
                    src={selectedIntegration.icon} 
                    alt={selectedIntegration.provider} 
                    className="w-12 h-12 mr-4 rounded-md"
                  />
                  <div>
                    <h2 className="text-xl font-medium">{selectedIntegration.name}</h2>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">{selectedIntegration.provider}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-sm text-gray-600">{getIntegrationTypeLabel(selectedIntegration.type)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center">
                  <InfoIcon className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">Status: </span>
                  <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedIntegration.connected
                      ? 'bg-[#00FF6A]/10 text-[#00CC44]'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedIntegration.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {selectedIntegration.lastSynced && (
                  <div className="flex items-center">
                    <RefreshCw className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">Last synced: {formatDate(selectedIntegration.lastSynced)}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-gray-600">{selectedIntegration.description}</p>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-4">Configuration</h3>
                
                {/* Simple mock configuration form - would be dynamic based on integration type */}
                <div className="space-y-4">
                  {Object.entries(selectedIntegration.configuration).map(([key, value]) => {
                    // Skip internal/system properties
                    if (key.startsWith('_')) return null;
                    
                    return (
                      <div key={key} className="space-y-1">
                        <label className="text-sm font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        {typeof value === 'boolean' ? (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => {
                                const newConfig = {
                                  ...selectedIntegration.configuration,
                                  [key]: e.target.checked
                                };
                                
                                setSelectedIntegration({
                                  ...selectedIntegration,
                                  configuration: newConfig
                                });
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-600">
                              {value ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        ) : typeof value === 'number' ? (
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => {
                              const newConfig = {
                                ...selectedIntegration.configuration,
                                [key]: Number(e.target.value)
                              };
                              
                              setSelectedIntegration({
                                ...selectedIntegration,
                                configuration: newConfig
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        ) : Array.isArray(value) ? (
                          <select
                            value={value[0]}
                            onChange={(e) => {
                              const newConfig = {
                                ...selectedIntegration.configuration,
                                [key]: [e.target.value, ...value.slice(1)]
                              };
                              
                              setSelectedIntegration({
                                ...selectedIntegration,
                                configuration: newConfig
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            {value.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={value as string}
                            onChange={(e) => {
                              const newConfig = {
                                ...selectedIntegration.configuration,
                                [key]: e.target.value
                              };
                              
                              setSelectedIntegration({
                                ...selectedIntegration,
                                configuration: newConfig
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                  
                  {Object.keys(selectedIntegration.configuration).filter(key => !key.startsWith('_')).length === 0 && (
                    <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-md text-gray-600 text-sm">
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                      <span>No configurable options available for this integration.</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => saveIntegrationConfig(selectedIntegration.id, selectedIntegration.configuration)}
                  disabled={!!isLoading}
                >
                  {isLoading === selectedIntegration.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save Changes</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IntegrationSettingsButton; 