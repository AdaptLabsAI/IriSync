'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress, Chip, MenuItem, Rating } from '@mui/material';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/common/RichTextEditor';
import { FileUpload } from '@/components/ui/fileupload/FileUpload';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'closed' | 'converted';
  createdAt: { seconds: number; nanoseconds: number } | string;
  updatedAt: { seconds: number; nanoseconds: number } | string;
  adminNotes?: string;
  attachments?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  satisfactionRating?: number;
  satisfactionComment?: string;
}

function formatDate(ts: any) {
  if (!ts) return '';
  if (typeof ts === 'string') return new Date(ts).toLocaleString();
  if (typeof ts === 'object' && ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return '';
}

export default function UserSupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState('');

  // Fetch user's tickets
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (subjectFilter) params.append('subject', subjectFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
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

  useEffect(() => { fetchTickets(); }, []);

  // Submit new ticket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Upload files first
      let uploadedUrls: string[] = [];
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach(file => formData.append('files', file));
        const uploadRes = await fetch('/api/support/tickets/upload', {
          method: 'POST',
          headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Failed to upload attachments');
        const uploadData = await uploadRes.json();
        uploadedUrls = uploadData.urls || [];
      }
      // Submit ticket with attachment URLs
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ subject, message, displayName, attachments: uploadedUrls, priority })
      });
      if (!res.ok) throw new Error('Failed to submit ticket');
      setSnackbar({ open: true, message: 'Ticket submitted successfully', severity: 'success' });
      setShowDialog(false);
      setSubject('');
      setMessage('');
      setDisplayName('');
      setAttachments([]);
      setAttachmentUrls([]);
      fetchTickets();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Error submitting ticket', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // View ticket details
  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    if (ticket.status === 'closed' && !ticket.satisfactionRating) {
      setShowRatingDialog(true);
    }
  };

  // Close ticket details dialog
  const handleCloseDetails = () => {
    setSelectedTicket(null);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Support Tickets</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Submit a private support ticket for sensitive issues. Only you and the support team can view your tickets.
      </Typography>
      <Button variant="contained" sx={{ mb: 3 }} onClick={() => setShowDialog(true)}>Submit New Ticket</Button>
      {/* Filter UI */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField label="Search Subject" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} size="small" />
        <TextField label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" select>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="open">Open</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="closed">Closed</MenuItem>
          <MenuItem value="converted">Converted</MenuItem>
        </TextField>
        <TextField label="Priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} size="small" select>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="urgent">Urgent</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={fetchTickets}>Apply Filters</Button>
      </Box>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tickets.length === 0 ? (
        <Alert severity="info">You have not submitted any support tickets yet.</Alert>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map(ticket => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell><Chip label={ticket.status} color={ticket.status === 'closed' ? 'default' : ticket.status === 'pending' ? 'warning' : 'primary'} size="small" /></TableCell>
                  <TableCell>{ticket.priority || 'medium'}</TableCell>
                  <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                  <TableCell>{formatDate(ticket.updatedAt)}</TableCell>
                  <TableCell><Button size="small" onClick={() => handleView(ticket)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      {/* New Ticket Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle>Submit Support Ticket</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              label="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Display Name (optional)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 50 }}
              helperText="Leave blank to use your profile name."
            />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Message</Typography>
            <RichTextEditor
              initialValue={message}
              onChange={setMessage}
              placeholder="Describe your issue in detail..."
              height={180}
              maxHeight={300}
              id="support-ticket-message"
              name="message"
            />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Attachments</Typography>
            <FileUpload
              onFileSelect={setAttachments}
              accept={'.jpg,.jpeg,.png,.pdf,.txt,.log,.doc,.docx,.xls,.xlsx,.csv'}
              multiple
              maxSize={10 * 1024 * 1024}
              showPreview
              dragAndDrop
              label="Attach files (optional)"
              helperText="Max 10MB per file. Supported: images, PDF, text, Office."
            />
            <TextField
              label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value as any)}
              fullWidth
              select
              sx={{ mb: 2 }}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting || !subject || !message}>{submitting ? 'Submitting...' : 'Submit'}</Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>Ticket Details</DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Subject</Typography>
              <Typography sx={{ mb: 2 }}>{selectedTicket.subject}</Typography>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Message</Typography>
              <Paper sx={{ p: 2, background: '#f9f9f9', mb: 2 }}>
                <span dangerouslySetInnerHTML={{ __html: selectedTicket.message }} />
              </Paper>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Status</Typography>
              <Chip label={selectedTicket.status} color={selectedTicket.status === 'closed' ? 'default' : selectedTicket.status === 'pending' ? 'warning' : 'primary'} size="small" sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Priority</Typography>
              <Chip label={selectedTicket.priority || 'medium'} color={selectedTicket.priority === 'urgent' ? 'error' : selectedTicket.priority === 'high' ? 'warning' : selectedTicket.priority === 'medium' ? 'default' : 'primary'} size="small" sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Admin Notes</Typography>
              <Paper sx={{ p: 2, background: '#f5f5f5' }}>{selectedTicket.adminNotes || <em>No response yet.</em>}</Paper>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Created: {formatDate(selectedTicket.createdAt)} | Updated: {formatDate(selectedTicket.updatedAt)}
              </Typography>
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Attachments</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {selectedTicket.attachments.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outlined" size="small">Attachment {idx + 1}</Button>
                      </a>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Satisfaction Rating Dialog */}
      <Dialog open={showRatingDialog} onClose={() => setShowRatingDialog(false)}>
        <DialogTitle>Rate Your Support Experience</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>How satisfied are you with the resolution of this ticket?</Typography>
          <Rating value={ratingValue} onChange={(_, v) => setRatingValue(v)} max={5} />
          <TextField
            label="Comments (optional)"
            value={ratingComment}
            onChange={e => setRatingComment(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRatingDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!ratingValue}
            onClick={async () => {
              if (!selectedTicket || !ratingValue) return;
              await fetch('/api/support/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ ticketId: selectedTicket.id, satisfactionRating: ratingValue, satisfactionComment: ratingComment })
              });
              setShowRatingDialog(false);
              setSnackbar({ open: true, message: 'Thank you for your feedback!', severity: 'success' });
              fetchTickets();
            }}
          >Submit</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
} 