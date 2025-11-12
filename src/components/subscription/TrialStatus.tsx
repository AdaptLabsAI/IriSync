import React, { useState, useEffect } from 'react';
import { Alert, Card, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import { AccessTime, CreditCard, CheckCircle } from '@mui/icons-material';

interface TrialInfo {
  isActive: boolean;
  tier: string;
  endDate: string;
  daysRemaining: number;
  hasPaymentMethod: boolean;
}

interface TrialStatusProps {
  userId: string;
  onSetupPayment?: () => void;
  onUpgrade?: () => void;
}

export const TrialStatus: React.FC<TrialStatusProps> = ({ 
  userId, 
  onSetupPayment, 
  onUpgrade 
}) => {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrialInfo();
  }, [userId]);

  const fetchTrialInfo = async () => {
    try {
      const response = await fetch(`/api/billing/subscription?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trial information');
      }
      
      const data = await response.json();
      
      if (data.trial?.activeTrial) {
        const trial = data.trial.activeTrial;
        const endDate = new Date(trial.endDate);
        const now = new Date();
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        setTrialInfo({
          isActive: trial.isActive && !trial.isExpired,
          tier: trial.tier,
          endDate: trial.endDate,
          daysRemaining: Math.max(0, daysRemaining),
          hasPaymentMethod: !!trial.paymentMethodId && trial.paymentMethodId !== 'pm_card_visa'
        });
      } else {
        setTrialInfo(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trial information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading trial information...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  if (!trialInfo || !trialInfo.isActive) {
    return null; // Don't show anything if no active trial
  }

  const isTrialEndingSoon = trialInfo.daysRemaining <= 2;
  const needsPaymentMethod = !trialInfo.hasPaymentMethod;

  return (
    <Card elevation={2} sx={{ mb: 2, borderLeft: 4, borderLeftColor: isTrialEndingSoon ? 'warning.main' : 'primary.main' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <AccessTime color={isTrialEndingSoon ? 'warning' : 'primary'} />
            <Typography variant="h6">
              Free Trial Active
            </Typography>
            <Chip 
              label={trialInfo.tier.toUpperCase()} 
              color="primary" 
              size="small" 
            />
          </Box>
          <Chip 
            label={`${trialInfo.daysRemaining} days left`}
            color={isTrialEndingSoon ? 'warning' : 'success'}
            variant="outlined"
          />
        </Box>

        {isTrialEndingSoon && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Your trial ends in {trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? 's' : ''}! 
              {needsPaymentMethod 
                ? ' Add a payment method to continue your subscription.'
                : ' Your subscription will automatically start when the trial ends.'
              }
            </Typography>
          </Alert>
        )}

        {needsPaymentMethod && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CreditCard />
              <Typography variant="body2">
                Add a payment method to ensure uninterrupted service when your trial ends.
              </Typography>
            </Box>
          </Alert>
        )}

        <Box display="flex" gap={2} mt={2}>
          {needsPaymentMethod && (
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<CreditCard />}
              onClick={onSetupPayment}
            >
              Add Payment Method
            </Button>
          )}
          
          <Button 
            variant="outlined" 
            onClick={onUpgrade}
          >
            Upgrade Now
          </Button>
          
          {!needsPaymentMethod && (
            <Box display="flex" alignItems="center" gap={1} ml="auto">
              <CheckCircle color="success" fontSize="small" />
              <Typography variant="body2" color="success.main">
                Payment method configured
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TrialStatus; 