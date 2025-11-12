import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Link,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Tooltip
} from '@mui/material';
import { Visibility, VisibilityOff, Check as CheckIcon, Info as InfoIcon } from '@mui/icons-material';
import { SubscriptionTier } from '../../lib/subscription/models/subscription';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/utils';
import { ReferralService } from '@/lib/referrals/ReferralService';

// Mock imports for missing modules
import PlanSelection from './PlanSelection';

// Mock components and hooks as simple non-typed JavaScript functions
const useForm = () => {
  return {
    control: {},
    handleSubmit: (onSubmit: (data: any) => void) => (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        companyName: 'Test Company'
      });
    },
    formState: {
      errors: {} as Record<string, { message?: string }>,
      isValid: true
    }
  };
};

// Mock Controller as a simple component that renders children
interface ControllerProps {
  name: string;
  control: any;
  render: (props: { field: { value: string; onChange: () => void; name: string } }) => React.ReactNode;
}

const Controller = (props: ControllerProps) => {
  return props.render({ field: { value: '', onChange: () => {}, name: props.name } });
};

// Real registration function using the existing API
const signUp = async (userData: {
  name: string;
  email: string;
  password: string;
  companyName: string;
  subscriptionTier: SubscriptionTier;
}) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: userData.name.split(' ')[0] || userData.name,
      lastName: userData.name.split(' ').slice(1).join(' ') || '',
      email: userData.email,
      password: userData.password,
      confirmPassword: userData.password,
      subscriptionTier: userData.subscriptionTier.toLowerCase(),
      businessType: userData.companyName ? 'company' : 'individual',
      companyName: userData.companyName || undefined,
      acceptTerms: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Registration failed');
  }

  const data = await response.json();
  return { 
    success: data.success, 
    userId: data.userId, 
    organizationId: data.organizationId,
    trialStarted: data.trialStarted,
    message: data.message,
    nextStep: data.nextStep
  };
};

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(SubscriptionTier.CREATOR);
  const [referralCode, setReferralCode] = useState('');
  const [referralValidation, setReferralValidation] = useState<{
    isValid: boolean;
    referrerName?: string;
    error?: string;
  } | null>(null);
  const [validatingReferral, setValidatingReferral] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm();

  const steps = ['Account Information', 'Choose Your Plan', 'Confirmation'];

  // Extract referral code from URL on component mount
  useEffect(() => {
    if (searchParams) {
      const refCode = searchParams.get('ref');
      if (refCode) {
        setReferralCode(refCode.toUpperCase());
        validateReferralCode(refCode.toUpperCase());
      }
    }
  }, [searchParams]);

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 4) {
      setReferralValidation(null);
      return;
    }

    setValidatingReferral(true);
    try {
      const response = await fetch(`/api/referrals?action=validate&code=${encodeURIComponent(code)}`);
      const data = await response.json();
      
      if (data.success) {
        setReferralValidation(data.validation);
      } else {
        setReferralValidation({ isValid: false, error: 'Invalid referral code' });
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralValidation({ isValid: false, error: 'Error validating code' });
    } finally {
      setValidatingReferral(false);
    }
  };

  // Handle referral code input change
  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setReferralCode(code);
    
    // Debounce validation
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    const timeout = setTimeout(() => {
      validateReferralCode(code);
    }, 500);
    setValidationTimeout(timeout);
  };

  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Register the user
      const result = await signUp({
        name: data.name,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
        subscriptionTier: selectedTier
      });

      // Store registration info and immediately redirect to trial setup
      localStorage.setItem('registrationResult', JSON.stringify({
        userId: result.userId,
        organizationId: result.organizationId,
        preferredTier: selectedTier,
        requiresTrialSetup: true,
        referralCode: referralCode || undefined // Include referral code
      }));

      // If there's a valid referral code, create the referral relationship
      if (referralCode && referralValidation?.isValid) {
        try {
          await fetch('/api/referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralCode,
              source: 'registration'
            })
          });
        } catch (referralError) {
          console.error('Failed to create referral relationship:', referralError);
          // Don't block registration for referral errors
        }
      }

      // Immediately redirect to trial setup (no platform access without trial)
      router.push(`/billing/trial-setup?tier=${selectedTier}&userId=${result.userId}&orgId=${result.organizationId}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
  };

  const handleFinish = () => {
    router.push('/auth/login?registered=true');
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Create Your Account
      </Typography>

      <Stepper activeStep={activeStep} sx={{ my: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {activeStep === 0 && (
        <form onSubmit={handleSubmit(() => handleNext())}>
          <Box sx={{ mb: 2 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Full Name"
                  variant="outlined"
                  fullWidth
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  variant="outlined"
                  fullWidth
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Password"
                  variant="outlined"
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleTogglePasswordVisibility} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Confirm Password"
                  variant="outlined"
                  fullWidth
                  type={showConfirmPassword ? 'text' : 'password'}
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleToggleConfirmPasswordVisibility} edge="end">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Controller
              name="companyName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Company/Organization Name"
                  variant="outlined"
                  fullWidth
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                />
              )}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={!isValid}
            >
              Next
            </Button>
          </Box>
        </form>
      )}

      {activeStep === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Choose Your Subscription Plan
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Select the plan that best fits your needs. You can always upgrade later.
          </Typography>

          <PlanSelection 
            selectedTier={selectedTier} 
            onTierSelect={handlePlanSelect} 
            isSignUp={true}
          />

          {selectedTier === SubscriptionTier.ENTERPRISE && (
            <Alert severity="info" sx={{ mt: 2 }}>
              For Enterprise plans, our sales team will contact you shortly after registration to customize your plan.
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleBack}>Back</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="h5" gutterBottom color="primary">
            Registration Successful!
          </Typography>
          <Typography variant="body1" paragraph>
            Your account has been created. Please check your email to verify your account.
          </Typography>
          <Typography variant="body2" paragraph color="textSecondary">
            You&apos;ve selected the <strong>{selectedTier}</strong> plan.
            {selectedTier === SubscriptionTier.ENTERPRISE && 
              ` Our sales team will contact you shortly to discuss your custom requirements.`}
          </Typography>
          <Button variant="contained" color="primary" onClick={handleFinish}>
            Proceed to Login
          </Button>
        </Box>
      )}

      {/* Referral Code Section */}
      <Box sx={{ mt: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Have a Referral Code? (Optional)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label="Referral Code"
            placeholder="e.g. IRIS1234"
            value={referralCode}
            onChange={handleReferralCodeChange}
            variant="outlined"
            size="small"
            sx={{ minWidth: 150 }}
            InputProps={{
              style: { 
                fontFamily: 'monospace',
                textTransform: 'uppercase'
              }
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {validatingReferral && <CircularProgress size={20} />}
            
            {referralValidation?.isValid && (
              <Chip
                icon={<CheckIcon />}
                label={`From ${referralValidation.referrerName}`}
                color="success"
                size="small"
              />
            )}
            
            {referralValidation && !referralValidation.isValid && (
              <Tooltip title={referralValidation.error}>
                <Chip
                  label="Invalid"
                  color="error"
                  size="small"
                />
              </Tooltip>
            )}
          </Box>
        </Box>
        
        {referralValidation?.isValid && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Great! You were referred by <strong>{referralValidation.referrerName}</strong>. 
              They'll earn 100 bonus tokens when you complete your first month.
            </Typography>
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <InfoIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
          Enter a referral code from an existing IriSync user to help them earn bonus tokens.
        </Typography>
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Already have an account?{' '}
          <Link href="/auth/login" underline="hover">
            Sign in
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
} 