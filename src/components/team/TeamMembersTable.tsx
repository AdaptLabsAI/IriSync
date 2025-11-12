'use client';

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog';
import { MoreHorizontal, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Role } from '../../lib/team/role';

interface TeamMember {
  userId: string;
  roleId: string;
  assignedAt: string | Date;
  assignedBy: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
  role: {
    id: string;
    name?: string;
  };
}

interface TeamMembersTableProps {
  members: TeamMember[];
  roles: Role[];
  onUpdateRole: (userId: string, roleId: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  currentUser: { id: string; name?: string; email?: string } | null;
  subscriptionTier: string;
}

export default function TeamMembersTable({
  members,
  roles,
  onUpdateRole,
  onRemoveMember,
  currentUser,
  subscriptionTier
}: TeamMembersTableProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRemoveMember = async () => {
    if (!removingUserId) return;
    
    setIsLoading(true);
    try {
      await onRemoveMember(removingUserId);
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setIsLoading(false);
      setRemovingUserId(null);
    }
  };

  const handleUpdateRole = async (userId: string, roleId: string) => {
    setIsLoading(true);
    try {
      await onUpdateRole(userId, roleId);
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Filter available roles based on subscription tier
  const availableRoles = roles.filter(role => {
    if (subscriptionTier === 'creator') {
      return role.id === 'role_owner';
    }
    if (subscriptionTier === 'influencer') {
      return ['role_owner', 'role_admin', 'role_content_manager', 'role_content_creator'].includes(role.id);
    }
    return true;
  });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No team members found.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => {
              const isCurrentUser = currentUser?.id === member.userId;
              const isOwner = member.role.id === 'role_owner';
              
              return (
                <TableRow key={member.userId}>
                  <TableCell className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={member.user.avatarUrl || ''} />
                      <AvatarFallback>
                        {member.user.name ? getInitials(member.user.name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.user.name || 'Unnamed User'}
                        {isCurrentUser && <Badge variant="outline" className="ml-2">You</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner || isCurrentUser ? (
                      <Badge variant={isOwner ? "default" : "outline"}>
                        {member.role.name || 'Unknown Role'}
                      </Badge>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            {member.role.name || 'Unknown Role'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {availableRoles.map((role) => (
                            <DropdownMenuItem
                              key={role.id}
                              disabled={isLoading || role.id === member.roleId}
                              onClick={() => handleUpdateRole(member.userId, role.id)}
                            >
                              {role.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.assignedAt && 
                      formatDistanceToNow(new Date(member.assignedAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isOwner && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setRemovingUserId(member.userId)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <AlertDialog open={!!removingUserId} onOpenChange={(open) => !open && setRemovingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from your team? They will lose access to your organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 