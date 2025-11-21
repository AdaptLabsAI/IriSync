import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from '../ui/use-toast';

import { Shield, Lock, Smartphone, Key, History, Loader2, Save } from 'lucide-react';

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'app' | 'sms' | 'email' | null;
  sessionTimeout: number; // in minutes
  passwordLastChanged: Date;
  loginAttempts: number;
  loginHistory: Array<{
    id: string;
    timestamp: Date;
    ipAddress: string;
    location: string;
    device: string;
    browser: string;
    successful: boolean;
  }>;
}

export interface SecuritySettingsButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Security settings
   */
  securitySettings?: SecuritySettings;
  /**
   * Callback for saving security settings
   */
  onSaveSettings?: (settings: SecuritySettings) => Promise<void>;
  /**
   * Callback for changing password
   */
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<void>;
  /**
   * Callback for enabling/disabling two-factor authentication
   */
  onToggleTwoFactor?: (enabled: boolean, method: 'app' | 'sms' | 'email') => Promise<void>;
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
 * SecuritySettingsButton - A component for managing security settings.
 * This component allows users to configure password settings, two-factor authentication,
 * and view login history.
 */
const SecuritySettingsButton: React.FC<SecuritySettingsButtonProps> = ({
  securitySettings = defaultSecuritySettings,
  onSaveSettings,
  onChangePassword,
  onToggleTwoFactor,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('password');
  const [localSettings, setLocalSettings] = useState<SecuritySettings>({...securitySettings});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  
  const handleOpenDialog = () => {
    setIsOpen(true);
    setLocalSettings({...securitySettings});
    resetPasswordFields();
  };
  
  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };
  
  const handleSessionTimeoutChange = (value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      sessionTimeout: parseInt(value, 10)
    }));
  };
  
  const handleTwoFactorToggle = async (enabled: boolean) => {
    if (!enabled) {
      // Disabling 2FA
      setLocalSettings(prev => ({
        ...prev,
        twoFactorEnabled: false,
        twoFactorMethod: null
      }));
      
      if (onToggleTwoFactor) {
        try {
          await onToggleTwoFactor(false, 'app');
          toast({
            title: "Two-factor authentication disabled",
            description: "Your account is now using standard authentication"
          });
        } catch (err) {
          console.error('Error disabling 2FA:', err);
          toast({
            title: "Failed to disable 2FA",
            description: "Please try again or contact support",
            variant: "destructive"
          });
        }
      }
    } else {
      // When enabling, we'll need to select a method first
      setLocalSettings(prev => ({
        ...prev,
        twoFactorMethod: 'app' // Default to app
      }));
    }
  };
  
  const handleTwoFactorMethodChange = (method: 'app' | 'sms' | 'email') => {
    setLocalSettings(prev => ({
      ...prev,
      twoFactorMethod: method
    }));
  };
  
  const handleEnableTwoFactor = async () => {
    if (!localSettings.twoFactorMethod) return;
    
    if (onToggleTwoFactor) {
      try {
        await onToggleTwoFactor(true, localSettings.twoFactorMethod);
        
        setLocalSettings(prev => ({
          ...prev,
          twoFactorEnabled: true
        }));
        
        toast({
          title: "Two-factor authentication enabled",
          description: `Your account is now protected with ${getTwoFactorMethodLabel(localSettings.twoFactorMethod)} authentication`
        });
      } catch (err) {
        console.error('Error enabling 2FA:', err);
        toast({
          title: "Failed to enable 2FA",
          description: "Please try again or contact support",
          variant: "destructive"
        });
      }
    }
  };
  
  const handleChangePassword = async () => {
    // Validate password
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (!onChangePassword) return;
    
    setIsSaving(true);
    
    try {
      await onChangePassword(currentPassword, newPassword);
      
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully"
      });
      
      resetPasswordFields();
      
      // Update last changed date
      setLocalSettings(prev => ({
        ...prev,
        passwordLastChanged: new Date()
      }));
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Failed to change password. Please check your current password and try again.');
      toast({
        title: "Password change failed",
        description: "Please check your current password and try again",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveSettings = async () => {
    if (!onSaveSettings) return;
    
    setIsSaving(true);
    
    try {
      await onSaveSettings(localSettings);
      
      toast({
        title: "Settings saved",
        description: "Your security settings have been updated"
      });
    } catch (err) {
      console.error('Error saving security settings:', err);
      toast({
        title: "Save failed",
        description: "Failed to save security settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper for rendering 2FA method label
  const getTwoFactorMethodLabel = (method: 'app' | 'sms' | 'email' | null) => {
    switch (method) {
      case 'app': return 'Authenticator App';
      case 'sms': return 'SMS';
      case 'email': return 'Email';
      default: return '';
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
        <Shield className="h-4 w-4 mr-2" />
        {!iconOnly && "Security Settings"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open: any) => {
          setIsOpen(open);
          if (!open) {
            resetPasswordFields();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 text-blue-500 mr-2" />
              Security Settings
            </DialogTitle>
            <DialogDescription>
              Manage your account security and authentication options
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="pt-2">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="two-factor">Two-Factor</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="password" className="space-y-4 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Change Password</h3>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-md"
                      value={currentPassword}
                      onChange={(e: any) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-md"
                      value={newPassword}
                      onChange={(e: any) => setNewPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-md"
                      value={confirmPassword}
                      onChange={(e: any) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  {passwordError && (
                    <div className="text-sm text-red-500">
                      {passwordError}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-gray-500">
                    Last changed: {localSettings.passwordLastChanged.toLocaleDateString()}
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={isSaving}
                    size="small"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : 'Change Password'}
                  </Button>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t space-y-2">
                <h3 className="text-sm font-medium">Password Requirements</h3>
                <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Include at least one uppercase letter</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character</li>
                  <li>Cannot be the same as a previously used password</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="two-factor" className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={localSettings.twoFactorEnabled}
                    onChange={(e: any) => handleTwoFactorToggle(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {localSettings.twoFactorEnabled ? (
                <div className="border rounded-md p-4 bg-blue-50 mt-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Smartphone className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">Two-Factor Authentication is enabled</h4>
                      <p className="text-xs text-blue-700 mt-1">
                        Your account is protected with {getTwoFactorMethodLabel(localSettings.twoFactorMethod)} authentication.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Authentication Method</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div 
                        className={`border rounded-md p-3 cursor-pointer ${localSettings.twoFactorMethod === 'app' ? 'border-blue-500 bg-blue-50' : ''}`}
                        onClick={() => handleTwoFactorMethodChange('app')}
                      >
                        <Smartphone className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                        <p className="text-xs text-center font-medium">Authenticator App</p>
                      </div>
                      <div 
                        className={`border rounded-md p-3 cursor-pointer ${localSettings.twoFactorMethod === 'sms' ? 'border-blue-500 bg-blue-50' : ''}`}
                        onClick={() => handleTwoFactorMethodChange('sms')}
                      >
                        <Smartphone className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                        <p className="text-xs text-center font-medium">SMS</p>
                      </div>
                      <div 
                        className={`border rounded-md p-3 cursor-pointer ${localSettings.twoFactorMethod === 'email' ? 'border-blue-500 bg-blue-50' : ''}`}
                        onClick={() => handleTwoFactorMethodChange('email')}
                      >
                        <Smartphone className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                        <p className="text-xs text-center font-medium">Email</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleEnableTwoFactor}
                    disabled={!localSettings.twoFactorMethod}
                    className="w-full"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t space-y-2">
                <h3 className="text-sm font-medium">Recovery Options</h3>
                <p className="text-xs text-gray-600">
                  If you lose access to your two-factor authentication device, you'll need recovery codes to access your account.
                </p>
                <Button
                  variant="outline"
                  size="small"
                  className="mt-2"
                  disabled={!localSettings.twoFactorEnabled}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate Recovery Codes
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="sessions" className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Session Timeout</h3>
                  <p className="text-xs text-gray-500">
                    Set how long you can be inactive before being automatically logged out
                  </p>
                  <select
                    className="w-full px-3 py-2 border rounded-md mt-1"
                    value={localSettings.sessionTimeout}
                    onChange={(e: any) => handleSessionTimeoutChange(e.target.value)}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                    <option value={1440}>24 hours</option>
                  </select>
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-sm font-medium mb-3">Login History</h3>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {localSettings.loginHistory.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-xs">
                              {item.timestamp.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs">
                              {item.location} ({item.ipAddress})
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs">
                              {item.device} / {item.browser}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.successful ? 'bg-[#00FF6A]/10 text-[#00CC44]' : 'bg-red-100 text-red-800'}`}>
                                {item.successful ? 'Success' : 'Failed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-2">
                  <div className="text-xs text-gray-500">
                    Recent login attempts: {localSettings.loginAttempts}
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                  >
                    <History className="h-4 w-4 mr-2" />
                    View Full History
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Default security settings for the component
const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
  twoFactorMethod: null,
  sessionTimeout: 60, // 1 hour
  passwordLastChanged: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  loginAttempts: 0,
  loginHistory: [
    {
      id: '1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      ipAddress: '192.168.1.1',
      location: 'Los Angeles, CA, USA',
      device: 'Windows PC',
      browser: 'Chrome',
      successful: true
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      ipAddress: '192.168.1.1',
      location: 'Los Angeles, CA, USA',
      device: 'iPhone',
      browser: 'Safari',
      successful: true
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      ipAddress: '192.168.1.1',
      location: 'Los Angeles, CA, USA',
      device: 'Windows PC',
      browser: 'Chrome',
      successful: true
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      ipAddress: '203.0.113.1',
      location: 'Unknown location',
      device: 'Unknown device',
      browser: 'Unknown browser',
      successful: false
    }
  ]
};

export default SecuritySettingsButton; 