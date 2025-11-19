'use client';

import { useEffect, useState } from 'react';
import { getFirebaseClientAuth } from '@/lib/core/firebase/client';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Stack, IconButton, List, ListItem, ListItemText, MenuItem, Select, Divider, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import { tokens } from '@/styles/tokens';

interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: string;
  status?: 'active' | 'pending';
}

interface TeamInvite {
  email: string;
  invitedBy: string;
  role: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  organizationId: string;
  members: TeamMember[];
  invites: TeamInvite[];
}

export default function TeamManagementPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [transferOwnershipDialog, setTransferOwnershipDialog] = useState<{
    open: boolean;
    targetMember: TeamMember | null;
  }>({ open: false, targetMember: null });
  const [transferring, setTransferring] = useState(false);

  // Monitor Firebase Auth state
  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchTeam(currentUser);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchTeam = async (currentUser: FirebaseUser) => {
    setLoading(true);
    setError('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await currentUser.getIdToken();

      const res = await fetch('/api/settings/team', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to load team');
      setTeam(data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to invite team members');
      return;
    }

    setInviting(true);
    setError('');
    setSuccess('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      const res = await fetch('/api/settings/team', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to invite member');
      setSuccess(data.message || 'Member invited!');
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      if (user) fetchTeam(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (!user) {
      setError('Please log in to remove team members');
      return;
    }

    setRemoving(email);
    setError('');
    setSuccess('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      const res = await fetch('/api/settings/team', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to remove member');
      setSuccess(data.message || 'Member removed!');
      if (user) fetchTeam(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    if (!user) {
      setError('Please log in to update roles');
      return;
    }

    setUpdatingRole(email);
    setError('');
    setSuccess('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      const res = await fetch('/api/settings/team/role', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update role');
      setSuccess(data.message || 'Role updated!');
      if (user) fetchTeam(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleResendInvite = async (email: string) => {
    if (!user) {
      setError('Please log in to resend invites');
      return;
    }

    setError('');
    setSuccess('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      const res = await fetch('/api/settings/team/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, resend: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to resend invite');
      setSuccess(data.message || 'Invite resent!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invite');
    }
  };

  const handleTransferOwnership = async () => {
    if (!user) {
      setError('Please log in to transfer ownership');
      return;
    }
    if (!transferOwnershipDialog.targetMember?.userId || !team?.id) return;

    setTransferring(true);
    setError('');
    setSuccess('');

    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      const res = await fetch('/api/settings/team/transfer-ownership', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: team.id,
          newOwnerId: transferOwnershipDialog.targetMember.userId,
          confirmed: true
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to transfer ownership');

      setSuccess(`Ownership transferred to ${transferOwnershipDialog.targetMember.name || transferOwnershipDialog.targetMember.email}!`);
      setTransferOwnershipDialog({ open: false, targetMember: null });
      if (user) fetchTeam(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setTransferring(false);
    }
  };

  // Find current user's role
  const currentUserMember = team?.members.find(m => m.email === user?.email);
  const isOwner = currentUserMember?.role === 'owner';
  const isOrgAdmin = currentUserMember?.role === 'org_admin' || isOwner;

  return (
    <Box className="container mx-auto py-6 max-w-xl">
      <Typography
        variant="h4"
        mb={2}
        sx={{
          fontWeight: 600,
          fontSize: tokens.typography.fontSize.h1,
          color: tokens.colors.text.primary,
        }}
      >
        Team Management
      </Typography>
      <Typography
        mb={4}
        sx={{
          color: tokens.colors.text.secondary,
          fontSize: tokens.typography.fontSize.body,
        }}
      >
        Manage your team members, invites, and their access levels.
        {team && (
          <span className="block mt-1 text-sm">
            Team: <strong>{team.name}</strong> (ID: {team.id})
          </span>
        )}
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          {/* Only show invite form if user can manage members */}
          {isOrgAdmin && (
            <>
              <Box mb={4}>
                <Typography variant="h6" mb={2}>Invite New Member</Typography>
                <form onSubmit={handleInvite}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <TextField
                      label="Invite Email"
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      required
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Name (optional)"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <Select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as string)}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="member">Member</MenuItem>
                      <MenuItem value="org_admin">Admin</MenuItem>
                      {isOwner && <MenuItem value="owner">Owner</MenuItem>}
                    </Select>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={inviting || !inviteEmail}
                      sx={{
                        minWidth: 120,
                        bgcolor: tokens.colors.primary.main,
                        '&:hover': { bgcolor: tokens.colors.primary.dark },
                        borderRadius: tokens.borderRadius.md,
                        boxShadow: tokens.shadows.md,
                      }}
                    >
                      {inviting ? 'Inviting...' : 'Invite'}
                    </Button>
                  </Stack>
                </form>
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Pending Invites */}
          {team?.invites && team.invites.length > 0 && (
            <>
              <Typography variant="h6" mb={2}>Pending Invites ({team.invites.length})</Typography>
              <List>
                {team.invites.map(invite => (
                  <ListItem key={invite.email} secondaryAction={
                    isOrgAdmin && (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => handleResendInvite(invite.email)}>
                          Resend
                        </Button>
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleRemove(invite.email)} 
                          disabled={removing === invite.email}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    )
                  }>
                    <ListItemText
                      primary={invite.email}
                      secondary={`Role: ${invite.role} • Invited by: ${invite.invitedBy} • ${new Date(invite.createdAt).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Team Members */}
          <Typography variant="h6" mb={2}>
            Team Members ({team?.members.length || 0})
          </Typography>
          <List>
            {team?.members.map(member => (
              <ListItem key={member.userId} secondaryAction={
                <Stack direction="row" spacing={1} alignItems="center">
                  {member.role === 'owner' ? (
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      Owner
                    </Typography>
                  ) : isOrgAdmin && member.email !== user?.email ? (
                    <>
                      <Select
                        value={member.role}
                        onChange={e => handleRoleChange(member.email, e.target.value as string)}
                        size="small"
                        disabled={updatingRole === member.email}
                        sx={{ minWidth: 100 }}
                      >
                        <MenuItem value="member">Member</MenuItem>
                        <MenuItem value="org_admin">Admin</MenuItem>
                        {isOwner && <MenuItem value="owner">Owner</MenuItem>}
                      </Select>
                      {isOwner && (
                        <IconButton 
                          edge="end" 
                          aria-label="transfer ownership" 
                          onClick={() => setTransferOwnershipDialog({ open: true, targetMember: member })}
                          title="Transfer Ownership"
                        >
                          <TransferWithinAStationIcon />
                        </IconButton>
                      )}
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => handleRemove(member.email)} 
                        disabled={removing === member.email}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                      {member.role}
                    </Typography>
                  )}
                </Stack>
              }>
                <ListItemText
                  primary={member.name || member.email}
                  secondary={
                    <span>
                      {member.email}
                      {member.email === user?.email && ' (You)'}
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>

          {/* Transfer Ownership Confirmation Dialog */}
          <Dialog
            open={transferOwnershipDialog.open}
            onClose={() => setTransferOwnershipDialog({ open: false, targetMember: null })}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to transfer ownership to{' '}
                <strong>
                  {transferOwnershipDialog.targetMember?.name || transferOwnershipDialog.targetMember?.email}
                </strong>
                ?
              </DialogContentText>
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>This action is not reversible.</strong> You will become an Organization Admin and{' '}
                {transferOwnershipDialog.targetMember?.name || transferOwnershipDialog.targetMember?.email}{' '}
                will become the new Owner with full control over the team.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setTransferOwnershipDialog({ open: false, targetMember: null })}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferOwnership}
                variant="contained"
                disabled={transferring}
                sx={{
                  bgcolor: tokens.colors.accent.orange,
                  '&:hover': { bgcolor: tokens.colors.accent.red },
                  borderRadius: tokens.borderRadius.md,
                  boxShadow: tokens.shadows.md,
                }}
              >
                {transferring ? 'Transferring...' : 'Transfer Ownership'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
} 