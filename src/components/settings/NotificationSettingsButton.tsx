import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from '../ui/use-toast';

import { Bell, CheckCircle, Loader2, Save } from 'lucide-react';

export interface NotificationChannel {
  type: 'email' | 'in_app' | 'mobile_push' | 'desktop' | 'slack' | 'teams';
  label: string;
  enabled: boolean;
}

export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  channels: NotificationChannel[];
}

export interface NotificationSettingsButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Notification categories and their settings
   */
  notificationSettings?: NotificationCategory[];
  /**
   * Callback for saving notification settings
   */
  onSaveSettings?: (settings: NotificationCategory[]) => Promise<void>;
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
 * NotificationSettingsButton - A component for managing notification preferences.
 * This component allows users to configure what notifications they receive and how they receive them.
 */
const NotificationSettingsButton: React.FC<NotificationSettingsButtonProps> = ({
  notificationSettings = defaultNotificationSettings,
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
  const [localSettings, setLocalSettings] = useState<NotificationCategory[]>([...notificationSettings]);
 
  
  const handleOpenDialog = () => {
    setIsOpen(true);
    setLocalSettings([...notificationSettings]);
  };
  
  const handleToggleCategory = (categoryId: string) => {
    setLocalSettings(prev => prev.map(category => {
      if (category.id === categoryId) {
        const enabled = !category.enabled;
        return {
          ...category,
          enabled,
          // If disabling the category, disable all channels
          channels: enabled 
            ? category.channels 
            : category.channels.map(channel => ({ ...channel, enabled: false }))
        };
      }
      return category;
    }));
  };
  
  const handleToggleChannel = (categoryId: string, channelType: string) => {
    setLocalSettings(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          channels: category.channels.map(channel => {
            if (channel.type === channelType) {
              return { ...channel, enabled: !channel.enabled };
            }
            return channel;
          })
        };
      }
      return category;
    }));
  };
  
  const handleSaveSettings = async () => {
    if (!onSaveSettings) return;
    
    setIsSaving(true);
    
    try {
      await onSaveSettings(localSettings);
      
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated successfully",
      });
      
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      toast({
        title: "Save failed",
        description: "Failed to save notification settings. Please try again.",
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
        <Bell className="h-4 w-4 mr-2" />
        {!iconOnly && "Notification Settings"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open: any) => {
          setIsOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bell className="h-5 w-5 text-blue-500 mr-2" />
              Notification Settings
            </DialogTitle>
            <DialogDescription>
              Manage your notification preferences and channels
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="text-sm font-medium">Notification Type</div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-xs text-center">Email</div>
                <div className="text-xs text-center">In-App</div>
                <div className="text-xs text-center">Mobile</div>
                <div className="text-xs text-center">Desktop</div>
              </div>
            </div>
            
            {localSettings.map(category => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={category.enabled}
                        onChange={() => handleToggleCategory(category.id)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium">{category.name}</h4>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {category.channels.map(channel => (
                      <div key={channel.type} className="flex justify-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={category.enabled && channel.enabled}
                            onChange={() => handleToggleChannel(category.id, channel.type)}
                            disabled={!category.enabled}
                          />
                          <div className="relative w-6 h-6 rounded-md border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-blue-500 peer-checked:border-blue-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
                            {category.enabled && channel.enabled && (
                              <CheckCircle className="absolute inset-0 m-auto h-4 w-4 text-white" />
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Quiet Hours</h4>
              <p className="text-xs text-gray-500 mb-4">
                During quiet hours, we'll only send you critical notifications.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border rounded-md"
                    defaultValue="22:00"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border rounded-md"
                    defaultValue="08:00"
                  />
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <label key={day} className="cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={day === 'Sat' || day === 'Sun'} />
                      <div className="px-3 py-1 rounded-md border peer-checked:bg-blue-100 peer-checked:border-blue-500 peer-checked:text-blue-700">
                        {day}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
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

// Default notification settings
const defaultNotificationSettings: NotificationCategory[] = [
  {
    id: 'content_activity',
    name: 'Content Activity',
    description: 'Updates about your posts, scheduled content, and drafts',
    enabled: true,
    channels: [
      { type: 'email', label: 'Email', enabled: true },
      { type: 'in_app', label: 'In-App', enabled: true },
      { type: 'mobile_push', label: 'Mobile Push', enabled: true },
      { type: 'desktop', label: 'Desktop', enabled: false }
    ]
  },
  {
    id: 'engagement',
    name: 'Engagement',
    description: 'Comments, likes, shares, and other engagement on your content',
    enabled: true,
    channels: [
      { type: 'email', label: 'Email', enabled: false },
      { type: 'in_app', label: 'In-App', enabled: true },
      { type: 'mobile_push', label: 'Mobile Push', enabled: true },
      { type: 'desktop', label: 'Desktop', enabled: false }
    ]
  },
  {
    id: 'mentions',
    name: 'Mentions & Tags',
    description: 'When you or your brand is mentioned or tagged on social networks',
    enabled: true,
    channels: [
      { type: 'email', label: 'Email', enabled: true },
      { type: 'in_app', label: 'In-App', enabled: true },
      { type: 'mobile_push', label: 'Mobile Push', enabled: true },
      { type: 'desktop', label: 'Desktop', enabled: false }
    ]
  },
  {
    id: 'team',
    name: 'Team Activity',
    description: 'Team members\' actions, approvals, and assignments',
    enabled: true,
    channels: [
      { type: 'email', label: 'Email', enabled: true },
      { type: 'in_app', label: 'In-App', enabled: true },
      { type: 'mobile_push', label: 'Mobile Push', enabled: false },
      { type: 'desktop', label: 'Desktop', enabled: false }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    description: 'Performance reports and analytical insights',
    enabled: true,
    channels: [
      { type: 'email', label: 'Email', enabled: true },
      { type: 'in_app', label: 'In-App', enabled: false },
      { type: 'mobile_push', label: 'Mobile Push', enabled: false },
      { type: 'desktop', label: 'Desktop', enabled: false }
    ]
  },
  {
    id: 'system',
    name: 'System Notifications',
    description: 'Platform updates, maintenance, and important announcements',
    enabled: true,
    channels: [
      { type: 'email', label: 'Email', enabled: true },
      { type: 'in_app', label: 'In-App', enabled: true },
      { type: 'mobile_push', label: 'Mobile Push', enabled: false },
      { type: 'desktop', label: 'Desktop', enabled: false }
    ]
  }
];

export default NotificationSettingsButton; 