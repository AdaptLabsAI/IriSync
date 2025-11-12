import React, { useState } from 'react';
import { Switch } from '../ui/switch/Switch';
import { LockKeyhole, Info, AlertCircle } from 'lucide-react';
import { Tooltip } from '../ui/tooltip/Tooltip';

export interface PermissionToggleProps {
  /**
   * The permission ID to toggle
   */
  permissionId: string;
  /**
   * The display name of the permission
   */
  permissionName: string;
  /**
   * The description of the permission
   */
  permissionDescription?: string;
  /**
   * Whether the permission is currently enabled
   */
  isEnabled: boolean;
  /**
   * Callback when the permission is toggled
   */
  onToggle: (permissionId: string, enabled: boolean) => Promise<void>;
  /**
   * Whether the permission toggle is disabled
   */
  disabled?: boolean;
  /**
   * Whether the permission is enterprise-only
   */
  isEnterprise?: boolean;
  /**
   * Current subscription tier
   */
  currentTier?: 'creator' | 'influencer' | 'enterprise';
  /**
   * The entity (user or role) that this permission applies to
   */
  entityName?: string;
  /**
   * Whether to show the permission description
   */
  showDescription?: boolean;
  /**
   * Whether to allow upgrading from this component
   */
  allowUpgrade?: boolean;
  /**
   * Callback when the upgrade button is clicked
   */
  onUpgradeClick?: () => void;
}

/**
 * A toggle switch for enabling/disabling permissions.
 * This component is used in role management and user permissions screens.
 * Managing permissions requires the 'team:manage_permissions' permission.
 */
const PermissionToggle: React.FC<PermissionToggleProps> = ({
  permissionId,
  permissionName,
  permissionDescription,
  isEnabled,
  onToggle,
  disabled = false,
  isEnterprise = false,
  currentTier,
  entityName,
  showDescription = false,
  allowUpgrade = false,
  onUpgradeClick
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine if the toggle should be disabled due to enterprise restrictions
  const isEnterpriseRestricted = isEnterprise && currentTier !== 'enterprise';
  const isDisabled = disabled || isLoading || isEnterpriseRestricted;
  
  const handleToggle = async (checked: boolean) => {
    if (isDisabled) return;
    
    setIsLoading(true);
    
    try {
      await onToggle(permissionId, checked);
    } catch (error) {
      console.error(`Error toggling permission ${permissionId}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate tooltip text based on state
  const getTooltipText = () => {
    if (isEnterpriseRestricted) {
      return `This permission requires an Enterprise subscription`;
    }
    if (disabled) {
      return `You don't have permission to modify this setting`;
    }
    if (isLoading) {
      return `Updating permission...`;
    }
    return permissionDescription || `Toggle ${permissionName} permission`;
  };

  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-grow">
        <div className="flex items-center">
          <LockKeyhole className="h-4 w-4 text-gray-500 mr-2" />
          <div className="font-medium text-sm">
            {permissionName}
            {isEnterprise && (
              <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                Enterprise
              </span>
            )}
          </div>
          {permissionDescription && !showDescription && (
            <Tooltip content={permissionDescription}>
              <button 
                type="button"
                className="ml-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
        
        {showDescription && permissionDescription && (
          <p className="text-xs text-gray-500 mt-1 ml-6">{permissionDescription}</p>
        )}
        
        {entityName && (
          <p className="text-xs text-gray-500 mt-1 ml-6">
            {isEnabled ? `Enabled` : `Disabled`} for {entityName}
          </p>
        )}
        
        {isEnterpriseRestricted && allowUpgrade && (
          <div className="ml-6 mt-1.5 flex items-center">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 mr-1.5" />
            <span className="text-xs text-amber-600 mr-2">Enterprise feature</span>
            {onUpgradeClick && (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                Upgrade
              </button>
            )}
          </div>
        )}
      </div>
      
      <Tooltip content={getTooltipText()}>
        <Switch
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isDisabled}
          aria-label={`Toggle ${permissionName} permission`}
          className={isLoading ? 'opacity-70' : ''}
        />
      </Tooltip>
    </div>
  );
};

export default PermissionToggle; 