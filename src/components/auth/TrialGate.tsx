import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Card, CardContent, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { CreditCard, Security, CheckCircle } from '@mui/icons-material';

interface TrialGateProps {
  userId: string;
  organizationId: string;
  preferredTier?: string;
  children: React.ReactNode;
}

interface TrialStatus {
  hasActiveTrial: boolean;
  hasActiveSubscription: boolean;
  trialEligible: boolean;
  currentStatus: string;
}

export const TrialGate: React.FC<TrialGateProps> = ({ 
  userId, 
  organizationId, 
  preferredTier = 'creator',
  children 
}) => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingTrial, setStartingTrial] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkTrialStatus();
  }, [userId, organizationId]);

  const checkTrialStatus = async () => {
    try {
      // Check access status
      const statusResponse = await fetch(`/api/billing/status?userId=${userId}`);
      
      if (!statusResponse.ok) {
        throw new Error('Failed to check access status');
      }
      
      const statusData = await statusResponse.json();
      
      // Check trial eligibility
      const eligibilityResponse = await fetch(`/api/billing/trial-setup?userId=${userId}&organizationId=${organizationId}`);
      let trialEligible = true;
      
      if (eligibilityResponse.ok) {
        const eligibilityData = await eligibilityResponse.json();
        trialEligible = eligibilityData.eligible;
      }
      
      setTrialStatus({
        hasActiveTrial: statusData.subscriptionStatus === 'trialing',
        hasActiveSubscription: statusData.subscriptionStatus === 'active',
        trialEligible,
        currentStatus: statusData.subscriptionStatus
      });
    } catch (error) {
      console.error('Error checking trial status:', error);
      // Default to requiring trial if we can't determine status
      setTrialStatus({
        hasActiveTrial: false,
        hasActiveSubscription: false,
        trialEligible: true,
        currentStatus: 'unknown'
      });
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async () => {
    setStartingTrial(true);
    
    try {
      const response = await fetch('/api/billing/trial-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          organizationId,
          tier: preferredTier,
          successUrl: `${window.location.origin}/dashboard?trial=started`,
          cancelUrl: `${window.location.origin}/billing/trial-setup?canceled=true`
        })
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else if (data.success && data.nextStep === 'trial_active') {
        // Trial started immediately (rare case with existing payment method)
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to start trial');
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Failed to start trial. Please try again.');
    } finally {
      setStartingTrial(false);
    }
  };

  const goToUpgrade = () => {
    router.push('/billing/upgrade');
  };

  // Show loading state
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Checking account status...
        </Typography>
      </Box>
    );
  }

  // User has access - show the protected content
  if (trialStatus?.hasActiveSubscription || trialStatus?.hasActiveTrial) {
    return <>{children}</>;
  }

  // User needs to start trial - show trial gate
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      sx={{ bg: 'grey.50', p: 2 }}
    >
      <Card elevation={4} sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <CreditCard sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            Start Your Free Trial
          </Typography>
          
          <Typography variant="body1" color="textSecondary" paragraph>
            To access the IrisSync platform, please start your 7-day free trial. 
            No charges until the trial ends.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>What you get:</strong><br/>
              • Full access to all {preferredTier} features<br/>
              • 7 days completely free<br/>
              • Cancel anytime during trial<br/>
              • Automatic billing only after trial ends
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="primary">
              {preferredTier.charAt(0).toUpperCase() + preferredTier.slice(1)} Plan
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {preferredTier === 'creator' && '$80/month after trial'}
              {preferredTier === 'influencer' && '$200/month after trial'}
              {preferredTier === 'enterprise' && 'Custom pricing after trial'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={startTrial}
            disabled={startingTrial}
            startIcon={startingTrial ? <CircularProgress size={20} /> : <Security />}
            sx={{ mb: 2 }}
          >
            {startingTrial ? 'Setting up trial...' : 'Start 7-Day Free Trial'}
          </Button>

          <Typography variant="caption" color="textSecondary">
            Secure payment processing by Stripe
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TrialGate; 