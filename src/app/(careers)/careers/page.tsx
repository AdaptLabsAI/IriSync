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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import { useRouter } from 'next/navigation';
import { JobListing, JobType, JobLocationType } from '@/lib/features/careers/models';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase/client';

export default function CareersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    jobType: '',
    location: ''
  });
  
  useEffect(() => {
    // Fetch job listings from Firestore
    const fetchJobListings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Create a query to get all published job listings
        let querySnapshot;
        
        try {
          // Try the optimized query with composite index
          const jobsQuery = query(
            collection(firestore, 'jobListings'),
            where('status', '==', 'published'),
            orderBy('featured', 'desc'),
            orderBy('publishedAt', 'desc')
          );
          querySnapshot = await getDocs(jobsQuery);
        } catch (indexError) {
          console.log('Composite index not available, using simple query');
          // Fallback to a simpler query that doesn't require a composite index
          const simpleQuery = query(
            collection(firestore, 'jobListings'),
            where('status', '==', 'published')
          );
          querySnapshot = await getDocs(simpleQuery);
        }
        
        // Map the document data to our JobListing model
        const jobs: JobListing[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Convert Firestore Timestamps to JavaScript Dates
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
          const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;
          const publishedAt = data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : data.publishedAt;
          const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : data.expiresAt;
          
          return {
            id: doc.id,
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
            skills: data.skills || []
          } as JobListing;
        });
        
        // Sort manually if we used the simple query (featured first, then by date)
        jobs.sort((a, b) => {
          // Featured jobs first
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          
          // Then by published date (most recent first)
          const aDate = a.publishedAt || a.createdAt;
          const bDate = b.publishedAt || b.createdAt;
          
          // Convert to Date if needed and compare
          const aTime = aDate instanceof Date ? aDate.getTime() : aDate.toDate().getTime();
          const bTime = bDate instanceof Date ? bDate.getTime() : bDate.toDate().getTime();
          
          return bTime - aTime;
        });
        
        setJobListings(jobs);
      } catch (error) {
        console.error('Error fetching job listings:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred while loading job listings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobListings();
  }, []);
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleFilterChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFilters({
      ...filters,
      [name as string]: value as string
    });
  };
  
  const handleViewJob = (jobId: string, jobSlug: string) => {
    router.push(`/careers/${jobSlug}`);
  };
  
  // Filter job listings based on search query and filters
  const filteredJobs = jobListings.filter(job => {
    // Search query filter
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Department filter
    const matchesDepartment = !filters.department || job.department === filters.department;
    
    // Job type filter
    const matchesJobType = !filters.jobType || job.jobType === filters.jobType;
    
    // Location filter
    const matchesLocation = !filters.location || 
      (filters.location === 'remote' && job.location.type === JobLocationType.REMOTE) ||
      (filters.location === 'hybrid' && job.location.type === JobLocationType.HYBRID) ||
      (filters.location === 'onsite' && job.location.type === JobLocationType.ONSITE);
    
    return matchesSearch && matchesDepartment && matchesJobType && matchesLocation;
  });
  
  // Extract unique departments for filter dropdown
  const departments = Array.from(new Set(jobListings.map(job => job.department)));

  return (
    <>
      {/* Hero section */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        py: 8
      }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom>
            Careers at IriSync
          </Typography>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Join our team and help build the IriSync platform for social media management
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: '700px', mb: 4 }}>
            We're building tools that help businesses engage with their audiences, 
            streamline their workflows, and leverage AI to create better content.
            If you're passionate about innovation and want to make an impact, we'd love to meet you.
          </Typography>
        </Container>
      </Box>
      
      {/* Filters and search */}
      <Container maxWidth="lg" sx={{ mt: -4 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 5 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 33%' } }}>
              <TextField
                fullWidth
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 67%' }, display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="department-filter-label">Department</InputLabel>
                <Select
                  labelId="department-filter-label"
                  id="department-filter"
                  name="department"
                  value={filters.department}
                  label="Department"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="job-type-filter-label">Job Type</InputLabel>
                <Select
                  labelId="job-type-filter-label"
                  id="job-type-filter"
                  name="jobType"
                  value={filters.jobType}
                  label="Job Type"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value={JobType.FULL_TIME}>Full Time</MenuItem>
                  <MenuItem value={JobType.PART_TIME}>Part Time</MenuItem>
                  <MenuItem value={JobType.CONTRACT}>Contract</MenuItem>
                  <MenuItem value={JobType.INTERNSHIP}>Internship</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="location-filter-label">Location</InputLabel>
                <Select
                  labelId="location-filter-label"
                  id="location-filter"
                  name="location"
                  value={filters.location}
                  label="Location"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Locations</MenuItem>
                  <MenuItem value="remote">Remote</MenuItem>
                  <MenuItem value="hybrid">Hybrid</MenuItem>
                  <MenuItem value="onsite">On-site</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>
      </Container>
      
      {/* Job listings */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Open Positions
        </Typography>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        ) : filteredJobs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">
              No job openings match your criteria
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting your filters or search term
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredJobs.map(job => (
              <Paper 
                key={job.id}
                elevation={job.featured ? 3 : 1}
                sx={{ 
                  p: 3,
                  border: job.featured ? '1px solid' : 'none',
                  borderColor: 'primary.main',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {job.featured && (
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: 16,
                      right: -28,
                      transform: 'rotate(45deg)',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      py: 0.5,
                      px: 3,
                      width: 120,
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Featured
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 70%' } }}>
                    <Typography variant="h5" component="h3" gutterBottom>
                      {job.title}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WorkIcon color="action" fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          {job.jobType.replace('_', ' ')}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOnIcon color="action" fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          {job.location.type === JobLocationType.REMOTE ? 'Remote' : 
                           job.location.type === JobLocationType.HYBRID ? `Hybrid - ${job.location.city || ''}` :
                           `${job.location.city || ''}, ${job.location.state || ''}`}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" paragraph>
                      {job.description.length > 150 ? `${job.description.slice(0, 150)}...` : job.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {job.skills.slice(0, 4).map((skill, index) => (
                        <Chip 
                          key={index} 
                          label={skill.name} 
                          size="small" 
                          variant={skill.required ? "filled" : "outlined"}
                          color={skill.required ? "primary" : "default"}
                        />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 30%' } }}>
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'flex-end' }
                    }}>
                      <Box>
                        <Typography variant="h6" gutterBottom align="right">
                          {job.salaryRange?.isVisible ? 
                            `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()}` : 
                            'Competitive Salary'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="right">
                          {job.department}
                        </Typography>
                      </Box>
                      
                      <Button 
                        variant="contained" 
                        color="primary"
                        size="large"
                        onClick={() => handleViewJob(job.id, job.slug)}
                        sx={{ mt: { xs: 2, sm: 0 } }}
                      >
                        View Job
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Container>
      
      {/* Company values */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" gutterBottom align="center">
            Why Work With Us
          </Typography>
          
          <Typography variant="body1" paragraph align="center" sx={{ mb: 6, maxWidth: '800px', mx: 'auto' }}>
            At IriSync, we believe in empowering our team members to do their best work.
            We value innovation, collaboration, and creating a positive impact for our customers.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Paper sx={{ p: 3, flex: '1 1 0', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Innovation-First Culture
              </Typography>
              <Typography variant="body2">
                We encourage creative thinking and aren't afraid to try new approaches.
                Your ideas matter, and you'll have the freedom to experiment and innovate.
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 3, flex: '1 1 0', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Work-Life Balance
              </Typography>
              <Typography variant="body2">
                We believe in sustainable pace and meaningful work. Our flexible policies
                help you maintain balance and bring your best self to work.
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 3, flex: '1 1 0', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Growth & Development
              </Typography>
              <Typography variant="body2">
                We invest in our team's growth through mentorship, learning stipends,
                and opportunities to take on new challenges and responsibilities.
              </Typography>
            </Paper>
          </Box>
        </Container>
      </Box>
    </>
  );
} 