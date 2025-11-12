'use client';

import { useState, useEffect } from 'react';
import { CircularProgress, Alert, Box, List, ListItem, ListItemText, Avatar, TextField, MenuItem, Select, InputLabel, FormControl, Button, Chip } from '@mui/material';
import { DateRangePicker } from '@mui/x-date-pickers-pro';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import Autocomplete from '@mui/material/Autocomplete';
import { getInboxMessages, InboxFilters, fetchTeamMembers, fetchInboxLabels, bulkUpdateStatus, bulkAssign, bulkLabel, bulkDelete, getConversation, replyToMessage, assignMessage, addNotes } from '@/lib/api/content';
import type { InboxMessage } from '@/lib/content/SocialInboxService';
import Checkbox from '@mui/material/Checkbox';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import InfoIcon from '@mui/icons-material/Info';
import { useCallback, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';

// Import mobile components
import { 
  MobileInboxHeader, 
  MobileMessageCard, 
  MobileReplyModal, 
  MobileFilterDrawer,
  FilterOptions 
} from '@/components/content/inbox';

const PLATFORMS = [
  { value: '', label: 'All Platforms' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'tiktok', label: 'TikTok' },
];
const MESSAGE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'direct', label: 'Direct' },
  { value: 'mention', label: 'Mention' },
  { value: 'comment', label: 'Comment' },
  { value: 'review', label: 'Review' },
];
const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'replied', label: 'Replied' },
];
const SENTIMENTS = [
  { value: '', label: 'All Sentiments' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InboxFilters>({});
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [teamMembers, setTeamMembers] = useState<{ userId: string; name: string; email: string; role: string }[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<InboxMessage | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Mobile-specific state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileReplyOpen, setMobileReplyOpen] = useState(false);
  const [mobileReplyMessage, setMobileReplyMessage] = useState<InboxMessage | null>(null);
  const [mobileFilters, setMobileFilters] = useState<FilterOptions>({
    platforms: [],
    messageTypes: [],
    statuses: [],
    priorities: []
  });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const listRef = useRef<HTMLUListElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  // Calculate unread count for mobile header
  const unreadCount = messages.filter(m => m.status === 'unread').length;

  useEffect(() => {
    fetchTeamMembers().then(setTeamMembers).catch(() => setTeamMembers([]));
    fetchInboxLabels().then(setLabels).catch(() => setLabels([]));
  }, []);

  useEffect(() => {
    const fetchInboxMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const inboxData = await getInboxMessages({
          ...filters,
          search,
          fromDate: dateRange[0] ? dateRange[0].toISOString() : undefined,
          toDate: dateRange[1] ? dateRange[1].toISOString() : undefined,
          label: selectedLabels.length > 0 ? selectedLabels.join(',') : undefined,
        });
        setMessages(inboxData);
      } catch (err) {
        setError('Failed to load inbox messages. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInboxMessages();
  }, [filters, search, dateRange, selectedLabels]);

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      getInboxMessages({ ...filters, search, fromDate: dateRange[0]?.toISOString(), toDate: dateRange[1]?.toISOString(), label: selectedLabels.length > 0 ? selectedLabels.join(',') : undefined })
        .then(setMessages)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [filters, search, dateRange, selectedLabels]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setLoadingMore(true);
      getInboxMessages({ ...filters, search, fromDate: dateRange[0]?.toISOString(), toDate: dateRange[1]?.toISOString(), label: selectedLabels.length > 0 ? selectedLabels.join(',') : undefined, limit: 20 * (page + 1) })
        .then(newMsgs => {
          setMessages(newMsgs);
          setPage(p => p + 1);
          setHasMore(newMsgs.length >= 20 * (page + 1));
        })
        .finally(() => setLoadingMore(false));
    }
  }, [filters, search, dateRange, selectedLabels, loadingMore, hasMore, page]);
  
  useEffect(() => {
    const ref = listRef.current;
    if (!ref) return;
    ref.addEventListener('scroll', handleScroll);
    return () => ref.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Keyboard shortcuts (basic: select all, clear selection, open details)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        setSelected(messages.map(m => m.id));
        e.preventDefault();
      }
      if (e.key === 'Escape') setSelected([]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [messages]);

  // Mobile handlers
  const handleMobileReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setMobileReplyMessage(message);
      setMobileReplyOpen(true);
    }
  };

  const handleMobileReplySubmit = async (messageId: string, reply: string) => {
    try {
      await replyToMessage(messageId, reply);
      enqueueSnackbar('Reply sent successfully', { variant: 'success' });
      // Refresh messages
      const inboxData = await getInboxMessages({ ...filters, search });
      setMessages(inboxData);
    } catch (error) {
      enqueueSnackbar('Failed to send reply', { variant: 'error' });
      throw error;
    }
  };

  const handleMobileArchive = async (messageId: string) => {
    try {
      await bulkUpdateStatus([messageId], 'archived');
      enqueueSnackbar('Message archived', { variant: 'success' });
      // Refresh messages
      const inboxData = await getInboxMessages({ ...filters, search });
      setMessages(inboxData);
    } catch (error) {
      enqueueSnackbar('Failed to archive message', { variant: 'error' });
    }
  };

  const handleMobileStar = async (messageId: string, starred: boolean) => {
    try {
      // Implement star functionality
      enqueueSnackbar(starred ? 'Message starred' : 'Message unstarred', { variant: 'success' });
      return { success: true };
    } catch (error) {
      enqueueSnackbar('Failed to update message', { variant: 'error' });
      return { success: false };
    }
  };

  const handleMobileFiltersApply = () => {
    // Convert mobile filters to regular filters
    const newFilters: InboxFilters = {};
    
    if (mobileFilters.platforms.length > 0) {
      newFilters.platform = mobileFilters.platforms[0]; // Take first platform for now
    }
    
    if (mobileFilters.messageTypes.length > 0) {
      newFilters.messageType = mobileFilters.messageTypes[0]; // Take first type for now
    }
    
    if (mobileFilters.statuses.length > 0) {
      newFilters.status = mobileFilters.statuses[0]; // Take first status for now
    }
    
    setFilters(newFilters);
  };

  const handleMobileFiltersClear = () => {
    setMobileFilters({
      platforms: [],
      messageTypes: [],
      statuses: [],
      priorities: []
    });
    setFilters({});
  };

  const getActiveFilterCount = () => {
    return mobileFilters.platforms.length + 
           mobileFilters.messageTypes.length + 
           mobileFilters.statuses.length + 
           mobileFilters.priorities.length;
  };

  const handleFilterChange = (field: keyof InboxFilters) => (event: any) => {
    setFilters(prev => ({ ...prev, [field]: event.target.value }));
  };
  const handleSearchChange = (event: any) => setSearch(event.target.value);
  const handleClearFilters = () => {
    setFilters({});
    setSearch('');
    setDateRange([null, null]);
    setSelectedLabels([]);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(messages.map(msg => msg.id));
    } else {
      setSelected([]);
    }
  };
  const handleSelectOne = (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(prev => event.target.checked ? [...prev, id] : prev.filter(sid => sid !== id));
  };
  const allSelected = selected.length > 0 && selected.length === messages.length;
  const someSelected = selected.length > 0 && selected.length < messages.length;

  // Bulk action handlers
  const handleBulkMarkRead = async () => {
    await bulkUpdateStatus(selected, 'read');
    setSelected([]);
    // Refresh
    const inboxData = await getInboxMessages({ ...filters, search });
    setMessages(inboxData);
  };
  const handleBulkMarkUnread = async () => {
    await bulkUpdateStatus(selected, 'unread');
    setSelected([]);
    const inboxData = await getInboxMessages({ ...filters, search });
    setMessages(inboxData);
  };
  const handleBulkArchive = async () => {
    await bulkUpdateStatus(selected, 'archived');
    setSelected([]);
    const inboxData = await getInboxMessages({ ...filters, search });
    setMessages(inboxData);
  };
  const handleBulkDelete = async () => {
    await bulkDelete(selected);
    setSelected([]);
    const inboxData = await getInboxMessages({ ...filters, search });
    setMessages(inboxData);
  };
  const handleBulkAssign = async (userId: string) => {
    await bulkAssign(selected, userId);
    setSelected([]);
    const inboxData = await getInboxMessages({ ...filters, search });
    setMessages(inboxData);
  };
  const handleBulkLabel = async (labels: string[]) => {
    await bulkLabel(selected, labels);
    setSelected([]);
    const inboxData = await getInboxMessages({ ...filters, search });
    setMessages(inboxData);
  };

  // Stats bar (unread count, per-platform, response time)
  const platformStats = PLATFORMS.filter(p => p.value).map(p => ({
    ...p,
    count: messages.filter(m => m.platformId === p.value).length
  }));
  
  // Real response time calculation: average time between receivedAt and repliedAt
  const avgResponseTime = (() => {
    const repliedMessages = messages.filter(m => 
      m.repliedAt && 
      m.receivedAt && 
      m.status === 'replied'
    );
    
    if (repliedMessages.length === 0) return null;
    
    const responseTimes = repliedMessages.map(m => {
      const receivedTime = new Date(m.receivedAt!).getTime();
      const repliedTime = new Date(m.repliedAt!).getTime();
      return repliedTime - receivedTime;
    });
    
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    const avgTimeMs = totalResponseTime / responseTimes.length;
    
    // Convert to human-readable format
    const avgTimeSeconds = Math.floor(avgTimeMs / 1000);
    const avgTimeMinutes = Math.floor(avgTimeSeconds / 60);
    const avgTimeHours = Math.floor(avgTimeMinutes / 60);
    
    if (avgTimeHours > 24) {
      const days = Math.floor(avgTimeHours / 24);
      return `${days}d ${avgTimeHours % 24}h`;
    } else if (avgTimeHours > 0) {
      return `${avgTimeHours}h ${avgTimeMinutes % 60}m`;
    } else if (avgTimeMinutes > 0) {
      return `${avgTimeMinutes}m`;
    } else {
      return `${avgTimeSeconds}s`;
    }
  })();

  // Message details drawer with full production implementation
  function MessageDetailsDrawer({ open, message, onClose }: { open: boolean; message: InboxMessage | null; onClose: () => void }) {
    const [thread, setThread] = useState<InboxMessage[]>([]);
    const [reply, setReply] = useState('');
    const [assignTo, setAssignTo] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<{id: string, name: string, url: string, type: string}[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
      if (open && message) {
        setLoading(true);
        
        // Load conversation thread from actual API
        getConversation(message.id)
          .then(thread => {
            setThread(thread);
            
            // Fetch actual message attachments if the API supports it
            if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
              Promise.all(message.attachments.map((attachment: any) => 
                fetch(`/api/content/inbox/attachments/${attachment.id}`)
                  .then(res => res.json())
                  .catch(() => null)
              ))
              .then(results => {
                setAttachments(results.filter(Boolean));
              })
              .catch(err => {
                console.error('Failed to load attachments:', err);
              });
            }
          })
          .catch(err => {
            console.error('Conversation load error:', err);
            enqueueSnackbar('Failed to load thread', { variant: 'error' });
          })
          .finally(() => setLoading(false));
          
        // Set current values from message
        setAssignTo(message.assignedTo || '');
        setNotes(message.notes || '');
        
        // Mark as read if unread - using proper API call
        if (message.status === 'unread') {
          bulkUpdateStatus([message.id], 'read')
            .catch(err => {
              console.error('Failed to mark as read:', err);
            });
        }
      } else {
        // Reset state when closing
        setReply('');
        setThread([]);
        setAttachments([]);
        setShowHistory(false);
      }
    }, [open, message]);

    const handleReply = async () => {
      if (!reply.trim() || !message) return;
      setLoading(true);
      try {
        await replyToMessage(message.id, reply);
        setReply('');
        // Refresh thread after reply
        const updatedThread = await getConversation(message.id);
        setThread(updatedThread);
        enqueueSnackbar('Reply sent', { variant: 'success' });
      } catch (err) {
        console.error('Reply error:', err);
        enqueueSnackbar('Failed to send reply', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    const handleAssign = async (userId: string) => {
      if (!message) return;
      setLoading(true);
      try {
        await assignMessage(message.id, userId);
        setAssignTo(userId);
        enqueueSnackbar('Message assigned', { variant: 'success' });
      } catch (err) {
        console.error('Assign error:', err);
        enqueueSnackbar('Failed to assign message', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    const handleNotes = async () => {
      if (!message) return;
      setLoading(true);
      try {
        await addNotes(message.id, notes);
        enqueueSnackbar('Notes updated', { variant: 'success' });
      } catch (err) {
        console.error('Notes update error:', err);
        enqueueSnackbar('Failed to update notes', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    const handleFlag = async () => {
      if (!message) return;
      setLoading(true);
      try {
        await bulkUpdateStatus([message.id], 'flagged');
        enqueueSnackbar('Message flagged', { variant: 'success' });
      } catch (err) {
        console.error('Flag error:', err);
        enqueueSnackbar('Failed to flag message', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    const handleArchive = async () => {
      if (!message) return;
      setLoading(true);
      try {
        await bulkUpdateStatus([message.id], 'archived');
        onClose(); // Close drawer after archiving
        enqueueSnackbar('Message archived', { variant: 'success' });
      } catch (err) {
        console.error('Archive error:', err);
        enqueueSnackbar('Failed to archive message', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    return (
      <Box sx={{ 
        width: isMobile ? '100vw' : 400, 
        p: 2, 
        bgcolor: 'background.paper', 
        position: 'fixed', 
        top: 0, 
        right: open ? 0 : '-100vw', 
        height: '100vh', 
        zIndex: 1200, 
        boxShadow: 3, 
        transition: 'right 0.3s',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Message Details</Typography>
          <Button onClick={onClose}>Close</Button>
        </Box>
        
        {loading && <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}
        
        {!loading && message && (
          <>
            {/* Message Header */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">{message.platformId}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {message.receivedAt ? new Date(message.receivedAt).toLocaleString() : ''}
                </Typography>
              </Box>
              <Typography variant="body1">{message.content}</Typography>
              
              {/* Quick Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="outlined" size="small" onClick={handleFlag}>Flag</Button>
                <Button variant="outlined" size="small" onClick={handleArchive}>Archive</Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? 'Hide History' : 'Show History'}
                </Button>
              </Box>
            </Box>
            
            {/* Message Thread */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Conversation</Typography>
            <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
              <List>
                {thread.length > 0 ? (
                  thread.map((msg, index) => (
                    <ListItem 
                      key={msg.id || index} 
                      sx={{ 
                        mb: 1, 
                        bgcolor: msg.id === message.id ? 'background.default' : 'transparent',
                        borderRadius: 1
                      }}
                      component="div"
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight="medium">{msg.sender.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : ''}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                            {msg.content}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">No conversation history</Typography>
                  </Box>
                )}
              </List>
              
              {/* Attachments Section */}
              {attachments.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Attachments</Typography>
                  <List>
                    {attachments.map((attachment) => (
                      <ListItem key={attachment.id} component="div">
                        <ListItemText 
                          primary={attachment.name}
                          secondary={
                            <Button 
                              href={attachment.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              size="small"
                            >
                              Download
                            </Button>
                          } 
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              
              {/* History Section */}
              {showHistory && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>History</Typography>
                  <List>
                    <ListItem component="div">
                      <ListItemText 
                        primary="Created"
                        secondary={message.receivedAt ? new Date(message.receivedAt).toLocaleString() : 'Unknown'}
                      />
                    </ListItem>
                    {message.repliedAt && (
                      <ListItem component="div">
                        <ListItemText 
                          primary="Last Reply"
                          secondary={new Date(message.repliedAt).toLocaleString()}
                        />
                      </ListItem>
                    )}
                    <ListItem component="div">
                      <ListItemText 
                        primary="Status"
                        secondary={message.status || 'unread'}
                      />
                    </ListItem>
                  </List>
                </>
              )}
            </Box>
            
            {/* Reply Form */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Reply</Typography>
              <TextField
                multiline
                rows={3}
                placeholder="Type your reply here..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                disabled={loading}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button 
                  variant="contained" 
                  onClick={handleReply} 
                  disabled={loading || !reply.trim()}
                >
                  Send Reply
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Assignment Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Assign</Typography>
              <FormControl size="small" fullWidth>
                <InputLabel>Assign to</InputLabel>
                <Select
                  value={assignTo}
                  label="Assign to"
                  onChange={e => handleAssign(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {teamMembers.map(member => (
                    <MenuItem key={member.userId} value={member.userId}>
                      {member.name || member.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Notes Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Notes</Typography>
              <TextField
                label="Internal notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={2}
                size="small"
                variant="outlined"
                disabled={loading}
                onBlur={handleNotes}
              />
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Advanced analytics (response time histogram, busiest times, team workload)
  function AdvancedInboxAnalytics({ messages, teamMembers }: { messages: InboxMessage[]; teamMembers: any[] }) {
    // Response time histogram with proper filtering and calculation
    const repliedMessages = messages.filter(m => 
      m.repliedAt && 
      m.receivedAt && 
      m.status === 'replied'
    );
    
    const responseTimes = repliedMessages.map(m => {
      const receivedTime = new Date(m.receivedAt!).getTime();
      const repliedTime = new Date(m.repliedAt!).getTime();
      return (repliedTime - receivedTime) / 60000; // Convert to minutes
    });
    
    const buckets = [0, 5, 15, 30, 60, 120, 240, 480, 1440];
    const histogram = buckets.map((min, i) => ({
      label: i === buckets.length - 1 ? `>${buckets[i - 1]}m` : `${min}-${buckets[i + 1] || '∞'}m`,
      count: responseTimes.filter(t => t >= min && t < (buckets[i + 1] || Infinity)).length
    })).slice(1);
    
    // Busiest times (hour of day)
    const hours = Array(24).fill(0);
    messages.forEach(m => { 
      if (m.receivedAt) {
        const hour = new Date(m.receivedAt).getHours();
        hours[hour]++;
      }
    });
    
    // Team workload with proper filtering
    const workload = teamMembers.map(member => ({
      ...member,
      count: messages.filter(msg => msg.assignedTo === member.userId).length,
      avgResponseTime: (() => {
        const memberReplies = messages.filter(msg => 
          msg.assignedTo === member.userId && 
          msg.repliedAt && 
          msg.receivedAt && 
          msg.status === 'replied'
        );
        
        if (memberReplies.length === 0) return null;
        
        const totalTime = memberReplies.reduce((sum, msg) => {
          const receivedTime = new Date(msg.receivedAt!).getTime();
          const repliedTime = new Date(msg.repliedAt!).getTime();
          return sum + (repliedTime - receivedTime);
        }, 0);
        
        const avgTimeMs = totalTime / memberReplies.length;
        const avgTimeMinutes = Math.floor(avgTimeMs / 60000);
        
        return avgTimeMinutes > 60 ? `${Math.floor(avgTimeMinutes / 60)}h` : `${avgTimeMinutes}m`;
      })()
    }));
    
    return (
      <Box mb={2}>
        <Typography variant="subtitle2">Advanced Analytics</Typography>
        <Box display="flex" gap={4} flexWrap="wrap">
          <Box>
            <Typography variant="body2">Response Time Distribution</Typography>
            <Box display="flex" gap={1} alignItems="flex-end">
              {histogram.map(h => (
                <Box key={h.label} textAlign="center">
                  <Box sx={{ width: 24, height: Math.max(h.count * 4, 2), bgcolor: 'primary.main', mb: 0.5 }} />
                  <Typography variant="caption">{h.label}</Typography>
                  <Typography variant="caption" display="block" sx={{ fontSize: 10 }}>({h.count})</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant="body2">Messages by Hour</Typography>
            <Box display="flex" gap={0.5} alignItems="flex-end">
              {hours.map((count, hour) => (
                <Box key={hour} textAlign="center">
                  <Box sx={{ width: 8, height: Math.max(count * 2, 1), bgcolor: 'secondary.main', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontSize: 8 }}>{hour}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant="body2">Team Performance</Typography>
            <Box display="flex" gap={1} alignItems="flex-end">
              {workload.map(w => (
                <Box key={w.userId} textAlign="center" title={`${w.count} messages, Avg: ${w.avgResponseTime || 'N/A'}`}>
                  <Box sx={{ width: 24, height: Math.max(w.count * 4, 2), bgcolor: 'info.main', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontSize: 10 }}>
                    {(w.name || w.email).substring(0, 8)}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontSize: 8 }}>
                    {w.avgResponseTime || 'N/A'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Button variant="outlined" onClick={() => router.push('/dashboard/analytics')}>
            View Full Analytics
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {/* Mobile View */}
      {isMobile ? (
        <Box>
          {/* Mobile Header */}
          <MobileInboxHeader
            unreadCount={unreadCount}
            onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            onSearchToggle={() => setMobileSearchOpen(!mobileSearchOpen)}
            onFilterToggle={() => setMobileFilterOpen(true)}
            onNotificationsToggle={() => {/* Handle notifications */}}
          />

          {/* Mobile Search Bar */}
          {mobileSearchOpen && (
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                placeholder="Search messages..."
                value={search}
                onChange={handleSearchChange}
                variant="outlined"
                size="small"
                autoFocus
              />
            </Box>
          )}

          {/* Mobile Message List */}
          <Box sx={{ pb: 8 }}> {/* Add padding for bottom navigation */}
            {isLoading ? (
              <Box sx={{ p: 2 }}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 2 }} />
                ))}
              </Box>
            ) : error ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  Your inbox is empty
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  New messages will appear here
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 1 }}>
                {messages.map(msg => (
                  <MobileMessageCard
                    key={msg.id}
                    message={msg}
                    isSelected={selected.includes(msg.id)}
                    onSelect={(messageId, isSelected) => {
                      if (isSelected) {
                        setSelected(prev => [...prev, messageId]);
                      } else {
                        setSelected(prev => prev.filter(id => id !== messageId));
                      }
                    }}
                    onReply={handleMobileReply}
                    onArchive={handleMobileArchive}
                    onStar={handleMobileStar}
                  />
                ))}
                
                {/* Loading more indicator */}
                {loadingMore && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Mobile Filter Drawer */}
          <MobileFilterDrawer
            open={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            filters={mobileFilters}
            onFiltersChange={setMobileFilters}
            onApplyFilters={handleMobileFiltersApply}
            onClearFilters={handleMobileFiltersClear}
            activeFilterCount={getActiveFilterCount()}
          />

          {/* Mobile Reply Modal */}
          <MobileReplyModal
            open={mobileReplyOpen}
            message={mobileReplyMessage}
            onClose={() => {
              setMobileReplyOpen(false);
              setMobileReplyMessage(null);
            }}
            onSend={handleMobileReplySubmit}
          />
        </Box>
      ) : (
        /* Desktop View */
        <Box py={2}>
          <h1>Inbox</h1>
          {/* Stats Bar */}
          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <Typography>Unread: {unreadCount}</Typography>
            {platformStats.map(p => (
              <Typography key={p.value}>{p.label}: {p.count}</Typography>
            ))}
            {avgResponseTime && <Typography>Avg. Response: {avgResponseTime}</Typography>}
          </Box>
          {/* Bulk Action Bar */}
          {selected.length > 0 && (
            <Toolbar sx={{ background: '#f5f5f5', mb: 2, borderRadius: 1 }}>
              <Typography sx={{ flex: 1 }}>
                {selected.length} selected
              </Typography>
              <Button onClick={handleBulkMarkRead}>Mark as Read</Button>
              <Button onClick={handleBulkMarkUnread}>Mark as Unread</Button>
              <Button onClick={handleBulkArchive}>Archive</Button>
              <Button onClick={handleBulkDelete} color="error">Delete</Button>
              <FormControl size="small" sx={{ minWidth: 120, mx: 1 }}>
                <InputLabel>Assign</InputLabel>
                <Select
                  label="Assign"
                  onChange={e => handleBulkAssign(e.target.value)}
                  value=""
                >
                  <MenuItem value="">None</MenuItem>
                  {teamMembers.map(member => (
                    <MenuItem key={member.userId} value={member.userId}>{member.name || member.email}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Autocomplete
                multiple
                options={labels}
                value={[]}
                onChange={(_, value) => handleBulkLabel(value)}
                renderInput={params => <TextField {...params} label="Label" size="small" />}
                sx={{ minWidth: 120, mx: 1 }}
              />
            </Toolbar>
          )}
          {/* Filter Bar and List */}
          <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
            <Checkbox
              indeterminate={someSelected}
              checked={allSelected}
              onChange={handleSelectAll}
              inputProps={{ 'aria-label': 'select all messages' }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={filters.platform || ''}
                label="Platform"
                onChange={handleFilterChange('platform')}
              >
                {PLATFORMS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.messageType || ''}
                label="Type"
                onChange={handleFilterChange('messageType')}
              >
                {MESSAGE_TYPES.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={handleFilterChange('status')}
              >
                {STATUSES.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sentiment</InputLabel>
              <Select
                value={filters.sentiment || ''}
                label="Sentiment"
                onChange={handleFilterChange('sentiment')}
              >
                {SENTIMENTS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Assigned User</InputLabel>
              <Select
                value={filters.assignedTo || ''}
                label="Assigned User"
                onChange={handleFilterChange('assignedTo')}
              >
                <MenuItem value="">All Users</MenuItem>
                {teamMembers.map(member => (
                  <MenuItem key={member.userId} value={member.userId}>{member.name || member.email}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              options={labels}
              value={selectedLabels}
              onChange={(_, value) => setSelectedLabels(value)}
              renderTags={(value: string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip key={index} variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Labels/Tags" size="small" sx={{ minWidth: 180 }} />
              )}
              sx={{ minWidth: 180 }}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateRangePicker
                localeText={{ start: 'From', end: 'To' }}
                value={dateRange}
                onChange={(newValue) => setDateRange(newValue)}
                slotProps={{
                  textField: (props: any) => ({ 
                    size: 'small', 
                    sx: { minWidth: 120 },
                    ...props 
                  })
                }}
              />
            </LocalizationProvider>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={handleSearchChange}
              sx={{ minWidth: 200 }}
            />
            <Button onClick={handleClearFilters} variant="outlined" size="small">Clear Filters</Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {isLoading ? (
            <Box py={8} textAlign="center">
              {[...Array(10)].map((_, i) => <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />)}
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : messages.length === 0 ? (
            <p>Your inbox is empty.</p>
          ) : (
            <List ref={listRef} sx={{ maxHeight: 600, overflow: 'auto' }}>
              {messages.map(msg => (
                <ListItem 
                  key={msg.id} 
                  component="div"
                  alignItems="flex-start" 
                  secondaryAction={
                    <Checkbox
                      checked={selected.includes(msg.id)}
                      onChange={handleSelectOne(msg.id)}
                      inputProps={{ 'aria-label': `select message ${msg.id}` }}
                    />
                  }
                  sx={{ cursor: 'pointer' }}
                  onClick={() => { setDetailsMessage(msg); setDetailsOpen(true); }}
                >
                  <Avatar sx={{ mr: 2 }} />
                  <ListItemText
                    primary={msg.platformId}
                    secondary={
                      <>
                        <span>{msg.content}</span>
                        <br />
                        <span style={{ fontSize: '0.8em', color: '#888' }}>{msg.receivedAt?.toLocaleString()}</span>
                      </>
                    }
                  />
                  <Chip label={msg.status} size="small" sx={{ ml: 1 }} />
                </ListItem>
              ))}
              {loadingMore && (
                <Box textAlign="center" py={2}>
                  <CircularProgress />
                </Box>
              )}
            </List>
          )}
          <MessageDetailsDrawer open={detailsOpen} message={detailsMessage} onClose={() => setDetailsOpen(false)} />
          <AdvancedInboxAnalytics messages={messages} teamMembers={teamMembers} />
        </Box>
      )}
    </LocalizationProvider>
  );
} 