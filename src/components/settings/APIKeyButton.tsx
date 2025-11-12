import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

import { Key, Plus, Copy, Eye, EyeOff, Trash, Loader2, Calendar, RefreshCw, ExternalLink } from 'lucide-react';

export interface APIKey {
  id: string;
  name: string;
  createdAt: Date;
  lastUsed: Date | null;
  scope: 'read' | 'write' | 'admin';
  prefix: string; // First few characters of the key for display
  expiresAt: Date | null;
  active: boolean;
}

export interface APIKeyButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * API keys
   */
  apiKeys?: APIKey[];
  /**
   * Callback for creating a new API key
   */
  onCreateKey?: (name: string, scope: 'read' | 'write' | 'admin', expiresAt: Date | null) => Promise<{ key: string; apiKey: APIKey }>;
  /**
   * Callback for revoking an API key
   */
  onRevokeKey?: (id: string) => Promise<void>;
  /**
   * Callback for regenerating an API key
   */
  onRegenerateKey?: (id: string) => Promise<{ key: string; apiKey: APIKey }>;
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
 * APIKeyButton - A component for managing API keys.
 * This component allows users to create, view, and revoke API keys for programmatic access.
 */
const APIKeyButton: React.FC<APIKeyButtonProps> = ({
  apiKeys = [],
  onCreateKey,
  onRevokeKey,
  onRegenerateKey,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<'read' | 'write' | 'admin'>('read');
  const [newKeyExpiration, setNewKeyExpiration] = useState<'never' | '30days' | '90days' | '1year'>('never');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [localApiKeys, setLocalApiKeys] = useState<APIKey[]>([...apiKeys]);

  
  React.useEffect(() => {
    setLocalApiKeys([...apiKeys]);
  }, [apiKeys]);
  
  const handleOpenDialog = () => {
    setIsOpen(true);
    setNewKey(null);
  };
  
  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !onCreateKey || isCreating) return;
    
    setIsCreating(true);
    
    // Calculate expiration date based on selection
    let expiresAt: Date | null = null;
    const now = new Date();
    
    switch (newKeyExpiration) {
      case '30days':
        expiresAt = new Date(now.setDate(now.getDate() + 30));
        break;
      case '90days':
        expiresAt = new Date(now.setDate(now.getDate() + 90));
        break;
      case '1year':
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      default:
        expiresAt = null;
    }
    
    try {
      const { key, apiKey } = await onCreateKey(newKeyName, newKeyScope, expiresAt);
      
      setNewKey(key);
      setShowKey(true);
      
      // Add the new key to the local list
      setLocalApiKeys(prev => [apiKey, ...prev]);
      
      // Reset form
      setNewKeyName('');
      setNewKeyScope('read');
      setNewKeyExpiration('never');
      
      toast({
        title: "API key created",
        description: "Your new API key has been created successfully. Make sure to copy it now, as you won't be able to see it again."
      });
    } catch (err) {
      console.error('Error creating API key:', err);
      toast({
        title: "Failed to create API key",
        description: "An error occurred while creating your API key. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleRevokeKey = async (id: string) => {
    if (!onRevokeKey || isRevoking) return;
    
    setIsRevoking(true);
    setSelectedKeyId(id);
    
    try {
      await onRevokeKey(id);
      
      // Remove the key from the local list
      setLocalApiKeys(prev => prev.filter(key => key.id !== id));
      
      toast({
        title: "API key revoked",
        description: "The API key has been revoked and can no longer be used."
      });
    } catch (err) {
      console.error('Error revoking API key:', err);
      toast({
        title: "Failed to revoke API key",
        description: "An error occurred while revoking the API key. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRevoking(false);
      setSelectedKeyId(null);
    }
  };
  
  const handleRegenerateKey = async (id: string) => {
    if (!onRegenerateKey || isRegenerating) return;
    
    setIsRegenerating(true);
    setSelectedKeyId(id);
    
    try {
      const { key, apiKey } = await onRegenerateKey(id);
      
      // Replace the old key with the new one
      setLocalApiKeys(prev => prev.map(k => (k.id === id ? apiKey : k)));
      
      setNewKey(key);
      setShowKey(true);
      
      toast({
        title: "API key regenerated",
        description: "Your API key has been regenerated successfully. Make sure to copy the new key."
      });
    } catch (err) {
      console.error('Error regenerating API key:', err);
      toast({
        title: "Failed to regenerate API key",
        description: "An error occurred while regenerating the API key. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRegenerating(false);
      setSelectedKeyId(null);
    }
  };
  
  const handleCopyKey = () => {
    if (!newKey) return;
    
    navigator.clipboard.writeText(newKey)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "The API key has been copied to your clipboard."
        });
      })
      .catch((err) => {
        console.error('Error copying to clipboard:', err);
      });
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleDateString();
  };
  
  // Function to get label for scope
  const getScopeLabel = (scope: 'read' | 'write' | 'admin') => {
    switch (scope) {
      case 'read':
        return 'Read Only';
      case 'write':
        return 'Read & Write';
      case 'admin':
        return 'Admin';
    }
  };
  
  // Function to get color for scope
  const getScopeColor = (scope: 'read' | 'write' | 'admin') => {
    switch (scope) {
      case 'read':
        return 'bg-blue-100 text-blue-800';
      case 'write':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
    }
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
        <Key className="h-4 w-4 mr-2" />
        {!iconOnly && "API Keys"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setNewKey(null);
            setShowKey(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="h-5 w-5 text-blue-500 mr-2" />
              API Keys
            </DialogTitle>
            <DialogDescription>
              Create and manage API keys for programmatic access to your account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {newKey && (
              <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-yellow-800">New API Key Generated</h3>
                  <div className="flex gap-2">
                    <button 
                      className="p-1 hover:bg-yellow-100 rounded-md"
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? "Hide API key" : "Show API key"}
                    >
                      {showKey ? <EyeOff className="h-4 w-4 text-yellow-600" /> : <Eye className="h-4 w-4 text-yellow-600" />}
                    </button>
                    <button 
                      className="p-1 hover:bg-yellow-100 rounded-md"
                      onClick={handleCopyKey}
                      title="Copy API key"
                    >
                      <Copy className="h-4 w-4 text-yellow-600" />
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-100 p-2 rounded-md font-mono text-sm overflow-x-auto">
                  {showKey ? newKey : '•'.repeat(Math.min(60, newKey.length))}
                </div>
                <p className="mt-2 text-xs text-yellow-600">
                  Make sure to copy your API key now. You won't be able to see it again.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Create a New API Key</h3>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Key Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Production API, Test Environment"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Permissions</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={newKeyScope}
                      onChange={(e) => setNewKeyScope(e.target.value as 'read' | 'write' | 'admin')}
                    >
                      <option value="read">Read Only</option>
                      <option value="write">Read & Write</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expiration</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={newKeyExpiration}
                      onChange={(e) => setNewKeyExpiration(e.target.value as 'never' | '30days' | '90days' | '1year')}
                    >
                      <option value="never">Never</option>
                      <option value="30days">30 Days</option>
                      <option value="90days">90 Days</option>
                      <option value="1year">1 Year</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-2">
                  <Button 
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim() || isCreating}
                    className="space-x-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Generate API Key</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Your API Keys</h3>
                <a 
                  href="/docs/api" 
                  target="_blank" 
                  className="text-xs text-blue-600 flex items-center hover:underline"
                >
                  <span>API Documentation</span>
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
              
              {localApiKeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Key className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No API keys yet</p>
                  <p className="text-xs mt-1">Create your first API key to start making API requests.</p>
                </div>
              ) : (
                <div className="overflow-hidden border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {localApiKeys.map((apiKey) => (
                        <tr key={apiKey.id} className={!apiKey.active ? 'bg-gray-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="font-medium">{apiKey.name}</div>
                            <div className="text-xs text-gray-500">
                              {apiKey.prefix}•••••••••••
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${getScopeColor(apiKey.scope)}`}>
                              {getScopeLabel(apiKey.scope)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                              {formatDate(apiKey.createdAt)}
                            </div>
                            {apiKey.lastUsed && (
                              <div className="text-xs text-gray-400 mt-1">
                                Last used: {formatDate(apiKey.lastUsed)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end space-x-2">
                              <button
                                className="text-gray-400 hover:text-blue-500"
                                onClick={() => handleRegenerateKey(apiKey.id)}
                                disabled={isRegenerating && selectedKeyId === apiKey.id}
                                title="Regenerate key"
                              >
                                {isRegenerating && selectedKeyId === apiKey.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                className="text-gray-400 hover:text-red-500"
                                onClick={() => handleRevokeKey(apiKey.id)}
                                disabled={isRevoking && selectedKeyId === apiKey.id}
                                title="Revoke key"
                              >
                                {isRevoking && selectedKeyId === apiKey.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-2">
                <p>API keys give programmatic access to your account. Treat them like passwords and don't share them in public forums or client-side code.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default APIKeyButton; 