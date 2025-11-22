import React, { useState } from 'react';
import { Button, ButtonVariant, ButtonSize } from '../../ui/button';
import { UserPlus, Users, Loader2, Check, X, Search, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Avatar } from '../../ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../ui/command';
import { Separator } from '../../ui/separator';
import { Badge, BadgeVariant } from '../../ui/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

export interface TeamMember {
  /**
   * Unique identifier for the team member
   */
  id: string;
  /**
   * Display name of the team member
   */
  name: string;
  /**
   * Email address of the team member
   */
  email: string;
  /**
   * Role of the team member
   */
  role?: string;
  /**
   * Avatar URL for the team member
   */
  avatarUrl?: string;
  /**
   * Online status of the team member
   */
  status?: 'online' | 'away' | 'offline';
  /**
   * Number of tasks currently assigned to the team member
   */
  currentTaskCount?: number;
}

export interface AssignMessageButtonProps {
  /**
   * IDs of messages to assign
   */
  messageIds: string[];
  /**
   * Available team members to assign to
   */
  teamMembers: TeamMember[];
  /**
   * Current assignee IDs for the selected messages, if any
   */
  currentAssignees?: string[];
  /**
   * Function to call when assigning messages
   */
  onAssign: (messageIds: string[], assigneeId: string) => Promise<{ success: boolean; message?: string }>;
  /**
   * Function to call when unassigning messages
   */
  onUnassign: (messageIds: string[]) => Promise<{ success: boolean; message?: string }>;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Whether to show just an icon
   */
  iconOnly?: boolean;
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  /**
   * Optional callback when assignment completes
   */
  onComplete?: (success: boolean, assigneeId?: string) => void;
}

/**
 * AssignMessageButton - Component for assigning messages to team members
 */
export const AssignMessageButton: React.FC<AssignMessageButtonProps> = ({
  messageIds,
  teamMembers,
  currentAssignees = [],
  onAssign,
  onUnassign,
  className = '',
  size = 'sm',
  disabled = false,
  isLoading = false,
  iconOnly = false,
  variant = 'outline',
  onComplete,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    assigneeId?: string;
    assigneeName?: string;
  } | null>(null);
  
  // Filter team members by search
  const filteredTeamMembers = teamMembers.filter(member => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) || 
      member.email.toLowerCase().includes(searchLower) ||
      (member.role && member.role.toLowerCase().includes(searchLower))
    );
  });
  
  // Get the current assignee name if only one person is assigned
  const getCurrentAssigneeName = (): string | null => {
    if (currentAssignees.length !== 1) return null;
    
    const assignee = teamMembers.find(member => member.id === currentAssignees[0]);
    return assignee ? assignee.name : null;
  };
  
  // Check if all selected messages are assigned to the same person
  const hasSingleAssignee = currentAssignees.length === 1;
  
  // Assign to team member
  const handleAssign = async (memberId: string) => {
    if (disabled || messageIds.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      const result = await onAssign(messageIds, memberId);
      const assignee = teamMembers.find(member => member.id === memberId);
      
      setResult({
        success: result.success,
        message: result.message || 
          (result.success 
            ? `${messageIds.length} message${messageIds.length > 1 ? 's' : ''} assigned to ${assignee?.name || 'team member'}`
            : 'Failed to assign messages'),
        assigneeId: memberId,
        assigneeName: assignee?.name,
      });
      
      if (result.success) {
        // Auto-close after a brief delay
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 1500);
      }
      
      if (onComplete) {
        onComplete(result.success, memberId);
      }
    } catch (error) {
      console.error('Error assigning messages:', error);
      
      setResult({
        success: false,
        message: 'An error occurred while assigning messages',
      });
      
      if (onComplete) {
        onComplete(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Unassign messages
  const handleUnassign = async () => {
    if (disabled || messageIds.length === 0 || isProcessing || currentAssignees.length === 0) return;
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      const result = await onUnassign(messageIds);
      
      setResult({
        success: result.success,
        message: result.message || 
          (result.success 
            ? `${messageIds.length} message${messageIds.length > 1 ? 's' : ''} unassigned`
            : 'Failed to unassign messages'),
      });
      
      if (result.success) {
        // Auto-close after a brief delay
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 1500);
      }
      
      if (onComplete) {
        onComplete(result.success);
      }
    } catch (error) {
      console.error('Error unassigning messages:', error);
      
      setResult({
        success: false,
        message: 'An error occurred while unassigning messages',
      });
      
      if (onComplete) {
        onComplete(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get status icon
  const getStatusIcon = (status?: 'online' | 'away' | 'offline') => {
    if (!status || status === 'offline') return null;
    
    return (
      <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
        status === 'online' ? 'bg-[#00CC44]' : 'bg-amber-500'
      }`} />
    );
  };
  
  // Get button label
  const getButtonLabel = () => {
    if (currentAssignees.length === 0) {
      return messageIds.length > 1 ? 'Assign messages' : 'Assign';
    }
    
    if (hasSingleAssignee) {
      const name = getCurrentAssigneeName();
      return name ? `Assigned to ${name}` : 'Assigned';
    }
    
    return 'Multiple assignees';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasSingleAssignee ? 'secondary' as ButtonVariant : variant}
          size={size}
          className={`${iconOnly ? 'p-0 h-8 w-8' : ''} ${className}`}
          disabled={disabled || isLoading || messageIds.length === 0}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {hasSingleAssignee ? (
                <Users className={`h-4 w-4 ${!iconOnly ? 'mr-2' : ''}`} />
              ) : (
                <UserPlus className={`h-4 w-4 ${!iconOnly ? 'mr-2' : ''}`} />
              )}
              {!iconOnly && getButtonLabel()}
            </>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-60 p-0" align="end">
        {isProcessing || result ? (
          <div className={`p-4 text-center ${result?.success ? 'text-[#00CC44]' : result ? 'text-red-600' : ''}`}>
            {isProcessing ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Processing...</p>
              </>
            ) : result ? (
              <>
                {result.success ? (
                  <Check className="h-6 w-6 mx-auto mb-2" />
                ) : (
                  <X className="h-6 w-6 mx-auto mb-2" />
                )}
                <p className="text-sm font-medium">{result.message}</p>
                {result.success && result.assigneeName && (
                  <Badge className="mt-2" variant="filled">
                    {result.assigneeName}
                  </Badge>
                )}
              </>
            ) : null}
          </div>
        ) : (
          <>
            <Command>
              <CommandInput 
                placeholder="Search team member..." 
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-60">
                <CommandEmpty>
                  <div className="py-6 text-center text-sm text-gray-500">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>No team members found.</p>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {filteredTeamMembers.map(member => (
                    <CommandItem
                      key={member.id}
                      value={member.id}
                      onSelect={() => handleAssign(member.id)}
                      className="flex items-center py-2"
                    >
                      <div className="relative mr-2">
                        <Avatar className="h-8 w-8">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-xs font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </Avatar>
                        {getStatusIcon(member.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {member.role || member.email}
                        </p>
                      </div>
                      
                      {currentAssignees.includes(member.id) && (
                        <Check className="h-4 w-4 text-[#00CC44] ml-2" />
                      )}
                      
                      {member.currentTaskCount !== undefined && member.currentTaskCount > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="ml-2 flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{member.currentTaskCount}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{member.currentTaskCount} active tasks</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            
            {currentAssignees.length > 0 && (
              <>
                <Separator />
                <div className="p-2">
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleUnassign}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Unassign
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AssignMessageButton; 