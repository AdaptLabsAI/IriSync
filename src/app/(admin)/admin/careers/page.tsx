'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Tabs, 
  Tab, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/admin/AdminGuard';
import { JobListing, JobType, JobLocationType, JobApplication } from '@/lib/features/careers/models';
import useApi from '@/hooks/useApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`careers-tabpanel-${index}`}
      aria-labelledby={`careers-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `careers-tab-${index}`,
    'aria-controls': `careers-tabpanel-${index}`,
  };
}

interface CareersData {
  jobListings: JobListing[];
  applications: JobApplication[];
}

export default function AdminCareersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // API hook for fetching careers data
  const {
    data: careersData,
    isLoading,
    error,
    refetch,
    delete: deleteJob
  } = useApi<CareersData>('/api/admin/careers', {
    params: {
      includeApplications: true
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleCreateJob = () => {
    router.push('/careers/create');
  };
  
  const handleJobActionClick = (event: React.MouseEvent<HTMLElement>, jobId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedJobId(jobId);
  };
  
  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setSelectedJobId(null);
  };
  
  const handleEditJob = () => {
    if (selectedJobId) {
      router.push(`/careers/edit/${selectedJobId}`);
    }
    handleActionMenuClose();
  };
  
  const handleViewJob = () => {
    if (selectedJobId && careersData?.jobListings) {
      const job = careersData.jobListings.find(job => job.id === selectedJobId);
      if (job) {
        window.open(`/careers/${job.slug}`, '_blank');
      }
    }
    handleActionMenuClose();
  };
  
  const handleDeleteJob = async () => {
    if (selectedJobId) {
      try {
        await deleteJob({ url: `/api/admin/careers/jobs/${selectedJobId}` });
        refetch();
      } catch (error) {
        console.error("Error deleting job listing:", error);
      }
    }
    handleActionMenuClose();
  };
  
  // Filter job listings based on search query
  const filteredJobs = careersData?.jobListings 
    ? careersData.jobListings.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  // Filter applications based on search query
  const filteredApplications = careersData?.applications 
    ? careersData.applications.filter(app => 
        app.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  // Find job title by id
  const getJobTitleById = (jobId: string) => {
    if (!careersData?.jobListings) return 'Unknown Position';
    const job = careersData.jobListings.find(j => j.id === jobId);
    return job ? job.title : 'Unknown Position';
  };
  
  // Get status chip color
  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'error';
      case 'new':
        return 'info';
      case 'reviewing':
        return 'warning';
      case 'interviewing':
        return 'primary';
      case 'rejected':
        return 'error';
      case 'hired':
        return 'success';
      default:
        return 'default';
    }
  };

  // Format date safely handling both string dates and Firestore Timestamps
  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Not available';
    
    try {
      // Handle Firestore Timestamp objects
      if (typeof dateValue === 'object' && dateValue !== null) {
        // Check if it's a Firestore Timestamp with toDate method
        if ('toDate' in dateValue && typeof dateValue.toDate === 'function') {
          return dateValue.toDate().toLocaleDateString();
        }
        
        // Check if it's a standard Date object
        if (dateValue instanceof Date) {
          return dateValue.toLocaleDateString();
        }
        
        // Handle objects with seconds and nanoseconds (Firestore Timestamp format)
        if ('seconds' in dateValue && 'nanoseconds' in dateValue) {
          const milliseconds = dateValue.seconds * 1000;
          return new Date(milliseconds).toLocaleDateString();
        }
      }
      
      // Handle string dates
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString();
      }
      
      // Handle numeric timestamps
      if (typeof dateValue === 'number') {
        return new Date(dateValue).toLocaleDateString();
      }
      
      return 'Invalid date format';
    } catch (err) {
      console.error('Error formatting date:', err, dateValue);
      return 'Invalid date';
    }
  };

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">Careers Management</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Manage job listings and applications
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading careers data: {error.message || 'Failed to load data'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/admin/careers
          </Typography>
          <Button 
            size="small" 
            color="inherit" 
            onClick={() => refetch()}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      )}
      
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="careers tabs"
          >
            <Tab label="Job Listings" {...a11yProps(0)} />
            <Tab label="Applications" {...a11yProps(1)} />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <TextField
              placeholder="Search job listings..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateJob}
            >
              Create Job Listing
            </Button>
          </Box>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="error">
                Failed to load job listings
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => refetch()}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            </Box>
          ) : filteredJobs.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6">
                No job listings found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                {searchQuery ? 'Try adjusting your search query' : 'Create your first job listing to get started'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateJob}
                  sx={{ mt: 2 }}
                >
                  Create Job Listing
                </Button>
              )}
            </Paper>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Applications</TableCell>
                    <TableCell>Published</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const jobApplications = careersData?.applications?.filter(app => app.jobId === job.id) || [];
                    
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="medium">
                            {job.title}
                          </Typography>
                          {job.featured && (
                            <Chip 
                              label="Featured" 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                              sx={{ ml: 1 }} 
                            />
                          )}
                        </TableCell>
                        <TableCell>{job.department}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <WorkIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {job.jobType.replace('_', ' ')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationOnIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {job.location.type === JobLocationType.REMOTE ? 'Remote' : 
                               job.location.type === JobLocationType.HYBRID ? `Hybrid` :
                               job.location.city}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={job.status.charAt(0).toUpperCase() + job.status.slice(1)} 
                            size="small" 
                            color={getStatusChipColor(job.status) as any} 
                          />
                        </TableCell>
                        <TableCell>{jobApplications.length}</TableCell>
                        <TableCell>{formatDate(job.publishedAt)}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label="more"
                            onClick={(e) => handleJobActionClick(e, job.id)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <TextField
              placeholder="Search applications..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
          </Box>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="error">
                Failed to load applications
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => refetch()}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            </Box>
          ) : filteredApplications.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6">
                No applications found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                {searchQuery ? 'Try adjusting your search query' : 'Applications will appear here when candidates apply for your jobs'}
              </Typography>
            </Paper>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Position</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Applied On</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <Typography variant="body1">
                          {`${application.firstName} ${application.lastName}`}
                        </Typography>
                      </TableCell>
                      <TableCell>{application.email}</TableCell>
                      <TableCell>{getJobTitleById(application.jobId)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={application.status.charAt(0).toUpperCase() + application.status.slice(1)} 
                          size="small" 
                          color={getStatusChipColor(application.status) as any} 
                        />
                      </TableCell>
                      <TableCell>{formatDate(application.createdAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="view application"
                          onClick={() => {
                            router.push(`/careers/applications/${application.id}`);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          aria-label="edit application status"
                          onClick={() => {
                            router.push(`/careers/applications/${application.id}/edit`);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>
      
      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={handleViewJob}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Job
        </MenuItem>
        <MenuItem onClick={handleEditJob}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Job
        </MenuItem>
        <MenuItem onClick={handleDeleteJob} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Job
        </MenuItem>
      </Menu>
    </AdminGuard>
  );
} 