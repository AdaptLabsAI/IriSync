import { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '../ui/table';
import Avatar from '@mui/material/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/button';
import { LinearProgress } from '@mui/material';
import { 
  AlertCircle,
  Info,
  UserPlus
} from 'lucide-react';

// Simple role type for the component to avoid import issues
interface SimpleRole {
  id: string;
  name: string;
  description: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string;
}

interface TeamManagementProps {
  teamId?: string;
}

// Simplified InviteMemberForm interface to avoid dependency issues
interface InviteMemberFormProps {
  roles: SimpleRole[];
  onInvite: (data: any) => Promise<any>;
}

// Mock component to be replaced with real import
const InviteMemberForm = ({ roles, onInvite }: InviteMemberFormProps) => {
  return (
    <Button size="sm" onClick={() => alert('This is a placeholder. Implement real form')}>
      <UserPlus className="mr-2 h-4 w-4" />
      Invite Member
    </Button>
  );
};

export default function TeamManagement({ teamId }: TeamManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  
  // Roles for the invite form - simplified to match our SimpleRole interface
  const roles: SimpleRole[] = [
    { id: 'admin', name: 'Admin', description: 'Full access to all features' },
    { id: 'editor', name: 'Editor', description: 'Can edit content' },
    { id: 'viewer', name: 'Viewer', description: 'View-only access' }
  ];
  
  // Fetch team members and subscription info
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch team members
        const membersResponse = await fetch('/api/settings/team');
        if (!membersResponse.ok) {
          throw new Error('Failed to load team members');
        }
        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
        
        // Fetch subscription details
        const subscriptionResponse = await fetch('/api/settings/organization/subscription');
        if (!subscriptionResponse.ok) {
          throw new Error('Failed to load subscription details');
        }
        const subscriptionData = await subscriptionResponse.json();
        setSubscription(subscriptionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching team data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [teamId]);
  
  const handleInvite = async (data: any) => {
    try {
      const response = await fetch('/api/settings/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          role: data.roleId,
          message: data.message
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to invite team member');
      }
      
      // Refetch team members to show the pending invitation
      const membersResponse = await fetch('/api/settings/team');
      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);
      
    } catch (error) {
      console.error('Error inviting team member:', error);
      throw error;
    }
  };
  
  const getSeatUsagePercentage = () => {
    if (!subscription) return 0;
    
    // For enterprise tier, calculate percentage based on a reasonable max (like 20)
    // This is just for visual display since enterprise has unlimited seats
    if (subscription.tier === 'enterprise') {
      const virtualMax = Math.max(20, subscription.usedSeats * 1.5);
      return (subscription.usedSeats / virtualMax) * 100;
    }
    
    return (subscription.usedSeats / subscription.seatLimit) * 100;
  };
  
  const canAddMoreMembers = () => {
    if (!subscription) return false;
    if (subscription.tier === 'enterprise') return true; // Enterprise can always add more
    return subscription.usedSeats < subscription.seatLimit;
  };
  
  const getSeatPricing = (tier: string) => {
    switch (tier) {
      case 'creator':
        return '$80 per seat';
      case 'influencer':
        return '$200 per seat';
      case 'enterprise':
        return '$250 per seat';
      default:
        return 'Custom pricing';
    }
  };
  
  const getTokenAllocationInfo = () => {
    if (!subscription) return '';
    
    switch (subscription.tier) {
      case 'creator':
        return '100 tokens per seat';
      case 'influencer':
        return '500 tokens per seat';
      case 'enterprise':
        return subscription.usedSeats < 5 
          ? '1,000 tokens per seat (first 5 seats)' 
          : '500 tokens per additional seat';
      default:
        return '';
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Manage your team members and their roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center p-4 mb-4 text-red-800 border border-red-300 rounded-lg bg-red-50">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>Error loading team data: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Manage your team members and their roles</CardDescription>
        </div>
        {canAddMoreMembers() ? (
          <InviteMemberForm roles={roles} onInvite={handleInvite} />
        ) : (
          <Button disabled variant="outline" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Seat Limit Reached
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {subscription && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Seat Usage</h3>
                <p className="text-sm text-muted-foreground">
                  {subscription.tier === 'enterprise' 
                    ? `${subscription.usedSeats} seats used`
                    : `${subscription.usedSeats} / ${subscription.seatLimit} seats used`
                  }
                </p>
              </div>
              <Badge variant="outline" color={subscription.usedSeats >= subscription.seatLimit ? "error" : "primary"}>
                {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
              </Badge>
            </div>
            
            <div className="space-y-2">
              <LinearProgress variant="determinate" value={getSeatUsagePercentage()} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  <span>{getSeatPricing(subscription.tier)}</span>
                </div>
                <div className="flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  <span>{getTokenAllocationInfo()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell className="text-right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell>
                  <div className="text-center py-6 text-muted-foreground" style={{ gridColumn: 'span 4' }}>
                    No team members found. Invite someone to get started.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="flex items-center gap-2">
                    <Avatar 
                      src={member.avatarUrl} 
                      sx={{ width: 32, height: 32 }}
                    >
                      {member.name?.charAt(0) || member.email?.charAt(0)}
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="filled"
                      color={member.status === 'active' ? 'success' : 'secondary'}
                      className="capitalize"
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Manage</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 