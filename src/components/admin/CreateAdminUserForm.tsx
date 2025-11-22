import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper, 
  Alert, 
  CircularProgress, 
  FormHelperText,
  SelectChangeEvent
} from '@mui/material';
import { UserRole } from '@/lib/core/models/User';

interface CreateAdminUserFormProps {
  onSuccess?: (userData: any) => void;
  currentUserRole: string;
}

const CreateAdminUserForm: React.FC<CreateAdminUserFormProps> = ({ 
  onSuccess,
  currentUserRole
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.ADMIN,
    companyName: 'IriSync', // Default company name
    businessType: 'organization' // Default business type
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Only super_admins can create super_admins
  const isSuperAdmin = currentUserRole === UserRole.SUPER_ADMIN;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.email.includes('@')) return 'Valid email is required';
    if (!formData.password.trim()) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (!formData.companyName.trim()) return 'Company name is required';
    
    // Only super_admins can create super_admins
    if (formData.role === UserRole.SUPER_ADMIN && !isSuperAdmin) {
      return 'Only super admins can create super admin accounts';
    }
    
    return null;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Submit to the API
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          // Add subscription data to make user exempt from billing
          subscription: {
            tier: 'enterprise',
            status: 'active',
            seats: 1
          },
          emailVerified: true,
          // Add organization info
          organizationId: '', // Will be set by backend
          businessType: formData.businessType,
          companyName: formData.companyName
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create admin user');
      }
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: UserRole.ADMIN,
        companyName: 'IriSync',
        businessType: 'organization'
      });
      
      // Show success message
      setSuccess(`Successfully created ${formData.role} user: ${formData.email}`);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Create Admin User
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Create admin users without requiring them to register or subscribe.
        {isSuperAdmin && ' As a super admin, you can also create other super admin users.'}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
            <TextField
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              fullWidth
              required
              disabled={loading}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
            <TextField
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              fullWidth
              required
              disabled={loading}
            />
          </Box>
        </Box>
        
        <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
          required
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          fullWidth
          required
          disabled={loading}
          helperText="Minimum 8 characters"
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
            <TextField
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              fullWidth
              required
              disabled={loading}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
            <FormControl fullWidth>
              <InputLabel id="business-type-label">Business Type</InputLabel>
              <Select
                labelId="business-type-label"
                name="businessType"
                value={formData.businessType}
                label="Business Type"
                onChange={handleSelectChange}
                disabled={loading}
              >
                <MenuItem value="organization">Organization</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
                <MenuItem value="agency">Agency</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="role-select-label">Role</InputLabel>
          <Select
            labelId="role-select-label"
            name="role"
            value={formData.role}
            label="Role"
            onChange={handleSelectChange}
            disabled={loading}
          >
            <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
            {isSuperAdmin && (
              <MenuItem value={UserRole.SUPER_ADMIN}>Super Admin</MenuItem>
            )}
          </Select>
          <FormHelperText>
            {formData.role === UserRole.SUPER_ADMIN 
              ? 'Super Admins have complete control over the entire system'
              : 'Admins can manage users and content but have limited system access'}
          </FormHelperText>
        </FormControl>
        
        <Button
          type="submit"
          variant="primary"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Creating...' : 'Create Admin User'}
        </Button>
      </form>
    </Paper>
  );
};

export default CreateAdminUserForm; 