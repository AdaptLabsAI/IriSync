import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from '../ui/use-toast';

import { useAuth } from '../../hooks/useAuth';
import { Settings, User, Mail, Edit2, Save, Loader2 } from 'lucide-react';

export interface AccountSettings {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  profileImage?: string;
  preferredLanguage: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  emailDigest: boolean;
  receiveUpdates: boolean;
}

export interface AccountSettingsButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * User account settings
   */
  accountSettings?: AccountSettings;
  /**
   * Callback for saving account settings
   */
  onSaveSettings?: (settings: AccountSettings) => Promise<void>;
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
 * AccountSettingsButton - A component for managing user account settings.
 * This component allows users to update their personal information and account preferences.
 */
const AccountSettingsButton: React.FC<AccountSettingsButtonProps> = ({
  accountSettings,
  onSaveSettings,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [localSettings, setLocalSettings] = useState<AccountSettings | null>(null);
  const { user } = useAuth();
  
  
  // Initialize local settings when dialog opens or settings change
  React.useEffect(() => {
    if (accountSettings) {
      setLocalSettings(accountSettings);
    } else if (user) {
      // Default settings based on user
      setLocalSettings({
        id: user.id,
        fullName: user.displayName || '',
        email: user.email || '',
        username: user.username || '',
        profileImage: user.photoURL || '',
        preferredLanguage: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        emailDigest: true,
        receiveUpdates: true
      });
    }
  }, [accountSettings, user]);
  
  const handleOpenDialog = () => {
    setIsOpen(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!localSettings) return;
    
    const { name, value, type } = e.target as HTMLInputElement;
    
    setLocalSettings({
      ...localSettings,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };
  
  const handleSaveSettings = async () => {
    if (!localSettings || !onSaveSettings) return;
    
    setIsSaving(true);
    
    try {
      await onSaveSettings(localSettings);
      
      toast({
        title: "Settings saved",
        description: "Your account settings have been updated successfully",
      });
      
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({
        title: "Save failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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
        <Settings className="h-4 w-4 mr-2" />
        {!iconOnly && "Account Settings"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open: any) => {
          setIsOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="h-5 w-5 text-blue-500 mr-2" />
              Account Settings
            </DialogTitle>
            <DialogDescription>
              Manage your personal information and account preferences
            </DialogDescription>
          </DialogHeader>
          
          {localSettings && (
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="pt-2">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4 py-4">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {localSettings.profileImage ? (
                          <img 
                            src={localSettings.profileImage} 
                            alt="Profile" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <button 
                        className="absolute bottom-0 right-0 h-7 w-7 bg-blue-500 rounded-full flex items-center justify-center text-white"
                        title="Change profile picture"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">
                      Profile Picture
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        className="w-full px-3 py-2 border rounded-md"
                        value={localSettings.fullName}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <div className="flex">
                        <input
                          type="email"
                          name="email"
                          className="flex-1 px-3 py-2 border rounded-l-md"
                          value={localSettings.email}
                          onChange={handleInputChange}
                        />
                        <button 
                          className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-gray-600"
                          title="Verify email"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username</label>
                      <input
                        type="text"
                        name="username"
                        className="w-full px-3 py-2 border rounded-md"
                        value={localSettings.username || ''}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-gray-500">
                        This will be used for your profile URL
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <select
                      name="preferredLanguage"
                      className="w-full px-3 py-2 border rounded-md"
                      value={localSettings.preferredLanguage}
                      onChange={handleInputChange}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="pt">Portuguese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Timezone</label>
                    <select
                      name="timezone"
                      className="w-full px-3 py-2 border rounded-md"
                      value={localSettings.timezone}
                      onChange={handleInputChange}
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                      <option value="Europe/Paris">Central European Time (CET)</option>
                      <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Format</label>
                    <select
                      name="dateFormat"
                      className="w-full px-3 py-2 border rounded-md"
                      value={localSettings.dateFormat}
                      onChange={handleInputChange}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Format</label>
                    <select
                      name="timeFormat"
                      className="w-full px-3 py-2 border rounded-md"
                      value={localSettings.timeFormat}
                      onChange={handleInputChange}
                    >
                      <option value="12h">12-hour (AM/PM)</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Email Digest</h4>
                      <p className="text-xs text-gray-500">
                        Receive a weekly digest of your account activity
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="emailDigest"
                        className="sr-only peer" 
                        checked={localSettings.emailDigest}
                        onChange={handleInputChange}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Product Updates</h4>
                      <p className="text-xs text-gray-500">
                        Receive emails about new features and updates
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="receiveUpdates"
                        className="sr-only peer" 
                        checked={localSettings.receiveUpdates}
                        onChange={handleInputChange}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || !localSettings}
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

export default AccountSettingsButton; 