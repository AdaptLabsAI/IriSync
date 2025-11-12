'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Button, 
  TextField,
  Stack, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Link as MuiLink,
  Card,
  CardContent,
  SelectChangeEvent,
  Skeleton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import EmailIcon from '@mui/icons-material/Email';
import RejectIcon from '@mui/icons-material/Cancel';
import InterviewIcon from '@mui/icons-material/VideoCall';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/admin/AdminGuard';
import { JobApplication, JobListing } from '@/lib/features/careers/models';

interface PageProps {
  params: {
    id: string;
  };
}

interface ApplicationData extends JobApplication {
  jobTitle?: string;
}

export default function ApplicationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [jobDetails, setJobDetails] = useState<JobListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplicationData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch application details
        const appResponse = await fetch(`/api/careers/applications/${id}`);
        if (!appResponse.ok) {
          throw new Error('Failed to fetch application data');
        }

        const appData = await appResponse.json();
        setApplication(appData);
        setStatus(appData.status || 'new');
        setNotes(appData.notes || '');
        setRating(appData.rating || '');

        // Fetch job details if jobId exists
        if (appData.jobId) {
          try {
            const jobResponse = await fetch(`/api/careers/jobs/${appData.jobId}`);
            if (jobResponse.ok) {
              const jobData = await jobResponse.json();
              setJobDetails(jobData);
            }
          } catch (jobError) {
            console.warn('Could not fetch job details:', jobError);
            // Don't fail the whole page if job details can't be loaded
          }
        }
      } catch (error) {
        console.error('Error fetching application data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load application data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicationData();
  }, [id]);

  const handleStatusChange = (e: SelectChangeEvent) => {
    setStatus(e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRating(value === '' ? '' : Number(value));
  };

  const handleUpdateApplication = async () => {
    if (!application) return;

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/careers/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes,
          rating: rating === '' ? null : rating
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update application');
      }

      const updatedApplication = await response.json();
      setApplication(updatedApplication);
      setSuccess('Application updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Error updating application:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendRejectionEmail = async () => {
    if (!application || !jobDetails) return;

    setIsEmailing(true);
    setError(null);
    setEmailSuccess(null);

    try {
      const response = await fetch('/api/careers/applications/actions/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: application.id,
          reason: null // Can be customized later
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send rejection email');
      }

      // Update application status to rejected
      setStatus('rejected');
      setEmailSuccess('Rejection email sent successfully!');

      // Clear success message after 5 seconds
      setTimeout(() => setEmailSuccess(null), 5000);

    } catch (error) {
      console.error('Error sending rejection email:', error);
      setError(error instanceof Error ? error.message : 'Failed to send rejection email');
    } finally {
      setIsEmailing(false);
    }
  };

  const handleSendInterviewEmail = async () => {
    if (!application || !jobDetails) return;

    setIsEmailing(true);
    setError(null);
    setEmailSuccess(null);

    try {
      const response = await fetch('/api/careers/applications/actions/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: application.id,
          interviewDetails: {
            interviewType: 'video',
            duration: '1 hour',
            message: 'We look forward to discussing this opportunity with you.',
            calendarLink: process.env.NEXT_PUBLIC_CALENDAR_LINK // Optional Calendly link
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send interview email');
      }

      // Update application status to interviewing
      setStatus('interviewing');
      setEmailSuccess('Interview invitation sent successfully!');

      // Clear success message after 5 seconds
      setTimeout(() => setEmailSuccess(null), 5000);

    } catch (error) {
      console.error('Error sending interview email:', error);
      setError(error instanceof Error ? error.message : 'Failed to send interview email');
    } finally {
      setIsEmailing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'info';
      case 'reviewing':
        return 'warning';
      case 'interviewing':
        return 'primary';
      case 'hired':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Not available';
    
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch (err) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Container>
      </AdminGuard>
    );
  }

  if (error && !application) {
    return (
      <AdminGuard>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Application Not Found
            </Typography>
            <Typography variant="body1" paragraph>
              The application could not be loaded. It may have been deleted or you may not have permission to view it.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => router.push('/admin/careers')}
            >
              Back to Careers Management
            </Button>
          </Paper>
        </Container>
      </AdminGuard>
    );
  }

  if (!application) {
    return <AdminGuard><Container><CircularProgress /></Container></AdminGuard>;
  }

  return (
    <AdminGuard>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/careers')}
            sx={{ mb: 2 }}
          >
            Back to Careers Management
          </Button>
          <Typography variant="h4" component="h1">
            Application Details
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and manage this job application
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {emailSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {emailSuccess}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Main Content */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 70%' } }}>
            {/* Applicant Information */}
            <Paper sx={{ p: 4, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {`${application.firstName} ${application.lastName}`}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Applied for: {jobDetails?.title || 'Position not found'}
                  </Typography>
                </Box>
                <Chip 
                  label={status.charAt(0).toUpperCase() + status.slice(1)} 
                  color={getStatusColor(status) as any}
                  size="medium"
                />
              </Box>

              <List>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon>
                    <EmailIcon color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email" 
                    secondary={
                      <MuiLink href={`mailto:${application.email}`} color="primary">
                        {application.email}
                      </MuiLink>
                    } 
                  />
                </ListItem>

                {application.phone && (
                  <ListItem disablePadding sx={{ mb: 1 }}>
                    <ListItemIcon>
                      <PhoneIcon color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Phone" 
                      secondary={
                        <MuiLink href={`tel:${application.phone}`} color="primary">
                          {application.phone}
                        </MuiLink>
                      } 
                    />
                  </ListItem>
                )}

                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon>
                    <CalendarTodayIcon color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Applied" 
                    secondary={formatDate(application.createdAt)} 
                  />
                </ListItem>
              </List>
            </Paper>

            {/* Documents & Links */}
            <Paper sx={{ p: 4, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Documents & Links
              </Typography>
              <List>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon>
                    <DescriptionIcon color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Resume" 
                    secondary={
                      <MuiLink href={application.resumeUrl} target="_blank" rel="noopener" color="primary">
                        View Resume
                      </MuiLink>
                    } 
                  />
                </ListItem>

                {application.coverLetterUrl && (
                  <ListItem disablePadding sx={{ mb: 1 }}>
                    <ListItemIcon>
                      <DescriptionIcon color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Cover Letter" 
                      secondary={
                        <MuiLink href={application.coverLetterUrl} target="_blank" rel="noopener" color="primary">
                          View Cover Letter
                        </MuiLink>
                      } 
                    />
                  </ListItem>
                )}

                {application.portfolioUrl && (
                  <ListItem disablePadding sx={{ mb: 1 }}>
                    <ListItemIcon>
                      <LinkIcon color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Portfolio" 
                      secondary={
                        <MuiLink href={application.portfolioUrl} target="_blank" rel="noopener" color="primary">
                          View Portfolio
                        </MuiLink>
                      } 
                    />
                  </ListItem>
                )}

                {application.linkedinUrl && (
                  <ListItem disablePadding sx={{ mb: 1 }}>
                    <ListItemIcon>
                      <LinkIcon color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="LinkedIn" 
                      secondary={
                        <MuiLink href={application.linkedinUrl} target="_blank" rel="noopener" color="primary">
                          View LinkedIn Profile
                        </MuiLink>
                      } 
                    />
                  </ListItem>
                )}
              </List>
            </Paper>

            {/* Application Message */}
            {application.message && (
              <Paper sx={{ p: 4, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Applicant Message
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {application.message}
                </Typography>
              </Paper>
            )}

            {/* Custom Application Answers */}
            {application.answers && application.answers.length > 0 && (
              <Paper sx={{ p: 4, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Application Responses
                </Typography>
                <Stack spacing={3}>
                  {application.answers.map((answer, index) => {
                    // Find the corresponding question from job details
                    const question = jobDetails?.applicationQuestions?.find(q => q.id === answer.questionId);
                    
                    return (
                      <Box key={index} sx={{ borderBottom: '1px solid #e0e0e0', pb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {question?.label || `Question ${index + 1}`}
                          {question?.required && <span style={{ color: '#d32f2f' }}> *</span>}
                        </Typography>
                        
                        {question?.helpText && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {question.helpText}
                          </Typography>
                        )}
                        
                        <Typography variant="body1" sx={{ 
                          p: 2, 
                          bgcolor: 'grey.50', 
                          borderRadius: 1,
                          whiteSpace: 'pre-wrap' 
                        }}>
                          {typeof answer.value === 'string' ? answer.value :
                           Array.isArray(answer.value) ? answer.value.join(', ') :
                           answer.value === null ? 'No response' :
                           String(answer.value)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            )}
          </Box>

          {/* Sidebar */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
            {/* Job Information */}
            {jobDetails && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Position Details
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>{jobDetails.title}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {jobDetails.department}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {jobDetails.jobType.replace('_', ' ')} • {jobDetails.location.type}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => window.open(`/careers/${jobDetails.slug}`, '_blank')}
                  >
                    View Job Posting
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Application Management */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Application Management
              </Typography>
              
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={handleStatusChange}
                  >
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="reviewing">Reviewing</MenuItem>
                    <MenuItem value="interviewing">Interviewing</MenuItem>
                    <MenuItem value="hired">Hired</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Rating (1-5)"
                  type="number"
                  inputProps={{ min: 1, max: 5 }}
                  value={rating}
                  onChange={handleRatingChange}
                  placeholder="Optional rating"
                  fullWidth
                />

                <TextField
                  label="Internal Notes"
                  multiline
                  rows={4}
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Add internal notes about this application..."
                  fullWidth
                />

                <Button
                  variant="contained"
                  onClick={handleUpdateApplication}
                  disabled={isUpdating}
                  startIcon={isUpdating ? <CircularProgress size={20} /> : <SaveIcon />}
                  fullWidth
                >
                  {isUpdating ? 'Updating...' : 'Update Application'}
                </Button>

                <Divider sx={{ my: 2 }} />

                {/* Email Actions */}
                <Typography variant="subtitle2" gutterBottom>
                  Email Actions
                </Typography>
                
                <Stack spacing={2}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleSendRejectionEmail}
                    disabled={isEmailing || status === 'rejected'}
                    startIcon={isEmailing ? <CircularProgress size={20} /> : <RejectIcon />}
                    fullWidth
                  >
                    {isEmailing ? 'Sending...' : 'Send Rejection Email'}
                  </Button>

                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleSendInterviewEmail}
                    disabled={isEmailing || status === 'interviewing' || status === 'hired' || status === 'rejected'}
                    startIcon={isEmailing ? <CircularProgress size={20} /> : <InterviewIcon />}
                    fullWidth
                  >
                    {isEmailing ? 'Sending...' : 'Send Interview Invitation'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Container>
    </AdminGuard>
  );
} 