'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Snackbar,
  Alert,
  CircularProgress,
  Toolbar,
  Tooltip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TableContainer,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Divider,
  LinearProgress,
  Tab,
  Tabs,
  Card,
  CardContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmailIcon from '@mui/icons-material/Email';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import WorkIcon from '@mui/icons-material/Work';
import GroupsIcon from '@mui/icons-material/Groups';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AdminGuard from '@/components/admin/AdminGuard';
import { format } from 'date-fns';

interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  subscriptionTier?: string;
  teamId?: string;
  teamName?: string;
  organization?: {
    billing?: {
      subscriptionTier?: string;
    };
  };
}

interface FilterOptions {
  status: string;
  role: string;
  subscriptionTier: string;
}

type SortDirection = 'asc' | 'desc';
type SortField = 'createdAt' | 'email' | 'status' | 'role' | 'lastLoginAt' | 'subscriptionTier';

export default function AdminBulkOpsPage() {
  return (
    <AdminGuard>
      <BulkOperationsComponent />
    </AdminGuard>
  );
}

function BulkOperationsComponent() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    role: '',
    subscriptionTier: '',
  });
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailContent, setBulkEmailContent] = useState('');
  const [showRoleAssignDialog, setShowRoleAssignDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [showTeamAssignDialog, setShowTeamAssignDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ 
    open: boolean; 
    message: string; 
    severity: 'success' | 'error' | 'info' | 'warning' 
  }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, [page, rowsPerPage, sortBy, sortDirection, filters]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(query) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
    
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: rowsPerPage.toString(),
        sortBy,
        sortDirection,
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.role) params.append('role', filters.role);
      if (filters.subscriptionTier) params.append('subscriptionTier', filters.subscriptionTier);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      
      const data = await res.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
      setTotalUsers(data.total || data.users?.length || 0);
      
      setSelected([]);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      if (!res.ok) throw new Error('Failed to fetch teams');
      
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (e: any) {
      console.error('Failed to fetch teams:', e);
      // Don't show error message for teams, just log it
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(filteredUsers.map(u => u.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id) 
        : [...prev, id]
    );
  };

  // Handlers for pagination, sorting and filtering
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle direction if clicking the same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new sort field
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
    setShowFilterMenu(true);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setShowFilterMenu(false);
  };

  const handleFilterChange = (filterName: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setPage(0); // Reset to first page when changing filters
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      role: '',
      subscriptionTier: '',
    });
    setFilterAnchorEl(null);
    setShowFilterMenu(false);
  };

  const handleActionsClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchorEl(event.currentTarget);
  };

  const handleActionsClose = () => {
    setActionMenuAnchorEl(null);
  };

  // Bulk Operation Actions
  const handleBulkDeactivate = async () => {
    setShowDeactivateConfirm(false);
    setActionLoading(true);
    try {
      const results = await Promise.all(
        selected.map(id => 
          fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'inactive' })
          })
        )
      );
      
      // Check if any operations failed
      const failedCount = results.filter(res => !res.ok).length;
      
      if (failedCount > 0) {
        setSnackbar({ 
          open: true, 
          message: `${selected.length - failedCount} users deactivated, ${failedCount} failed`, 
          severity: 'warning' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: `${selected.length} users deactivated successfully`, 
          severity: 'success' 
        });
      }
      
      fetchUsers();
      setSelected([]);
    } catch (e: any) {
      setSnackbar({ 
        open: true, 
        message: e.message || 'Failed to deactivate users', 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setShowDeleteConfirm(false);
    setActionLoading(true);
    try {
      const results = await Promise.all(
        selected.map(id => 
          fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
        )
      );
      
      // Check if any operations failed
      const failedCount = results.filter(res => !res.ok).length;
      
      if (failedCount > 0) {
        setSnackbar({ 
          open: true, 
          message: `${selected.length - failedCount} users deleted, ${failedCount} failed`, 
          severity: 'warning' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: `${selected.length} users deleted successfully`, 
          severity: 'success' 
        });
      }
      
      fetchUsers();
      setSelected([]);
    } catch (e: any) {
      setSnackbar({ 
        open: true, 
        message: e.message || 'Failed to delete users', 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkExport = () => {
    const selectedUsers = users.filter(u => selected.includes(u.id));
    
    // Create CSV data
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Created At', 'Last Login', 'Subscription Tier'];
    const csv = [
      headers.join(','),
      ...selectedUsers.map(u => [
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        u.status,
        u.createdAt,
        u.lastLoginAt || '',
        u.subscriptionTier || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    setSnackbar({ 
      open: true, 
      message: `Exported ${selectedUsers.length} users to CSV`, 
      severity: 'success' 
    });
  };

  const handleBulkEmail = async () => {
    if (!bulkEmailSubject || !bulkEmailContent) {
      setSnackbar({
        open: true,
        message: 'Please provide both subject and content for the email',
        severity: 'warning'
      });
      return;
    }

    setShowBulkEmailDialog(false);
    setActionLoading(true);
    
    try {
      const res = await fetch('/api/admin/communications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selected,
          subject: bulkEmailSubject,
          content: bulkEmailContent
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send emails');
      }
      
      const data = await res.json();
      
      setSnackbar({
        open: true,
        message: `Email queued for ${selected.length} users`,
        severity: 'success'
      });
      
      // Reset email form
      setBulkEmailSubject('');
      setBulkEmailContent('');
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: e.message || 'Failed to send emails',
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkRoleAssign = async () => {
    if (!selectedRole) {
      setSnackbar({
        open: true,
        message: 'Please select a role to assign',
        severity: 'warning'
      });
      return;
    }

    setShowRoleAssignDialog(false);
    setActionLoading(true);
    
    try {
      const results = await Promise.all(
        selected.map(id => 
          fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: selectedRole })
          })
        )
      );
      
      // Check if any operations failed
      const failedCount = results.filter(res => !res.ok).length;
      
      if (failedCount > 0) {
        setSnackbar({ 
          open: true, 
          message: `${selected.length - failedCount} users updated, ${failedCount} failed`, 
          severity: 'warning' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: `${selected.length} users assigned to ${selectedRole} role successfully`, 
          severity: 'success' 
        });
      }
      
      fetchUsers();
      setSelectedRole('');
    } catch (e: any) {
      setSnackbar({ 
        open: true, 
        message: e.message || 'Failed to update user roles', 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkTeamAssign = async () => {
    setShowTeamAssignDialog(false);
    setActionLoading(true);
    
    try {
      const results = await Promise.all(
        selected.map(id => 
          fetch(`/api/admin/users/${id}/team`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: selectedTeam || null })
          })
        )
      );
      
      // Check if any operations failed
      const failedCount = results.filter(res => !res.ok).length;
      
      if (failedCount > 0) {
        setSnackbar({ 
          open: true, 
          message: `${selected.length - failedCount} users updated, ${failedCount} failed`, 
          severity: 'warning' 
        });
      } else {
        const teamName = selectedTeam 
          ? teams.find(t => t.id === selectedTeam)?.name || 'selected team'
          : 'no team';
          
        setSnackbar({ 
          open: true, 
          message: `${selected.length} users assigned to ${teamName} successfully`, 
          severity: 'success' 
        });
      }
      
      fetchUsers();
      setSelectedTeam('');
    } catch (e: any) {
      setSnackbar({ 
        open: true, 
        message: e.message || 'Failed to update user teams', 
        severity: 'error' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Render help functions
  const renderStatusChip = (status: string) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status) {
      case 'active':
        color = 'success';
        break;
      case 'inactive':
        color = 'error';
        break;
      case 'pending':
        color = 'warning';
        break;
    }
    
    return (
      <Chip 
        label={status} 
        color={color} 
        size="small"
        variant="outlined" 
      />
    );
  };

  const renderRoleChip = (role: string) => {
    let color: 'primary' | 'secondary' | 'default' | 'info' = 'default';
    
    switch (role.toLowerCase()) {
      case 'admin':
        color = 'primary';
        break;
      case 'moderator':
        color = 'secondary';
        break;
      case 'editor':
        color = 'info';
        break;
    }
    
    return (
      <Chip 
        label={role} 
        color={color} 
        size="small" 
      />
    );
  };

  const renderSubscriptionTier = (tier?: string) => {
    if (!tier) return 'N/A';
    
    let color: 'success' | 'primary' | 'secondary' | 'default' = 'default';
    
    switch (tier.toLowerCase()) {
      case 'enterprise':
        color = 'secondary';
        break;
      case 'influencer':
        color = 'primary';
        break;
      case 'creator':
        color = 'success';
        break;
    }
    
    return (
      <Chip 
        label={tier} 
        color={color} 
        size="small"
        variant="outlined" 
      />
    );
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Bulk Operations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Perform bulk actions on users: deactivate, delete, export, or send emails to selected users.
          </Typography>
        </div>
        <Tooltip title="Refresh">
          <IconButton onClick={() => fetchUsers()} disabled={loading || actionLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Operation modes */}
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange} 
        sx={{ mb: 3 }}
        variant="fullWidth"
      >
        <Tab label="User Management" />
        <Tab label="Team Operations" />
        <Tab label="Content Operations" />
      </Tabs>

      {/* Summary Cards */}
      {currentTab === 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent>
              <Typography variant="h6">Users Selected</Typography>
              <Typography variant="h3" sx={{ mt: 1, color: selected.length > 0 ? 'primary.main' : 'text.secondary' }}>
                {selected.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {selected.length > 0 
                  ? 'Use the actions menu to perform operations on these users' 
                  : 'Select users from the table below to enable bulk actions'}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent>
              <Typography variant="h6">Total Users</Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>
                {totalUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Total users in the system
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent>
              <Typography variant="h6">Available Actions</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip size="small" label="Role Assignment" color="primary" />
                <Chip size="small" label="Team Assignment" color="secondary" />
                <Chip size="small" label="Deactivate" color="warning" />
                <Chip size="small" label="Delete" color="error" />
                <Chip size="small" label="Export" color="info" />
                <Chip size="small" label="Email" color="success" />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {currentTab === 1 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            Team operations will be available in this tab in a future update. For now, you can use the User Management tab to assign users to teams.
          </Alert>
        </Box>
      )}

      {currentTab === 2 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            Content operations will be available in this tab in a future update. This will allow bulk operations on content items like posts, media, and documents.
          </Alert>
        </Box>
      )}

      <Paper sx={{ mb: 4, width: '100%', overflow: 'hidden' }}>
        {/* Toolbar */}
        <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
          <Box sx={{ flex: '1 1 auto', display: 'flex', alignItems: 'center' }}>
            <TextField
              placeholder="Search users..."
              variant="outlined"
              size="small"
              onChange={handleSearchChange}
              value={searchQuery}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="Filter list">
              <IconButton onClick={handleFilterClick} sx={{ ml: 1 }}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={filterAnchorEl}
              open={showFilterMenu}
              onClose={handleFilterClose}
              sx={{ mt: 1 }}
            >
              <Box sx={{ px: 2, py: 1, minWidth: 240 }}>
                <Typography variant="subtitle2" gutterBottom>Filter Users</Typography>

                <FormControl fullWidth margin="dense" size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="dense" size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={filters.role}
                    label="Role"
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="moderator">Moderator</MenuItem>
                    <MenuItem value="editor">Editor</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="dense" size="small">
                  <InputLabel>Subscription</InputLabel>
                  <Select
                    value={filters.subscriptionTier}
                    label="Subscription"
                    onChange={(e) => handleFilterChange('subscriptionTier', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="creator">Creator</MenuItem>
                    <MenuItem value="influencer">Influencer</MenuItem>
                    <MenuItem value="enterprise">Enterprise</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button size="small" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </Box>
              </Box>
            </Menu>
          </Box>

          {selected.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 2 }} color="text.secondary">
                {selected.length} selected
              </Typography>
              <Tooltip title="Bulk Actions">
                <IconButton
                  onClick={handleActionsClick}
                  disabled={actionLoading}
                >
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={actionMenuAnchorEl}
                open={Boolean(actionMenuAnchorEl)}
                onClose={handleActionsClose}
              >
                <MenuItem onClick={() => {
                  handleActionsClose();
                  setShowRoleAssignDialog(true);
                }}>
                  <ListItemIcon>
                    <VpnKeyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Assign Role</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                  handleActionsClose();
                  setShowTeamAssignDialog(true);
                }}>
                  <ListItemIcon>
                    <GroupsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Assign Team</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                  handleActionsClose();
                  setShowDeactivateConfirm(true);
                }}>
                  <ListItemIcon>
                    <BlockIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Deactivate Users</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                  handleActionsClose();
                  setShowDeleteConfirm(true);
                }}>
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Delete Users</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                  handleActionsClose();
                  handleBulkExport();
                }}>
                  <ListItemIcon>
                    <FileDownloadIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Export as CSV</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => {
                  handleActionsClose();
                  setShowBulkEmailDialog(true);
                }}>
                  <ListItemIcon>
                    <EmailIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Send Email</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>

        {/* Table */}
        {loading ? (
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selected.length > 0 && selected.length < filteredUsers.length}
                        checked={filteredUsers.length > 0 && selected.length === filteredUsers.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell 
                      onClick={() => handleSort('email')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Email {sortBy === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('role')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Role {sortBy === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('status')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Status {sortBy === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    <TableCell>
                      Team
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('subscriptionTier')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Subscription {sortBy === 'subscriptionTier' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('createdAt')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Created {sortBy === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('lastLoginAt')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Last Login {sortBy === 'lastLoginAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map(user => (
                      <TableRow 
                        key={user.id} 
                        hover 
                        selected={selected.includes(user.id)}
                        onClick={() => handleSelect(user.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected.includes(user.id)}
                            onChange={() => {}} // Handled by row click
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>{user.firstName} {user.lastName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{renderRoleChip(user.role)}</TableCell>
                        <TableCell>{renderStatusChip(user.status)}</TableCell>
                        <TableCell>
                          {user.teamName ? (
                            <Chip 
                              icon={<GroupsIcon />}
                              label={user.teamName} 
                              size="small" 
                              color="info"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">No team</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.organization?.billing?.subscriptionTier ? 
                            renderSubscriptionTier(user.organization.billing.subscriptionTier) : 
                            renderSubscriptionTier(user.subscriptionTier) // Fallback to deprecated field
                          }
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString() 
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={totalUsers}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selected.length} user{selected.length !== 1 ? 's' : ''}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={showDeactivateConfirm}
        onClose={() => setShowDeactivateConfirm(false)}
      >
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate {selected.length} user{selected.length !== 1 ? 's' : ''}? They will no longer be able to log in.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeactivateConfirm(false)}>Cancel</Button>
          <Button onClick={handleBulkDeactivate} color="warning" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog
        open={showBulkEmailDialog}
        onClose={() => setShowBulkEmailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Send Email to {selected.length} User{selected.length !== 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Subject"
            fullWidth
            variant="outlined"
            value={bulkEmailSubject}
            onChange={(e) => setBulkEmailSubject(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Email Content"
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            value={bulkEmailContent}
            onChange={(e) => setBulkEmailContent(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkEmailDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkEmail} 
            color="primary" 
            variant="contained"
            disabled={!bulkEmailSubject || !bulkEmailContent}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog
        open={showRoleAssignDialog}
        onClose={() => setShowRoleAssignDialog(false)}
      >
        <DialogTitle>Assign Role to {selected.length} User{selected.length !== 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select a role to assign to the selected users. This will override their current roles.
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedRole}
              label="Role"
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="moderator">Moderator</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="user">Regular User</MenuItem>
              <MenuItem value="viewer">Viewer (Read-Only)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRoleAssignDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkRoleAssign} 
            color="primary" 
            variant="contained"
            disabled={!selectedRole}
          >
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Assignment Dialog */}
      <Dialog
        open={showTeamAssignDialog}
        onClose={() => setShowTeamAssignDialog(false)}
      >
        <DialogTitle>Assign Team to {selected.length} User{selected.length !== 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select a team to assign to the selected users or remove them from their current team.
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel>Team</InputLabel>
            <Select
              value={selectedTeam}
              label="Team"
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <MenuItem value="">
                <em>No Team (Remove from current team)</em>
              </MenuItem>
              {teams.map(team => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name} ({team.memberCount} members)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTeamAssignDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkTeamAssign} 
            color="primary" 
            variant="contained"
          >
            Assign Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Loading overlay for actions */}
      {actionLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Processing...</Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
} 