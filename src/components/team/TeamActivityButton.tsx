import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Activity, Users, Calendar, Clock, Filter, ExternalLink } from 'lucide-react';
import Dialog from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select } from '../ui/select/Select';
import { Avatar } from '../ui/Avatar';
import { DateRangePicker } from '../ui/datepicker/DateRangePicker';

export interface TeamActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  teamId: string;
  action: string;
  actionType: 'content' | 'platform' | 'team' | 'subscription' | 'system';
  resourceId?: string;
  resourceType?: string;
  resourceName?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface TeamActivityButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Team ID to view activity for
   */
  teamId: string;
  /**
   * Team name
   */
  teamName?: string;
  /**
   * Activity items for this team
   */
  activityItems?: TeamActivityItem[];
  /**
   * Callback to load more activity items
   */
  onLoadMore?: () => Promise<void>;
  /**
   * Callback to filter activity by date range
   */
  onFilterByDate?: (startDate: Date, endDate: Date) => Promise<void>;
  /**
   * Callback to filter activity by user
   */
  onFilterByUser?: (userId: string) => Promise<void>;
  /**
   * Callback to filter activity by type
   */
  onFilterByType?: (type: string) => Promise<void>;
  /**
   * Whether the activity feed has more items
   */
  hasMoreItems?: boolean;
  /**
   * Team members to filter by
   */
  teamMembers?: { id: string; name: string; avatar?: string }[];
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
}

/**
 * A button that shows team activity and logs.
 * This component provides a timeline of team actions and events.
 * This feature requires the 'team:view_activity' permission.
 */
const TeamActivityButton: React.FC<TeamActivityButtonProps> = ({
  teamId,
  teamName = 'Team',
  activityItems = [],
  onLoadMore,
  onFilterByDate,
  onFilterByUser,
  onFilterByType,
  hasMoreItems = false,
  teamMembers = [],
  iconOnly = false,
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  
  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  const handleLoadMore = async () => {
    if (!onLoadMore || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Error loading more activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserFilter = async (userId: string) => {
    if (!onFilterByUser || isLoading) return;
    setSelectedUser(userId);
    
    setIsLoading(true);
    
    try {
      await onFilterByUser(userId);
    } catch (error) {
      console.error('Error filtering by user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeFilter = async (type: string) => {
    if (!onFilterByType || isLoading) return;
    setSelectedType(type);
    
    setIsLoading(true);
    
    try {
      await onFilterByType(type);
    } catch (error) {
      console.error('Error filtering by type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilter = async (range: { from: Date; to: Date } | null) => {
    if (!onFilterByDate || isLoading || !range) return;
    setDateRange(range);
    
    setIsLoading(true);
    
    try {
      await onFilterByDate(range.from, range.to);
    } catch (error) {
      console.error('Error filtering by date:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to render activity item content based on type
  const renderActivityContent = (item: TeamActivityItem) => {
    const actionColor = {
      content: 'text-blue-600',
      platform: 'text-[#00CC44]',
      team: 'text-purple-600',
      subscription: 'text-amber-600',
      system: 'text-gray-600'
    }[item.actionType] || 'text-gray-600';

    return (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className={`p-2 rounded-full ${actionColor.replace('text-', 'bg-')}/10`}>
            <Activity className={`h-4 w-4 ${actionColor}`} />
          </div>
        </div>
        
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <Avatar 
              src={item.userAvatar} 
              alt={item.userName} 
              fallback={item.userName.charAt(0)} 
              size="xs"
            />
            <span className="font-medium text-sm">{item.userName}</span>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-xs text-gray-500">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
          
          <div className="mt-1 text-sm">
            <span className="font-medium">{item.action}</span>
            {item.resourceName && (
              <span className="ml-1">
                <span className="text-gray-500">in</span> {item.resourceName}
              </span>
            )}
          </div>
          
          {item.details && Object.keys(item.details).length > 0 && (
            <div className="mt-1.5 text-xs text-gray-500 pl-1">
              {Object.entries(item.details).map(([key, value]) => (
                <div key={key} className="flex items-start gap-1">
                  <span className="font-medium">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
          
          {item.resourceId && (
            <Button
              variant="link"
              size="sm"
              className="h-6 px-0 mt-1 text-xs"
              onClick={() => window.open(`/dashboard/${item.actionType}/${item.resourceType}/${item.resourceId}`)}
              rightIcon={<ExternalLink className="h-3 w-3" />}
            >
              View details
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<Activity className="h-4 w-4" />}
        requiredPermission="team:view_activity"
        {...buttonProps}
      >
        {iconOnly ? null : children || 'Activity'}
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        title={`${teamName} Activity`}
        className="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <Select
                value={selectedUser}
                onChange={(e) => handleUserFilter(e.target.value)}
                className="w-44"
              >
                <option value="all">All Team Members</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={selectedType}
                onChange={(e) => handleTypeFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">All Activities</option>
                <option value="content">Content</option>
                <option value="platform">Platforms</option>
                <option value="team">Team</option>
                <option value="subscription">Subscription</option>
                <option value="system">System</option>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="h-4 w-4 text-gray-500" />
              <DateRangePicker
                value={dateRange}
                onChange={handleDateFilter}
                placeholder="Filter by date"
                className="w-64"
              />
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Activity</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="pt-2">
              {activityItems.length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                    {activityItems.map(item => (
                      <div key={item.id} className="pl-10 py-2 relative hover:bg-gray-50 rounded-md">
                        <div className="absolute left-[10px] top-[14px] w-2 h-2 rounded-full bg-primary" />
                        {renderActivityContent(item)}
                      </div>
                    ))}
                  </div>
                  
                  {hasMoreItems && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        loading={isLoading}
                        leftIcon={<Clock className="h-4 w-4" />}
                      >
                        Load Earlier Activity
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No activity recorded yet</p>
                  <p className="text-sm">Team actions will appear here as they happen</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="content" className="pt-2">
              {activityItems.filter(item => item.actionType === 'content').length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                    {activityItems
                      .filter(item => item.actionType === 'content')
                      .map(item => (
                        <div key={item.id} className="pl-10 py-2 relative hover:bg-gray-50 rounded-md">
                          <div className="absolute left-[10px] top-[14px] w-2 h-2 rounded-full bg-blue-500" />
                          {renderActivityContent(item)}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No content activity recorded
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="platforms" className="pt-2">
              {activityItems.filter(item => item.actionType === 'platform').length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                    {activityItems
                      .filter(item => item.actionType === 'platform')
                      .map(item => (
                        <div key={item.id} className="pl-10 py-2 relative hover:bg-gray-50 rounded-md">
                          <div className="absolute left-[10px] top-[14px] w-2 h-2 rounded-full bg-[#00CC44]" />
                          {renderActivityContent(item)}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No platform activity recorded
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="team" className="pt-2">
              {activityItems.filter(item => item.actionType === 'team').length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
                    {activityItems
                      .filter(item => item.actionType === 'team')
                      .map(item => (
                        <div key={item.id} className="pl-10 py-2 relative hover:bg-gray-50 rounded-md">
                          <div className="absolute left-[10px] top-[14px] w-2 h-2 rounded-full bg-purple-500" />
                          {renderActivityContent(item)}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No team activity recorded
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Dialog>
    </>
  );
};

export default TeamActivityButton; 