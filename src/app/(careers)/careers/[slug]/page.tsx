'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Button, 
  Chip, 
  TextField,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  Checkbox,
  Alert
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRouter } from 'next/navigation';
import FileUploader from '@/components/careers/FileUploader';
import { 
  JobListing, 
  JobType, 
  JobLocationType, 
  JobApplication, 
  ApplicationQuestion,
  QuestionType,
  ApplicationAnswer
} from '@/lib/careers/models';
import { firestore } from '@/lib/core/firebase/client';
import { collection, getDocs, query, where, Timestamp, addDoc } from 'firebase/firestore';

interface PageProps {
  params: {
    slug: string;
  };
}

export default function JobDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { slug } = params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobListing | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    resumeUrl: '',
    coverLetterUrl: '',
    portfolioUrl: '',
    linkedinUrl: '',
    message: '',
    answers: [] as ApplicationAnswer[]
  });
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    resumeUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch job details based on slug
    const fetchJobDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Create a query to get the job with the matching slug
        const jobsQuery = query(
          collection(firestore, 'jobListings'),
          where('slug', '==', slug),
          where('status', '==', 'published')
        );
        
        const querySnapshot = await getDocs(jobsQuery).catch(error => {
          console.error('Error fetching job details:', error);
          throw new Error('Failed to fetch job details. Error loading data: /api/careers/jobs/' + slug);
        });
        
        // Check if we found a matching job
        if (querySnapshot.empty) {
          setJob(null);
          setError('Job posting not found or has been removed');
          setIsLoading(false);
          return;
        }
        
        // Get the first matching document
        const jobDoc = querySnapshot.docs[0];
        const data = jobDoc.data();
        
        // Convert Firestore Timestamps to JavaScript Dates
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;
        const publishedAt = data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : data.publishedAt;
        const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : data.expiresAt;
        
        // Map the document data to our JobListing model
        const jobData: JobListing = {
          id: jobDoc.id,
          title: data.title || '',
          slug: data.slug || '',
          department: data.department || '',
          jobType: data.jobType || JobType.FULL_TIME,
          location: data.location || { type: JobLocationType.REMOTE, country: 'USA' },
          description: data.description || '',
          requirements: data.requirements || '',
          responsibilities: data.responsibilities || '',
          status: data.status || 'published',
          createdAt,
          updatedAt,
          publishedAt,
          expiresAt,
          featured: data.featured || false,
          salaryRange: data.salaryRange || { min: 0, max: 0, currency: 'USD', period: 'yearly', isVisible: false },
          benefits: data.benefits || [],
          skills: data.skills || [],
          hiringManager: data.hiringManager,
          teamSize: data.teamSize,
          teamDescription: data.teamDescription,
          applicationQuestions: data.applicationQuestions || [],
          applicationInstructions: data.applicationInstructions
        };
        
        setJob(jobData);
      } catch (error) {
        console.error('Error fetching job details:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred while loading job details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [slug]);
  
  const handleBackToJobs = () => {
    router.push('/careers');
  };
  
  const handleApplyNow = () => {
    setShowApplicationForm(true);
    
    // Smooth scroll to application form
    setTimeout(() => {
      document.getElementById('application-form')?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }, 100);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is updated
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      resumeUrl: ''
    };
    
    let isValid = true;
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    if (!formData.resumeUrl.trim()) {
      newErrors.resumeUrl = 'Resume is required';
      isValid = false;
    }
    
    setFormErrors(newErrors);
    return isValid;
  };
  
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !job) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Process custom question answers
      const answers = job.applicationQuestions?.map(question => {
        const answer = formData.answers.find(a => a.questionId === question.id);
        return {
          questionId: question.id,
          value: answer?.value || null
        };
      }) || [];
      
      // Create application object
      const application: Partial<JobApplication> = {
        jobId: job.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        resumeUrl: formData.resumeUrl,
        coverLetterUrl: formData.coverLetterUrl || undefined,
        portfolioUrl: formData.portfolioUrl || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        message: formData.message || undefined,
        answers: answers,
        status: 'new',
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      };
      
      // Save to Firestore
      await addDoc(collection(firestore, 'jobApplications'), application).catch(error => {
        console.error('Error submitting application:', error);
        throw new Error('Failed to submit application. Error saving data: /api/careers/applications');
      });
      
      setSubmitSuccess(true);
      
      // Scroll to success message
      setTimeout(() => {
        document.getElementById('success-message')?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 100);
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred while submitting your application');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAnswerChange = (questionId: string, value: string | string[] | boolean) => {
    setFormData(prev => {
      const updatedAnswers = [...prev.answers];
      const existingIndex = updatedAnswers.findIndex(a => a.questionId === questionId);
      
      if (existingIndex >= 0) {
        updatedAnswers[existingIndex] = { ...updatedAnswers[existingIndex], value };
      } else {
        updatedAnswers.push({ questionId, value });
      }
      
      return {
        ...prev,
        answers: updatedAnswers
      };
    });
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Job Not Found
          </Typography>
          <Typography variant="body1" paragraph>
            The job posting you're looking for doesn't exist or has been removed.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToJobs}
          >
            Back to Jobs
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Job Not Found
          </Typography>
          <Typography variant="body1" paragraph>
            The job posting you're looking for doesn't exist or has been removed.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToJobs}
          >
            Back to Jobs
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      {/* Job header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 6 }}>
        <Container maxWidth="lg">
          <Button
            variant="text"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToJobs}
            sx={{ mb: 2 }}
          >
            Back to Jobs
          </Button>
          
          <Typography variant="h3" component="h1" gutterBottom>
            {job.title}
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WorkIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body1">
                {job.jobType.replace('_', ' ')}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body1">
                {job.location.type === JobLocationType.REMOTE ? 'Remote' : 
                 job.location.type === JobLocationType.HYBRID ? `Hybrid - ${job.location.city || ''}, ${job.location.state || ''}` :
                 `${job.location.city || ''}, ${job.location.state || ''}`}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body1">
                Posted {job.publishedAt instanceof Date ? job.publishedAt.toLocaleDateString() : 'Recently'}
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleApplyNow}
            sx={{ mt: 2 }}
          >
            Apply Now
          </Button>
        </Container>
      </Box>
      
      {/* Job details */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* Left column */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 70%' } }}>
            {/* Description section */}
            <Paper sx={{ p: 4, mb: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {job.description}
              </Typography>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Responsibilities
                </Typography>
                <Typography 
                  variant="body1" 
                  component="div" 
                  sx={{ whiteSpace: 'pre-line' }}
                >
                  {job.responsibilities}
                </Typography>
              </Box>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Requirements
                </Typography>
                <Typography 
                  variant="body1" 
                  component="div" 
                  sx={{ whiteSpace: 'pre-line' }}
                >
                  {job.requirements}
                </Typography>
              </Box>
              
              {job.skills && job.skills.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {job.skills.map((skill, index) => (
                      <Chip 
                        key={index} 
                        label={skill.name} 
                        variant={skill.required ? "filled" : "outlined"}
                        color={skill.required ? "primary" : "default"}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
            
            {/* Team section */}
            {(job.teamDescription || job.hiringManager) && (
              <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Team
                </Typography>
                
                {job.teamDescription && (
                  <Typography variant="body1" paragraph>
                    {job.teamDescription}
                  </Typography>
                )}
                
                {job.hiringManager && (
                  <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ flex: '0 0 60px', height: 60, borderRadius: '50%', bgcolor: 'grey.200', mr: 2, overflow: 'hidden' }}>
                      {job.hiringManager.image && (
                        <Box 
                          component="img" 
                          src={job.hiringManager.image} 
                          alt={job.hiringManager.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {job.hiringManager.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {job.hiringManager.title}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            )}
            
            {/* Application form */}
            {!submitSuccess ? (
              <Paper sx={{ p: 4 }} id="application-form">
                <Typography variant="h5" component="h2" gutterBottom>
                  Apply for this Position
                </Typography>
                
                {!showApplicationForm ? (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleApplyNow}
                    sx={{ mt: 2 }}
                  >
                    Apply Now
                  </Button>
                ) : (
                  <Box component="form" onSubmit={handleSubmitApplication} noValidate>
                    <Stack spacing={3}>
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                          required
                          fullWidth
                          id="firstName"
                          name="firstName"
                          label="First Name"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          error={!!formErrors.firstName}
                          helperText={formErrors.firstName}
                        />
                        <TextField
                          required
                          fullWidth
                          id="lastName"
                          name="lastName"
                          label="Last Name"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          error={!!formErrors.lastName}
                          helperText={formErrors.lastName}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                          required
                          fullWidth
                          id="email"
                          name="email"
                          label="Email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          error={!!formErrors.email}
                          helperText={formErrors.email}
                        />
                        <TextField
                          fullWidth
                          id="phone"
                          name="phone"
                          label="Phone Number"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </Box>
                      
                      <FileUploader
                        label="Resume"
                        value={formData.resumeUrl}
                        onChange={(url) => setFormData(prev => ({ ...prev, resumeUrl: url }))}
                        onClear={() => setFormData(prev => ({ ...prev, resumeUrl: '' }))}
                        type="resume"
                        required
                      />
                      
                      <FileUploader
                        label="Cover Letter (Optional)"
                        value={formData.coverLetterUrl}
                        onChange={(url) => setFormData(prev => ({ ...prev, coverLetterUrl: url }))}
                        onClear={() => setFormData(prev => ({ ...prev, coverLetterUrl: '' }))}
                        type="coverLetter"
                      />
                      
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                          fullWidth
                          id="portfolioUrl"
                          name="portfolioUrl"
                          label="Portfolio URL (Optional)"
                          placeholder="Link to your portfolio"
                          value={formData.portfolioUrl}
                          onChange={handleInputChange}
                        />
                        <TextField
                          fullWidth
                          id="linkedinUrl"
                          name="linkedinUrl"
                          label="LinkedIn URL (Optional)"
                          placeholder="Link to your LinkedIn profile"
                          value={formData.linkedinUrl}
                          onChange={handleInputChange}
                        />
                      </Box>
                      
                      <TextField
                        fullWidth
                        id="message"
                        name="message"
                        label="Additional Information (Optional)"
                        multiline
                        rows={4}
                        value={formData.message}
                        onChange={handleInputChange}
                      />
                      
                      {/* Custom application questions */}
                      {job.applicationQuestions && job.applicationQuestions.length > 0 && (
                        <Box>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="h6" gutterBottom>
                            Additional Questions
                          </Typography>
                          
                          <Stack spacing={3}>
                            {job.applicationQuestions.map((question) => (
                              <Box key={question.id}>
                                {question.type === QuestionType.TEXT && (
                                  <TextField
                                    fullWidth
                                    id={question.id}
                                    label={question.label + (question.required ? ' *' : '')}
                                    required={question.required}
                                    placeholder={question.placeholder}
                                    helperText={question.helpText}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                  />
                                )}
                                
                                {question.type === QuestionType.TEXTAREA && (
                                  <TextField
                                    fullWidth
                                    id={question.id}
                                    label={question.label + (question.required ? ' *' : '')}
                                    required={question.required}
                                    placeholder={question.placeholder}
                                    helperText={question.helpText}
                                    multiline
                                    rows={4}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                  />
                                )}
                                
                                {question.type === QuestionType.SELECT && question.options && (
                                  <FormControl fullWidth required={question.required}>
                                    <InputLabel id={`${question.id}-label`}>{question.label}</InputLabel>
                                    <Select
                                      labelId={`${question.id}-label`}
                                      id={question.id}
                                      label={question.label}
                                      onChange={(e) => handleAnswerChange(question.id, e.target.value as string)}
                                    >
                                      {question.options.map((option) => (
                                        <MenuItem key={option} value={option}>
                                          {option}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                    {question.helpText && (
                                      <FormHelperText>{question.helpText}</FormHelperText>
                                    )}
                                  </FormControl>
                                )}
                                
                                {question.type === QuestionType.RADIO && question.options && (
                                  <FormControl component="fieldset" required={question.required}>
                                    <FormLabel component="legend">{question.label}</FormLabel>
                                    <RadioGroup
                                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    >
                                      {question.options.map((option) => (
                                        <FormControlLabel 
                                          key={option} 
                                          value={option} 
                                          control={<Radio />} 
                                          label={option} 
                                        />
                                      ))}
                                    </RadioGroup>
                                    {question.helpText && (
                                      <FormHelperText>{question.helpText}</FormHelperText>
                                    )}
                                  </FormControl>
                                )}
                                
                                {question.type === QuestionType.MULTISELECT && question.options && (
                                  <FormControl component="fieldset" required={question.required}>
                                    <FormLabel component="legend">{question.label}</FormLabel>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                      {question.options.map((option) => {
                                        // Type assertion to ensure we have string array
                                        const currentAnswers = 
                                          ((formData.answers.find(a => a.questionId === question.id)?.value || []) as string[]);
                                        
                                        return (
                                          <FormControlLabel
                                            key={option}
                                            control={
                                              <Checkbox 
                                                checked={currentAnswers.includes(option)}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    handleAnswerChange(question.id, [...currentAnswers, option]);
                                                  } else {
                                                    handleAnswerChange(
                                                      question.id, 
                                                      currentAnswers.filter(item => item !== option)
                                                    );
                                                  }
                                                }}
                                              />
                                            }
                                            label={option}
                                          />
                                        );
                                      })}
                                    </Box>
                                    {question.helpText && (
                                      <FormHelperText>{question.helpText}</FormHelperText>
                                    )}
                                  </FormControl>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                      
                      {submitError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {submitError}
                        </Alert>
                      )}
                      
                      <Box sx={{ mt: 2 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          size="large"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <CircularProgress size={24} sx={{ mr: 1 }} />
                              Submitting...
                            </>
                          ) : 'Submit Application'}
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </Paper>
            ) : (
              <Paper sx={{ p: 4 }} id="success-message">
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Application Submitted Successfully!
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Thank you for your interest in the {job.title} position at IriSync. We've received your application and will review it soon.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    If your qualifications match our requirements, our hiring team will contact you for the next steps.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleBackToJobs}
                    sx={{ mt: 2 }}
                  >
                    Back to Jobs
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
          
          {/* Right column (sidebar) */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
            {/* Job details */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Job Details
              </Typography>
              <List disablePadding>
                <ListItem disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <WorkIcon color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Job Type"
                    secondary={job.jobType.replace('_', ' ')}
                  />
                </ListItem>
                <Divider />
                <ListItem disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <LocationOnIcon color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Location"
                    secondary={
                      job.location.type === JobLocationType.REMOTE ? 'Remote' : 
                      job.location.type === JobLocationType.HYBRID ? `Hybrid - ${job.location.city || ''}, ${job.location.state || ''}` :
                      `${job.location.city || ''}, ${job.location.state || ''}`
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CalendarTodayIcon color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Posted"
                    secondary={job.publishedAt instanceof Date ? job.publishedAt.toLocaleDateString() : 'Recently'}
                  />
                </ListItem>
                {job.department && (
                  <>
                    <Divider />
                    <ListItem disableGutters sx={{ py: 1 }}>
                      <ListItemText
                        primary="Department"
                        secondary={job.department}
                      />
                    </ListItem>
                  </>
                )}
                {job.salaryRange?.isVisible && (
                  <>
                    <Divider />
                    <ListItem disableGutters sx={{ py: 1 }}>
                      <ListItemText
                        primary="Salary Range"
                        secondary={`$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()} ${job.salaryRange.period}`}
                      />
                    </ListItem>
                  </>
                )}
              </List>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleApplyNow}
                sx={{ mt: 3 }}
              >
                Apply Now
              </Button>
            </Paper>
            
            {/* Company benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Benefits
                </Typography>
                <List disablePadding>
                  {job.benefits.map((benefit, index) => (
                    <React.Fragment key={benefit.title}>
                      {index > 0 && <Divider />}
                      <ListItem 
                        disableGutters 
                        sx={{ py: 1.5 }}
                      >
                        <ListItemText
                          primary={benefit.title}
                          secondary={benefit.description}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </Box>
      </Container>
    </>
  );
} 