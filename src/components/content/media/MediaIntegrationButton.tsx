import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { 
  Link, Upload, Download, Loader2, Check, X, ExternalLink, Image, Video, FileText, Music,
  Lock, AlertCircle, RefreshCw, Link2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { Badge } from '../../ui/Badge';
import { Separator } from '../../ui/separator';

// Simple tabs implementation for this component
const SimpleTabs: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, onValueChange, children }) => {
  return <div>{children}</div>;
};

const TabsList: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  return <div className={`flex ${className}`}>{children}</div>;
};

const TabsTrigger: React.FC<{
  value: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ value, className, children, onClick }) => {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium border-b-2 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const TabsContent: React.FC<{
  value: string;
  className?: string;
  children: React.ReactNode;
}> = ({ value, className, children }) => {
  return <div className={className}>{children}</div>;
};

export type MediaIntegrationType = 
  | 'google_drive' 
  | 'dropbox' 
  | 'onedrive' 
  | 'canva' 
  | 'adobe' 
  | 'unsplash' 
  | 'giphy'
  | 'pexels'
  | 'pixabay';

export interface MediaIntegration {
  /**
   * Unique identifier for the integration
   */
  id: MediaIntegrationType;
  /**
   * Display name of the integration
   */
  name: string;
  /**
   * Description of what the integration allows
   */
  description: string;
  /**
   * Icon component for the integration
   */
  icon: React.ReactNode;
  /**
   * Whether the integration is connected
   */
  isConnected: boolean;
  /**
   * Optional connection status details
   */
  connectionStatus?: 'active' | 'expired' | 'revoked' | 'error';
  /**
   * Optional error message if connection has issues
   */
  errorMessage?: string;
  /**
   * Optional account information
   */
  accountInfo?: string;
  /**
   * Subscription tier required for this integration
   */
  requiredTier?: 'creator' | 'influencer' | 'enterprise';
}

export interface MediaIntegrationButtonProps {
  /**
   * Available media integrations
   */
  integrations: MediaIntegration[];
  /**
   * Currently connected integrations
   */
  connectedIntegrations: MediaIntegrationType[];
  /**
   * Current user's subscription tier
   */
  userTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Function to connect to an integration
   */
  onConnect: (integrationType: MediaIntegrationType) => Promise<boolean>;
  /**
   * Function to disconnect from an integration
   */
  onDisconnect: (integrationType: MediaIntegrationType) => Promise<boolean>;
  /**
   * Function to browse files from connected integration
   */
  onBrowseFiles: (integrationType: MediaIntegrationType) => void;
  /**
   * Optional class name for styling
   */
  className?: string;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost';
}

/**
 * MediaIntegrationButton - Button for integrating with external media services
 */
export const MediaIntegrationButton: React.FC<MediaIntegrationButtonProps> = ({
  integrations,
  connectedIntegrations,
  userTier,
  onConnect,
  onDisconnect,
  onBrowseFiles,
  className = '',
  size = 'sm',
  disabled = false,
  isLoading = false,
  variant = 'outline',
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'connected' | 'available'>('connected');
  const [loadingIntegrations, setLoadingIntegrations] = useState<MediaIntegrationType[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filter integrations by connection status
  const connected = integrations.filter(i => connectedIntegrations.includes(i.id));
  const available = integrations.filter(i => !connectedIntegrations.includes(i.id));
  
  // Check if user has access to an integration based on their subscription tier
  const hasAccessToIntegration = (integration: MediaIntegration): boolean => {
    if (!integration.requiredTier) return true;
    
    const tierLevels = { creator: 1, influencer: 2, enterprise: 3 };
    const requiredLevel = tierLevels[integration.requiredTier];
    const userLevel = tierLevels[userTier];
    
    return userLevel >= requiredLevel;
  };
  
  // Handle connect to integration
  const handleConnect = async (integrationType: MediaIntegrationType) => {
    setError(null);
    setLoadingIntegrations(prev => [...prev, integrationType]);
    
    try {
      await onConnect(integrationType);
    } catch (error) {
      setError('Failed to connect to integration. Please try again.');
      console.error('Error connecting to integration:', error);
    } finally {
      setLoadingIntegrations(prev => prev.filter(id => id !== integrationType));
    }
  };
  
  // Handle disconnect from integration
  const handleDisconnect = async (integrationType: MediaIntegrationType) => {
    setError(null);
    setLoadingIntegrations(prev => [...prev, integrationType]);
    
    try {
      await onDisconnect(integrationType);
    } catch (error) {
      setError('Failed to disconnect from integration. Please try again.');
      console.error('Error disconnecting from integration:', error);
    } finally {
      setLoadingIntegrations(prev => prev.filter(id => id !== integrationType));
    }
  };
  
  // Render an integration card
  const renderIntegrationCard = (integration: MediaIntegration) => {
    const isConnected = connectedIntegrations.includes(integration.id);
    const isLoading = loadingIntegrations.includes(integration.id);
    const hasAccess = hasAccessToIntegration(integration);
    
    return (
      <div 
        key={integration.id}
        className={`
          p-4 rounded-md border ${isConnected ? 'border-primary/40 bg-primary/5' : 'border-gray-200'} 
          ${!hasAccess ? 'opacity-70' : ''}
          transition-colors
        `}
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded bg-gray-100">
            {integration.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{integration.name}</h3>
              
              {integration.requiredTier && !hasAccess && (
                <Badge variant="outlined" className="text-xs bg-amber-50 text-amber-700 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {integration.requiredTier}+
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1">{integration.description}</p>
            
            {isConnected && integration.accountInfo && (
              <p className="text-xs text-gray-600 mt-2 font-medium">
                {integration.accountInfo}
              </p>
            )}
            
            {isConnected && integration.connectionStatus === 'error' && (
              <div className="mt-2 text-xs text-red-600">
                <p className="flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {integration.errorMessage || 'Connection error'}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex justify-end">
          {isConnected ? (
            <div className="space-x-2 flex items-center">
              <Button
                variant="text"
                size="small"
                onClick={() => handleDisconnect(integration.id)}
                disabled={isLoading || !hasAccess}
                className="h-8 text-xs"
              >
                {isLoading && loadingIntegrations.includes(integration.id) ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : null}
                Disconnect
              </Button>
              
              <Button
                variant="contained"
                size="small"
                onClick={() => onBrowseFiles(integration.id)}
                disabled={isLoading || !hasAccess || integration.connectionStatus === 'error'}
                className="h-8 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Browse Files
              </Button>
            </div>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleConnect(integration.id)}
              disabled={isLoading || !hasAccess}
              className="h-8 text-xs"
            >
              {isLoading && loadingIntegrations.includes(integration.id) ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5 mr-1" />
              )}
              Connect
            </Button>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Dialog isOpen={open} onClose={() => setOpen(false)}>
      <Button
        variant={variant === 'default' ? 'contained' : variant === 'ghost' ? 'text' : 'outlined'}
        size={size === 'md' ? 'medium' : size === 'lg' ? 'large' : 'small'}
        className={`flex items-center gap-2 ${className}`}
        disabled={disabled || isLoading}
        onClick={() => setOpen(true)}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        Media Integrations
        {connectedIntegrations.length > 0 && (
          <Badge variant="filled" className="ml-1">
            {connectedIntegrations.length}
          </Badge>
        )}
      </Button>
      
      <div className="py-2">
        <SimpleTabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'connected' | 'available')}>
          <TabsList className="w-full">
            <TabsTrigger 
              value="connected" 
              className={`flex-1 ${activeTab === 'connected' ? 'border-primary text-primary' : 'border-transparent'}`}
              onClick={() => setActiveTab('connected')}
            >
              Connected
              {connected.length > 0 && (
                <Badge variant="filled" className="ml-2">
                  {connected.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="available" 
              className={`flex-1 ${activeTab === 'available' ? 'border-primary text-primary' : 'border-transparent'}`}
              onClick={() => setActiveTab('available')}
            >
              Available
              {available.length > 0 && (
                <Badge variant="filled" className="ml-2">
                  {available.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-md">
              <p className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </p>
            </div>
          )}
          
          <TabsContent 
            value="connected" 
            className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-1"
          >
            {activeTab === 'connected' && (
              <>
                {connected.length > 0 ? (
                  connected.map(renderIntegrationCard)
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Link2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No connected integrations</p>
                    <p className="text-sm mt-1">
                      Connect external services to import media
                    </p>
                    <Button 
                      variant="text" 
                      size="small" 
                      onClick={() => setActiveTab('available')}
                      className="mt-3"
                    >
                      View available integrations
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent 
            value="available" 
            className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-1"
          >
            {activeTab === 'available' && (
              <>
                {available.length > 0 ? (
                  available.map(renderIntegrationCard)
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Link2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No available integrations</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </SimpleTabs>
        
        <Separator className="my-4" />
        
        <div className="text-sm text-gray-600">
          <h4 className="font-medium mb-1">About Media Integrations</h4>
          <p className="text-xs text-gray-500">
            Connect to external services to import media directly into your library. 
            Some integrations may require higher subscription tiers.
          </p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </Dialog>
  );
};

export default MediaIntegrationButton; 