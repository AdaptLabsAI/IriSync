import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Box, Button, Typography, Alert, CircularProgress } from '@mui/material';

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Save payment method to backend
      const response = await fetch('/api/settings/billing/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payment method');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ mt: 3, p: 3, border: '1px solid #eee', borderRadius: 1 }}>
      <Typography variant="h6" mb={2}>Add Payment Method</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Box mb={3}>
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={!stripe || processing}
          >
            {processing ? <CircularProgress size={24} /> : 'Add Card'}
          </Button>
          <Button 
            type="button" 
            variant="outlined" 
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Box>
  );
} 