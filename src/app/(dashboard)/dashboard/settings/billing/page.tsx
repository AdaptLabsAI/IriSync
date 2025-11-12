'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Box, Button, Typography, Alert, CircularProgress, Stack, MenuItem, Select, InputLabel, FormControl, List, ListItem, ListItemText, Divider } from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from '@/components/ui/billing/PaymentForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function BillingPage() {
  const { data: session } = useSession();
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const fetchBilling = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings/billing');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load billing info');
      setBilling(data.billing);
      setPlan(data.billing.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBilling(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update billing');
      setSuccess('Billing info updated!');
      fetchBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update billing');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPaymentMethod = () => {
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    fetchBilling();
    setSuccess('Payment method added!');
  };

  return (
    <Box className="container mx-auto py-6 max-w-xl">
      <Typography variant="h4" fontWeight={700} mb={2}>Billing & Subscription</Typography>
      <Typography color="text.secondary" mb={4}>Manage your subscription plan and payment methods.</Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <form onSubmit={handleSave}>
            <Stack spacing={3} mb={4}>
              <FormControl fullWidth>
                <InputLabel id="plan-label">Plan</InputLabel>
                <Select
                  labelId="plan-label"
                  value={plan}
                  label="Plan"
                  onChange={e => setPlan(e.target.value)}
                >
                  <MenuItem value="creator">Creator ($80/mo)</MenuItem>
                  <MenuItem value="influencer">Influencer ($200/mo)</MenuItem>
                  <MenuItem value="enterprise">Enterprise (Starting at $1,250/mo)</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" color="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Stack>
          </form>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" mb={2}>Payment Methods</Typography>
          <List>
            {billing.paymentMethods?.map((pm: any, idx: number) => (
              <ListItem key={idx}>
                <ListItemText
                  primary={`${pm.brand} ending in ${pm.last4}`}
                  secondary={`Exp: ${pm.exp}`}
                />
              </ListItem>
            ))}
          </List>
          <Button variant="outlined" onClick={handleAddPaymentMethod} sx={{ mt: 2 }}>
            Add Payment Method
          </Button>
          {showPaymentForm && (
            <Elements stripe={stripePromise}>
              <PaymentForm onSuccess={handlePaymentSuccess} onCancel={() => setShowPaymentForm(false)} />
            </Elements>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" mt={4} mb={2}>Invoices</Typography>
          <List>
            {billing.invoices?.map((inv: any) => (
              <ListItem key={inv.id}>
                <ListItemText
                  primary={`Invoice #${inv.id}`}
                  secondary={`$${inv.amount} - ${new Date(inv.date).toLocaleDateString()} - ${inv.status}`}
                />
                <Button
                  variant="outlined"
                  href={inv.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                >
                  Download
                </Button>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
} 