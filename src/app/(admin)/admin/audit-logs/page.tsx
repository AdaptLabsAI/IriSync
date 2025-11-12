import React from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, FormControl, InputLabel, 
  Select, MenuItem, TextField, Button, Chip, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Card, CardContent, Collapse, Divider, Tooltip
} from '@mui/material';
import Grid from '@/components/ui/grid';
import AdminGuard from '@/components/admin/AdminGuard';
import { 
  FilterList, Search, Clear, ExpandMore, ExpandLess, 
  Visibility, Download, Refresh
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';

// Define audit log types
interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  details: any;
  timestamp: { seconds: number; nanoseconds: number };
  resourceId?: string;
  resourceType?: string;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
}

const severityColors: Record<string, string> = {
  info: 'primary',
  low: 'info',
  medium: 'warning',
  high: 'error',
  critical: 'error'
};

export default function AuditLogsPage() {
  // State variables
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);
  
  // Filter states
  const [filterExpanded, setFilterExpanded] = React.useState(false);
  const [adminFilter, setAdminFilter] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('');
  const [resourceFilter, setResourceFilter] = React.useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState('');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  
  // Detail view state
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  // Column visibility state
  const [columnSettings, setColumnSettings] = React.useState({
    timestamp: true,
    adminEmail: true,
    adminRole: true,
    action: true,
    resourceType: true,
    resourceId: true,
    severity: true,
    details: false
  });
  const [columnDialogOpen, setColumnDialogOpen] = React.useState(false);

  // Fetch audit logs
  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString()
      });
      
      // Add filters if set
      if (adminFilter) params.append('adminId', adminFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (resourceFilter) params.append('resourceId', resourceFilter);
      if (resourceTypeFilter) params.append('resourceType', resourceTypeFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      
      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'An error occurred while fetching audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, adminFilter, actionFilter, resourceFilter, resourceTypeFilter, severityFilter, startDate, endDate]);

  // Initial load and when dependencies change
  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle pagination change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset filters
  const handleResetFilters = () => {
    setAdminFilter('');
    setActionFilter('');
    setResourceFilter('');
    setResourceTypeFilter('');
    setSeverityFilter('');
    setStartDate(null);
    setEndDate(null);
  };

  // Apply filters
  const handleApplyFilters = () => {
    setPage(0);
    fetchLogs();
  };

  // Show details dialog
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000) 
      : new Date(timestamp);
      
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };

  // Export logs to CSV
  const handleExport = () => {
    // Create CSV content
    const headers = ['ID', 'Timestamp', 'Admin', 'Role', 'Action', 'Resource Type', 'Resource ID', 'Severity', 'Details'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.id,
        formatTimestamp(log.timestamp),
        log.adminEmail || '',
        log.adminRole || '',
        log.action || '',
        log.resourceType || '',
        log.resourceId || '',
        log.severity || 'info',
        JSON.stringify(log.details || {}).replace(/,/g, ';').replace(/"/g, '""')
      ];
      
      // Escape values with quotes if they contain commas
      const csvRow = row.map(value => {
        return value.includes(',') ? `"${value}"` : value;
      }).join(',');
      
      csvRows.push(csvRow);
    });
    
    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminGuard>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Audit Logs</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              startIcon={<FilterList />}
              onClick={() => setFilterExpanded(!filterExpanded)}
            >
              Filters {filterExpanded ? <ExpandLess /> : <ExpandMore />}
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Visibility />}
              onClick={() => setColumnDialogOpen(true)}
            >
              Columns
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Download />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />}
              onClick={() => fetchLogs()}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Filter Panel */}
        <Collapse in={filterExpanded}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Filters</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Admin Email"
                  fullWidth
                  value={adminFilter}
                  onChange={(e) => setAdminFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Action"
                  fullWidth
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Resource ID"
                  fullWidth
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Resource Type"
                  fullWidth
                  value={resourceTypeFilter}
                  onChange={(e) => setResourceTypeFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={severityFilter}
                    label="Severity"
                    onChange={(e) => setSeverityFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    minDate={startDate || undefined}
                    onChange={(date) => setEndDate(date)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleApplyFilters}>
                  Apply Filters
                </Button>
                <Button variant="outlined" onClick={handleResetFilters}>
                  Reset
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Audit Logs Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader aria-label="audit logs table">
              <TableHead>
                <TableRow>
                  {columnSettings.timestamp && <TableCell>Timestamp</TableCell>}
                  {columnSettings.adminEmail && <TableCell>Admin</TableCell>}
                  {columnSettings.adminRole && <TableCell>Role</TableCell>}
                  {columnSettings.action && <TableCell>Action</TableCell>}
                  {columnSettings.resourceType && <TableCell>Resource Type</TableCell>}
                  {columnSettings.resourceId && <TableCell>Resource ID</TableCell>}
                  {columnSettings.severity && <TableCell>Severity</TableCell>}
                  {columnSettings.details && <TableCell>Details</TableCell>}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && !logs.length ? (
                  <TableRow>
                    <TableCell colSpan={Object.values(columnSettings).filter(Boolean).length + 1} align="center">
                      <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Object.values(columnSettings).filter(Boolean).length + 1} align="center">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log.id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      {columnSettings.timestamp && <TableCell>{formatTimestamp(log.timestamp)}</TableCell>}
                      {columnSettings.adminEmail && <TableCell>{log.adminEmail}</TableCell>}
                      {columnSettings.adminRole && <TableCell>{log.adminRole}</TableCell>}
                      {columnSettings.action && <TableCell>{log.action}</TableCell>}
                      {columnSettings.resourceType && <TableCell>{log.resourceType || '-'}</TableCell>}
                      {columnSettings.resourceId && <TableCell>{log.resourceId || '-'}</TableCell>}
                      {columnSettings.severity && (
                        <TableCell>
                          <Chip 
                            label={log.severity || 'info'} 
                            color={severityColors[log.severity || 'info'] as any} 
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      )}
                      {columnSettings.details && (
                        <TableCell>
                          <Typography variant="body2">
                            {typeof log.details === 'object' 
                              ? JSON.stringify(log.details).substring(0, 50) + '...' 
                              : String(log.details || '').substring(0, 50) + '...'}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetails(log)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
        
        {/* Column Settings Dialog */}
        <Dialog open={columnDialogOpen} onClose={() => setColumnDialogOpen(false)}>
          <DialogTitle>Column Settings</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 250 }}>
              {Object.entries(columnSettings).map(([column, visible]) => (
                <Box 
                  key={column} 
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2">
                    {column.charAt(0).toUpperCase() + column.slice(1)}
                  </Typography>
                  <Tooltip title={visible ? 'Hide Column' : 'Show Column'}>
                    <IconButton 
                      size="small" 
                      onClick={() => setColumnSettings(prev => ({ ...prev, [column]: !prev[column as keyof typeof prev] }))}
                      color={visible ? 'primary' : 'default'}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setColumnDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Details Dialog */}
        <Dialog 
          open={detailsOpen} 
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Basic Information
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            ID:
                          </Typography>
                          <Typography variant="body2">{selectedLog.id}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Timestamp:
                          </Typography>
                          <Typography variant="body2">
                            {formatTimestamp(selectedLog.timestamp)}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Admin:
                          </Typography>
                          <Typography variant="body2">{selectedLog.adminEmail}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Role:
                          </Typography>
                          <Typography variant="body2">{selectedLog.adminRole}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Action Details
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Action:
                          </Typography>
                          <Typography variant="body2">{selectedLog.action}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Resource Type:
                          </Typography>
                          <Typography variant="body2">
                            {selectedLog.resourceType || '-'}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Resource ID:
                          </Typography>
                          <Typography variant="body2">
                            {selectedLog.resourceId || '-'}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Severity:
                          </Typography>
                          <Chip 
                            label={selectedLog.severity || 'info'} 
                            color={severityColors[selectedLog.severity || 'info'] as any} 
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Details</Typography>
                  <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {typeof selectedLog.details === 'object' 
                        ? JSON.stringify(selectedLog.details, null, 2) 
                        : String(selectedLog.details || '')}
                    </pre>
                  </Paper>
                </Box>
                
                {/* Change comparison if the log has before/after properties */}
                {selectedLog.details && typeof selectedLog.details === 'object' && selectedLog.details.before && selectedLog.details.after && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Changes</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="overline" display="block" gutterBottom>Before</Typography>
                          <pre style={{ 
                            margin: 0, 
                            backgroundColor: '#f5f5f5',
                            padding: 8,
                            borderRadius: 4,
                            maxHeight: 300,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {typeof selectedLog.details.before === 'object'
                              ? JSON.stringify(selectedLog.details.before, null, 2)
                              : String(selectedLog.details.before || '')}
                          </pre>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="overline" display="block" gutterBottom>After</Typography>
                          <pre style={{
                            margin: 0, 
                            backgroundColor: '#f5f5f5',
                            padding: 8,
                            borderRadius: 4,
                            maxHeight: 300,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {typeof selectedLog.details.after === 'object'
                              ? JSON.stringify(selectedLog.details.after, null, 2)
                              : String(selectedLog.details.after || '')}
                          </pre>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminGuard>
  );
} 