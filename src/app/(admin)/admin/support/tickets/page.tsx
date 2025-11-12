'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, TextField, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Checkbox, FormControlLabel } from '@mui/material';
import AdminGuard from '@/components/admin/AdminGuard';
import RichTextEditor from '@/components/common/RichTextEditor';
import { FileUpload } from '@/components/ui/fileupload/FileUpload';
import { Download as DownloadIcon } from '@mui/icons-material';
import { BarChart as ChartIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'closed' | 'converted';
  isPrivate: boolean;
  convertedToForum: boolean;
  createdAt: { seconds: number; nanoseconds: number } | string;
  updatedAt: { seconds: number; nanoseconds: number } | string;
  adminNotes?: string;
  forumPostId?: string;
  displayName?: string;
  adminAttachmentUrls?: string[];
  priority?: string;
  assignedTo?: string;
  tags?: string[];
  firstResponseAt?: { seconds: number; nanoseconds: number } | string;
  closedAt?: { seconds: number; nanoseconds: number } | string;
}

interface ForumCategory {
  id: string;
  name: string;
}

const statusOptions = ['open', 'pending', 'closed', 'converted'];

function formatDate(ts: any) {
  if (!ts) return '';
  if (typeof ts === 'string') return new Date(ts).toLocaleString();
  if (typeof ts === 'object' && ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return '';
}

export default function AdminSupportTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('open');
  const [editNotes, setEditNotes] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [adminAttachments, setAdminAttachments] = useState<File[]>([]);
  const [adminAttachmentUrls, setAdminAttachmentUrls] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkAssignTo, setBulkAssignTo] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [editFirstResponseAt, setEditFirstResponseAt] = useState('');
  const [editClosedAt, setEditClosedAt] = useState('');
  const [duplicateCandidates, setDuplicateCandidates] = useState<Ticket[]>([]);
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [exporting, setExporting] = useState(false);

  // Fetch all tickets
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (userFilter) params.append('userId', userFilter);
      if (assignedToFilter) params.append('assignedTo', assignedToFilter);
      if (tagFilter) params.append('tag', tagFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const res = await fetch(`/api/support/tickets?${params.toString()}`, { headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message || 'Error loading tickets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch forum categories when needed
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/forum/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Open edit dialog
  const handleEdit = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditNotes(ticket.adminNotes || '');
    setEditDialogOpen(true);
  };

  // Save ticket changes
  const handleSave = async () => {
    if (!selectedTicket) return;
    try {
      // Upload files first
      let uploadedUrls: string[] = [];
      if (adminAttachments.length > 0) {
        const formData = new FormData();
        adminAttachments.forEach(file => formData.append('files', file));
        const uploadRes = await fetch('/api/support/tickets/upload', {
          method: 'POST',
          headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Failed to upload attachments');
        const uploadData = await uploadRes.json();
        uploadedUrls = uploadData.urls || [];
      }
      // Save ticket with admin attachment URLs
      const res = await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ticketId: selectedTicket.id, status: editStatus, adminNotes: editNotes, adminAttachments: uploadedUrls })
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      setSnackbar({ open: true, message: 'Ticket updated', severity: 'success' });
      setEditDialogOpen(false);
      setAdminAttachments([]);
      setAdminAttachmentUrls([]);
      fetchTickets();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Error updating ticket', severity: 'error' });
    }
  };

  // Convert to forum
  const handleConvertToForum = async (ticket: Ticket) => {
    await fetchCategories();
    setSelectedTicket(ticket);
    setSelectedCategory('');
    setEditDialogOpen(false);
    setConvertDialogOpen(true);
  };

  // Confirm conversion
  const handleConfirmConvert = async () => {
    if (!selectedTicket || !selectedCategory) return;
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ticketId: selectedTicket.id, status: 'converted', convertedToForum: true, categoryId: selectedCategory })
      });
      if (!res.ok) throw new Error('Failed to convert ticket');
      const data = await res.json();
      setSnackbar({ open: true, message: 'Ticket converted to forum', severity: 'success' });
      setConvertDialogOpen(false);
      fetchTickets();
      // Optionally, show a link to the new forum post
      if (data.forumPostUrl) {
        window.open(data.forumPostUrl, '_blank');
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Error converting ticket', severity: 'error' });
    }
  };

  // Delete ticket
  const handleDelete = async (ticket: Ticket) => {
    if (!window.confirm('Delete this ticket?')) return;
    try {
      const res = await fetch(`/api/support/tickets?ticketId=${ticket.id}`, {
        method: 'DELETE',
        headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete ticket');
      setSnackbar({ open: true, message: 'Ticket deleted', severity: 'success' });
      fetchTickets();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Error deleting ticket', severity: 'error' });
    }
  };

  // Export handler
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (userFilter) params.append('userId', userFilter);
      if (assignedToFilter) params.append('assignedTo', assignedToFilter);
      if (tagFilter) params.append('tag', tagFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('format', exportFormat);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/support/tickets/export?${params.toString()}`, {
        headers: { 'authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export tickets');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `support-tickets-export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Error exporting tickets', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // Navigate to stats dashboard
  const handleViewStats = () => {
    router.push('/admin/support/stats');
  };

  return (
    <AdminGuard>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Support Tickets</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ChartIcon />}
              onClick={handleViewStats}
            >
              View Stats Dashboard
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<DownloadIcon />} 
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          View, filter, and manage all support tickets. Use the button to convert a ticket to a forum post if appropriate.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField label="User ID" value={userFilter} onChange={e => setUserFilter(e.target.value)} size="small" />
          <TextField label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" select>
            <MenuItem value="">All</MenuItem>
            {statusOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </TextField>
          <TextField label="Priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} size="small" select>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="urgent">Urgent</MenuItem>
          </TextField>
          <TextField label="Assigned To" value={assignedToFilter} onChange={e => setAssignedToFilter(e.target.value)} size="small" />
          <TextField label="Tag" value={tagFilter} onChange={e => setTagFilter(e.target.value)} size="small" />
          <TextField label="Date From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="Date To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <Button variant="outlined" onClick={fetchTickets}>Apply Filters</Button>
          <Select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'csv' | 'pdf')} size="small" sx={{ minWidth: 100 }}>
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
          </Select>
        </Box>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"><Checkbox checked={selected.length === tickets.length && tickets.length > 0} onChange={e => setSelected(e.target.checked ? tickets.map(t => t.id) : [])} /></TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>First Response At</TableCell>
                  <TableCell>Closed At</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell padding="checkbox"><Checkbox checked={selected.includes(ticket.id)} onChange={e => setSelected(sel => e.target.checked ? [...sel, ticket.id] : sel.filter(id => id !== ticket.id))} /></TableCell>
                    <TableCell>{ticket.id}</TableCell>
                    <TableCell>{ticket.displayName || ticket.userId}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>{ticket.status}</TableCell>
                    <TableCell>{ticket.priority || 'medium'}</TableCell>
                    <TableCell>{ticket.assignedTo || '-'}</TableCell>
                    <TableCell>{Array.isArray(ticket.tags) ? ticket.tags.join(', ') : ''}</TableCell>
                    <TableCell>{ticket.firstResponseAt ? formatDate(ticket.firstResponseAt) : '-'}</TableCell>
                    <TableCell>{ticket.closedAt ? formatDate(ticket.closedAt) : '-'}</TableCell>
                    <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell>{formatDate(ticket.updatedAt)}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleEdit(ticket)}>Edit</Button>
                      <Button size="small" color="secondary" onClick={() => handleConvertToForum(ticket)} disabled={ticket.status === 'converted'}>Convert to Forum</Button>
                      <Button size="small" color="error" onClick={() => handleDelete(ticket)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={selected.length === tickets.length && tickets.length > 0} onChange={e => setSelected(e.target.checked ? tickets.map(t => t.id) : [])} />}
            label="Select All"
          />
          <Select value={bulkAction} onChange={e => setBulkAction(e.target.value)} displayEmpty size="small" sx={{ minWidth: 120 }}>
            <MenuItem value="">Bulk Action</MenuItem>
            <MenuItem value="close">Close</MenuItem>
            <MenuItem value="delete">Delete</MenuItem>
            <MenuItem value="assign">Assign</MenuItem>
          </Select>
          {bulkAction === 'assign' && (
            <TextField label="Assign To" value={bulkAssignTo} onChange={e => setBulkAssignTo(e.target.value)} size="small" />
          )}
          <Button variant="contained" disabled={!bulkAction || selected.length === 0} onClick={async () => {
            const body: any = { action: bulkAction, ticketIds: selected };
            if (bulkAction === 'assign') body.assignedTo = bulkAssignTo;
            await fetch('/api/support/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify(body)
            });
            setBulkAction('');
            setBulkAssignTo('');
            setSelected([]);
            fetchTickets();
          }}>Apply</Button>
        </Box>
        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit Ticket</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Status</Typography>
              <Select value={editStatus} onChange={e => setEditStatus(e.target.value)} fullWidth>
                {statusOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Admin Notes</Typography>
              <RichTextEditor
                initialValue={editNotes}
                onChange={setEditNotes}
                placeholder="Add internal notes or a response for the user..."
                height={120}
                maxHeight={200}
                id="admin-notes-editor"
                name="adminNotes"
              />
            </Box>
            {selectedTicket && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">User Message</Typography>
                <Paper sx={{ p: 2, background: '#f9f9f9' }}>
                  <span dangerouslySetInnerHTML={{ __html: selectedTicket.message }} />
                </Paper>
              </Box>
            )}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Admin Notes</Typography>
              <Paper sx={{ p: 2, background: '#f5f5f5' }}>
                {selectedTicket?.adminNotes ? <span dangerouslySetInnerHTML={{ __html: selectedTicket.adminNotes }} /> : <em>No response yet.</em>}
              </Paper>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Admin Attachments</Typography>
              <FileUpload
                onFileSelect={setAdminAttachments}
                accept={'.jpg,.jpeg,.png,.pdf,.txt,.log,.doc,.docx,.xls,.xlsx,.csv'}
                multiple
                maxSize={10 * 1024 * 1024}
                showPreview
                dragAndDrop
                label="Attach files (optional)"
                helperText="Max 10MB per file. Supported: images, PDF, text, Office."
              />
            </Box>
            {selectedTicket?.adminAttachmentUrls && selectedTicket.adminAttachmentUrls.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Admin Attachments</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {selectedTicket.adminAttachmentUrls.map((url: string, idx: number) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outlined" size="small">Attachment {idx + 1}</Button>
                    </a>
                  ))}
                </Box>
              </Box>
            )}
            <TextField label="Assigned To" value={editAssignedTo} onChange={e => setEditAssignedTo(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <TextField label="Tags (comma separated)" value={editTags.join(', ')} onChange={e => setEditTags(e.target.value.split(',').map(s => s.trim()))} fullWidth sx={{ mb: 2 }} />
            <TextField label="Internal Notes (admin only)" value={editInternalNotes} onChange={e => setEditInternalNotes(e.target.value)} fullWidth multiline rows={2} sx={{ mb: 2 }} />
            <TextField label="First Response At" value={editFirstResponseAt} onChange={e => setEditFirstResponseAt(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <TextField label="Closed At" value={editClosedAt} onChange={e => setEditClosedAt(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <Button variant="outlined" sx={{ mb: 2 }} onClick={async () => {
              if (!selectedTicket) return;
              const res = await fetch('/api/support/tickets/auto-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: selectedTicket.subject, message: selectedTicket.message })
              });
              const data = await res.json();
              if (data.suggestedResponse) setEditNotes(data.suggestedResponse);
            }}>Suggest Auto-Response</Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>Save</Button>
          </DialogActions>
        </Dialog>
        {/* Convert to Forum Dialog */}
        <Dialog open={convertDialogOpen} onClose={() => setConvertDialogOpen(false)}>
          <DialogTitle>Convert Ticket to Forum Post</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>Select a forum category for this post:</Typography>
            <Select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              fullWidth
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConvertDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirmConvert} disabled={!selectedCategory}>Convert</Button>
          </DialogActions>
        </Dialog>
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </AdminGuard>
  );
} 