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
  FormControlLabel,
  Checkbox,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SelectChangeEvent,
  Skeleton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/admin/AdminGuard';
import { JobType, JobLocationType, JobListing, ApplicationQuestion, QuestionType } from '@/lib/careers/models';

interface JobFormData {
  title: string;
  department: string;
  jobType: JobType;
  location: {
    type: JobLocationType;
    city?: string;
    state?: string;
    country: string;
  };
  description: string;
  requirements: string;
  responsibilities: string;
  salaryRange: {
    min: number | '';
    max: number | '';
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
    isVisible: boolean;
  };
  benefits: Array<{
    title: string;
    description: string;
  }>;
  skills: Array<{
    name: string;
    required: boolean;
  }>;
  featured: boolean;
  applicationInstructions?: string;
  status: 'draft' | 'published' | 'archived';
  posterEmail: string;
  posterName?: string;
  applicationQuestions: ApplicationQuestion[];
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditJobPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [formData, setFormData] = useState<JobFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchJobData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/careers/jobs/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job data');
        }

        const job = await response.json();
        
        // Transform the job data to match our form structure
        setFormData({
          title: job.title || '',
          department: job.department || '',
          jobType: job.jobType || JobType.FULL_TIME,
          location: {
            type: job.location?.type || JobLocationType.REMOTE,
            city: job.location?.city || '',
            state: job.location?.state || '',
            country: job.location?.country || 'USA'
          },
          description: job.description || '',
          requirements: job.requirements || '',
          responsibilities: job.responsibilities || '',
          salaryRange: {
            min: job.salaryRange?.min || '',
            max: job.salaryRange?.max || '',
            currency: job.salaryRange?.currency || 'USD',
            period: job.salaryRange?.period || 'yearly',
            isVisible: job.salaryRange?.isVisible || false
          },
          benefits: job.benefits || [],
          skills: job.skills || [],
          featured: job.featured || false,
          applicationInstructions: job.applicationInstructions || '',
          status: job.status || 'draft',
          posterEmail: job.posterEmail || '',
          posterName: job.posterName || '',
          applicationQuestions: job.applicationQuestions || []
        });
      } catch (error) {
        console.error('Error fetching job data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load job data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobData();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => prev ? {
        ...prev,
        [parent]: {
          ...(prev[parent as keyof JobFormData] as any),
          [child]: type === 'checkbox' ? checked : value
        }
      } : null);
    } else {
      setFormData(prev => prev ? {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      } : null);
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    if (!formData) return;
    
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => prev ? {
        ...prev,
        [parent]: {
          ...(prev[parent as keyof JobFormData] as any),
          [child]: value
        }
      } : null);
    } else {
      setFormData(prev => prev ? {
        ...prev,
        [name]: value
      } : null);
    }
  };

  const addBenefit = () => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      benefits: [...prev.benefits, { title: '', description: '' }]
    } : null);
  };

  const removeBenefit = (index: number) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    } : null);
  };

  const updateBenefit = (index: number, field: 'title' | 'description', value: string) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      benefits: prev.benefits.map((benefit, i) => 
        i === index ? { ...benefit, [field]: value } : benefit
      )
    } : null);
  };

  const addSkill = () => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      skills: [...prev.skills, { name: '', required: true }]
    } : null);
  };

  const removeSkill = (index: number) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    } : null);
  };

  const updateSkill = (index: number, field: 'name' | 'required', value: string | boolean) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      skills: prev.skills.map((skill, i) => 
        i === index ? { ...skill, [field]: value } : skill
      )
    } : null);
  };

  const addApplicationQuestion = () => {
    if (!formData) return;
    const newQuestion: ApplicationQuestion = {
      id: `question_${Date.now()}`,
      label: '',
      type: QuestionType.TEXT,
      required: false,
      placeholder: '',
      helpText: '',
      options: []
    };
    
    setFormData(prev => prev ? {
      ...prev,
      applicationQuestions: [...prev.applicationQuestions, newQuestion]
    } : null);
  };

  const removeApplicationQuestion = (index: number) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      applicationQuestions: prev.applicationQuestions.filter((_, i) => i !== index)
    } : null);
  };

  const updateApplicationQuestion = (index: number, field: keyof ApplicationQuestion, value: any) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      applicationQuestions: prev.applicationQuestions.map((question, i) => 
        i === index ? { ...question, [field]: value } : question
      )
    } : null);
  };

  const addQuestionOption = (questionIndex: number) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      applicationQuestions: prev.applicationQuestions.map((question, i) => 
        i === questionIndex ? { 
          ...question, 
          options: [...(question.options || []), ''] 
        } : question
      )
    } : null);
  };

  const removeQuestionOption = (questionIndex: number, optionIndex: number) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      applicationQuestions: prev.applicationQuestions.map((question, i) => 
        i === questionIndex ? { 
          ...question, 
          options: question.options?.filter((_, oi) => oi !== optionIndex) || []
        } : question
      )
    } : null);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      applicationQuestions: prev.applicationQuestions.map((question, i) => 
        i === questionIndex ? { 
          ...question, 
          options: question.options?.map((option, oi) => 
            oi === optionIndex ? value : option
          ) || []
        } : question
      )
    } : null);
  };

  const validateForm = () => {
    if (!formData) return 'Form data not loaded';
    if (!formData.title.trim()) return 'Job title is required';
    if (!formData.department.trim()) return 'Department is required';
    if (!formData.description.trim()) return 'Job description is required';
    if (!formData.requirements.trim()) return 'Requirements are required';
    if (!formData.responsibilities.trim()) return 'Responsibilities are required';
    if (!formData.posterEmail.trim()) return 'Your email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.posterEmail)) return 'Please enter a valid email address';
    return null;
  };

  const handleSubmit = async (newStatus?: 'draft' | 'published' | 'archived') => {
    if (!formData) return;
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/careers/jobs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          status: newStatus || formData.status,
          // Convert empty string numbers to actual numbers or null
          salaryRange: {
            ...formData.salaryRange,
            min: formData.salaryRange.min === '' ? null : Number(formData.salaryRange.min),
            max: formData.salaryRange.max === '' ? null : Number(formData.salaryRange.max)
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update job listing');
      }

      const updatedJob = await response.json();
      setSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        if (newStatus === 'published') {
          router.push(`/careers/${updatedJob.slug}`);
        } else {
          router.push('/admin/careers');
        }
      }, 2000);

    } catch (error) {
      console.error('Error updating job:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = () => handleSubmit();
  const handlePublish = () => handleSubmit('published');
  const handleArchive = () => handleSubmit('archived');

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

  if (error && !formData) {
    return (
      <AdminGuard>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Failed to Load Job
            </Typography>
            <Typography variant="body1" paragraph>
              The job listing could not be loaded. It may have been deleted or you may not have permission to edit it.
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

  if (success) {
    return (
      <AdminGuard>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="success.main">
              Job Listing Updated Successfully!
            </Typography>
            <Typography variant="body1" paragraph>
              Your changes have been saved and will be reflected shortly.
            </Typography>
            <CircularProgress size={24} />
          </Paper>
        </Container>
      </AdminGuard>
    );
  }

  if (!formData) {
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
            Edit Job Listing
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Update the details for: <strong>{formData.title}</strong>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* Status Indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">Current Status:</Typography>
              <FormControl size="small">
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleSelectChange}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider />

            {/* Basic Information */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Stack spacing={3}>
                <TextField
                  required
                  fullWidth
                  label="Job Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Senior Software Engineer"
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    required
                    fullWidth
                    label="Department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="e.g. Engineering"
                  />

                  <FormControl fullWidth required>
                    <InputLabel>Job Type</InputLabel>
                    <Select
                      name="jobType"
                      value={formData.jobType}
                      label="Job Type"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value={JobType.FULL_TIME}>Full Time</MenuItem>
                      <MenuItem value={JobType.PART_TIME}>Part Time</MenuItem>
                      <MenuItem value={JobType.CONTRACT}>Contract</MenuItem>
                      <MenuItem value={JobType.INTERNSHIP}>Internship</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      name="featured"
                      checked={formData.featured}
                      onChange={handleInputChange}
                    />
                  }
                  label="Featured Position (appears at top of listings)"
                />
              </Stack>
            </Box>

            <Divider />

            {/* Poster Information */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                This information is used for application notifications and is hidden from public view
              </Typography>
              <Stack spacing={3}>
                <TextField
                  required
                  fullWidth
                  label="Your Email Address"
                  name="posterEmail"
                  type="email"
                  value={formData.posterEmail}
                  onChange={handleInputChange}
                  placeholder="email@company.com"
                  helperText="Applications will be automatically sent to this email"
                />

                <TextField
                  fullWidth
                  label="Your Name (Optional)"
                  name="posterName"
                  value={formData.posterName}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  helperText="Used in application notification emails"
                />
              </Stack>
            </Box>

            <Divider />

            {/* Location */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Location
              </Typography>
              <Stack spacing={3}>
                <FormControl fullWidth required>
                  <InputLabel>Location Type</InputLabel>
                  <Select
                    name="location.type"
                    value={formData.location.type}
                    label="Location Type"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value={JobLocationType.REMOTE}>Remote</MenuItem>
                    <MenuItem value={JobLocationType.HYBRID}>Hybrid</MenuItem>
                    <MenuItem value={JobLocationType.ONSITE}>On-site</MenuItem>
                  </Select>
                </FormControl>

                {(formData.location.type === JobLocationType.HYBRID || 
                  formData.location.type === JobLocationType.ONSITE) && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="City"
                      name="location.city"
                      value={formData.location.city || ''}
                      onChange={handleInputChange}
                    />
                    <TextField
                      fullWidth
                      label="State"
                      name="location.state"
                      value={formData.location.state || ''}
                      onChange={handleInputChange}
                    />
                    <TextField
                      fullWidth
                      label="Country"
                      name="location.country"
                      value={formData.location.country}
                      onChange={handleInputChange}
                    />
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Job Details */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Job Details
              </Typography>
              <Stack spacing={3}>
                <TextField
                  required
                  fullWidth
                  multiline
                  rows={4}
                  label="Job Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the role, what the candidate will be doing, and what makes this opportunity exciting..."
                />

                <TextField
                  required
                  fullWidth
                  multiline
                  rows={4}
                  label="Requirements"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="List the required qualifications, experience, and skills..."
                />

                <TextField
                  required
                  fullWidth
                  multiline
                  rows={4}
                  label="Responsibilities"
                  name="responsibilities"
                  value={formData.responsibilities}
                  onChange={handleInputChange}
                  placeholder="Outline the key responsibilities and day-to-day tasks..."
                />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Application Instructions (Optional)"
                  name="applicationInstructions"
                  value={formData.applicationInstructions}
                  onChange={handleInputChange}
                  placeholder="Any specific instructions for applicants..."
                />
              </Stack>
            </Box>

            <Divider />

            {/* Salary Range */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Salary Information
              </Typography>
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="salaryRange.isVisible"
                      checked={formData.salaryRange.isVisible}
                      onChange={handleInputChange}
                    />
                  }
                  label="Show salary range publicly"
                />

                {formData.salaryRange.isVisible && (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="Min Salary"
                      name="salaryRange.min"
                      type="number"
                      value={formData.salaryRange.min}
                      onChange={handleInputChange}
                      sx={{ flex: 1 }}
                    />
                    <Typography>to</Typography>
                    <TextField
                      label="Max Salary"
                      name="salaryRange.max"
                      type="number"
                      value={formData.salaryRange.max}
                      onChange={handleInputChange}
                      sx={{ flex: 1 }}
                    />
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        name="salaryRange.currency"
                        value={formData.salaryRange.currency}
                        label="Currency"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Period</InputLabel>
                      <Select
                        name="salaryRange.period"
                        value={formData.salaryRange.period}
                        label="Period"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="hourly">Hourly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="yearly">Yearly</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Skills */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Skills & Requirements</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">Required and preferred skills</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addSkill}
                      variant="outlined"
                      size="small"
                    >
                      Add Skill
                    </Button>
                  </Box>
                  
                  {formData.skills.map((skill, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        label="Skill"
                        value={skill.name}
                        onChange={(e) => updateSkill(index, 'name', e.target.value)}
                        placeholder="e.g. React, Node.js, Python"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={skill.required}
                            onChange={(e) => updateSkill(index, 'required', e.target.checked)}
                          />
                        }
                        label="Required"
                      />
                      <IconButton onClick={() => removeSkill(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Benefits */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Benefits & Perks</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">Company benefits and perks</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addBenefit}
                      variant="outlined"
                      size="small"
                    >
                      Add Benefit
                    </Button>
                  </Box>
                  
                  {formData.benefits.map((benefit, index) => (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <TextField
                            fullWidth
                            label="Benefit Title"
                            value={benefit.title}
                            onChange={(e) => updateBenefit(index, 'title', e.target.value)}
                            placeholder="e.g. Health Insurance"
                            sx={{ mb: 2 }}
                          />
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Description"
                            value={benefit.description}
                            onChange={(e) => updateBenefit(index, 'description', e.target.value)}
                            placeholder="Describe this benefit..."
                          />
                        </Box>
                        <IconButton onClick={() => removeBenefit(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Application Questions */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Application Questions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">Custom questions for applicants</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addApplicationQuestion}
                      variant="outlined"
                      size="small"
                    >
                      Add Question
                    </Button>
                  </Box>
                  
                  {formData.applicationQuestions.map((question, index) => (
                    <Paper key={question.id} sx={{ p: 3, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ flex: 1 }}>
                          Question {index + 1}
                        </Typography>
                        <IconButton onClick={() => removeApplicationQuestion(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label="Question Text"
                          value={question.label}
                          onChange={(e) => updateApplicationQuestion(index, 'label', e.target.value)}
                          placeholder="e.g. What is your experience with React?"
                          required
                        />
                        
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Question Type</InputLabel>
                            <Select
                              value={question.type}
                              label="Question Type"
                              onChange={(e) => updateApplicationQuestion(index, 'type', e.target.value)}
                            >
                              <MenuItem value={QuestionType.TEXT}>Short Text</MenuItem>
                              <MenuItem value={QuestionType.TEXTAREA}>Long Text</MenuItem>
                              <MenuItem value={QuestionType.SELECT}>Dropdown</MenuItem>
                              <MenuItem value={QuestionType.RADIO}>Multiple Choice</MenuItem>
                              <MenuItem value={QuestionType.MULTISELECT}>Checkboxes</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={question.required}
                                onChange={(e) => updateApplicationQuestion(index, 'required', e.target.checked)}
                              />
                            }
                            label="Required"
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            fullWidth
                            label="Placeholder Text (Optional)"
                            value={question.placeholder}
                            onChange={(e) => updateApplicationQuestion(index, 'placeholder', e.target.value)}
                            placeholder="e.g. Please describe your experience..."
                          />
                          
                          <TextField
                            fullWidth
                            label="Help Text (Optional)"
                            value={question.helpText}
                            onChange={(e) => updateApplicationQuestion(index, 'helpText', e.target.value)}
                            placeholder="e.g. This will help us understand your background"
                          />
                        </Box>
                        
                        {/* Options for select, radio, multiselect types */}
                        {(question.type === QuestionType.SELECT || 
                          question.type === QuestionType.RADIO || 
                          question.type === QuestionType.MULTISELECT) && (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2">Answer Options</Typography>
                              <Button
                                startIcon={<AddIcon />}
                                onClick={() => addQuestionOption(index)}
                                variant="outlined"
                                size="small"
                              >
                                Add Option
                              </Button>
                            </Box>
                            
                            {question.options?.map((option, optionIndex) => (
                              <Box key={optionIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <TextField
                                  fullWidth
                                  label={`Option ${optionIndex + 1}`}
                                  value={option}
                                  onChange={(e) => updateQuestionOption(index, optionIndex, e.target.value)}
                                  placeholder="e.g. 1-2 years"
                                  size="small"
                                />
                                <IconButton 
                                  onClick={() => removeQuestionOption(index, optionIndex)} 
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                  
                  {formData.applicationQuestions.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <Typography variant="body1">
                        No custom questions added yet. Click "Add Question" to create application-specific questions.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
              {formData.status !== 'archived' && (
                <Button
                  variant="outlined"
                  onClick={handleArchive}
                  disabled={isSubmitting}
                  color="error"
                >
                  Archive Job
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleSave}
                disabled={isSubmitting}
                startIcon={<SaveIcon />}
              >
                Save Changes
              </Button>
              {formData.status !== 'published' && (
                <Button
                  variant="contained"
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <PublishIcon />}
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Job'}
                </Button>
              )}
            </Box>
          </Stack>
        </Paper>
      </Container>
    </AdminGuard>
  );
} 