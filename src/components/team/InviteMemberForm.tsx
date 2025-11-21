'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  TextField,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Select,
  LinearProgress,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { UserPlus } from 'lucide-react';
import { Role } from '../../lib/team/role';

interface InviteMemberFormProps {
  roles: Role[];
  onInvite: (data: InviteMemberFormValues) => Promise<any>;
}

// Define form schema
const inviteMemberSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  roleId: z.string({ required_error: 'Please select a role' }),
  message: z.string().optional(),
});

type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export default function InviteMemberForm({ roles, onInvite }: InviteMemberFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBillingConfirmation, setShowBillingConfirmation] = useState(false);
  const [billingDetails, setBillingDetails] = useState<{
    seatCost: number;
    tokenAllocation: number;
    tier: string;
    organizationId: string;
    currentSeats: number;
    totalSeats: number;
    seatLimit: number;
  } | null>(null);
  const [stripeProcessing, setStripeProcessing] = useState(false);
  const [stripeError, setStripeError] = useState('');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      message: '',
    },
  });

  // Get organization subscription details
  const fetchSubscriptionDetails = async () => {
    try {
      const response = await fetch('/api/settings/organization/subscription');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to load subscription details');
      
      // Calculate seat cost and token allocation based on tier and current seat count
      let seatCost = 0;
      let tokenAllocation = 0;
      const tier = data.tier;
      const currentSeats = data.usedSeats || 1;
      const totalSeats = data.seats || 1;
      const seatLimit = data.seatLimit || 1;
      
      // Check if adding a seat would exceed the limit
      if (currentSeats >= seatLimit) {
        setBillingDetails({
          seatCost: 0,
          tokenAllocation: 0,
          tier,
          organizationId: data.organizationId,
          currentSeats,
          totalSeats,
          seatLimit
        });
        return;
      }
      
      // Check if we need to purchase an additional seat or if we have available seats
      if (currentSeats < totalSeats) {
        // We have available seats, no need to purchase
        setBillingDetails({
          seatCost: 0,
          tokenAllocation: 0,
          tier,
          organizationId: data.organizationId,
          currentSeats,
          totalSeats,
          seatLimit
        });
        return;
      }
      
      // We need to get pricing for an additional seat
      const seatResponse = await fetch('/api/settings/organization/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationId: data.organizationId,
          seats: 1,
          confirm: false 
        })
      });
      
      const seatData = await seatResponse.json();
      
      if (!seatResponse.ok) throw new Error(seatData.error || 'Failed to get seat pricing');
      
      setBillingDetails({
        seatCost: seatData.costPerSeat || 0,
        tokenAllocation: seatData.additionalTokens || 0,
        tier,
        organizationId: data.organizationId,
        currentSeats,
        totalSeats,
        seatLimit
      });
      
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      // Still allow inviting even if we can't fetch billing details
      setBillingDetails(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubscriptionDetails();
    }
  }, [isOpen]);

  const handleFormSubmit = async (data: InviteMemberFormValues) => {
    // If we have billing details with a cost and need to show confirmation first
    if (billingDetails && billingDetails.seatCost > 0 && !showBillingConfirmation) {
      setShowBillingConfirmation(true);
      return;
    }
    
    setIsSubmitting(true);
    setStripeError('');
    
    try {
      // If we need to purchase an additional seat
      if (billingDetails && billingDetails.seatCost > 0 && showBillingConfirmation) {
        setStripeProcessing(true);
        
        // Purchase the additional seat
        const seatResponse = await fetch('/api/settings/organization/seats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            organizationId: billingDetails.organizationId,
            seats: 1,
            confirm: true 
          })
        });
        
        const seatData = await seatResponse.json();
        
        if (!seatResponse.ok) {
          throw new Error(seatData.error || seatData.message || 'Failed to purchase additional seat');
        }
        
        setStripeProcessing(false);
      }
      
      // Proceed with the invitation
      await onInvite(data);
      reset();
      setIsOpen(false);
      setShowBillingConfirmation(false);
    } catch (error) {
      if (error instanceof Error) {
        setStripeError(error.message);
      } else {
        setStripeError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
      setStripeProcessing(false);
    }
  };

  return (
    <>
      <Button 
        variant="contained" 
        size="sm" 
        startIcon={<UserPlus />}
        onClick={() => setIsOpen(true)}
      >
        Invite Member
      </Button>
      
      <Dialog 
        open={isOpen} 
        onClose={() => !isSubmitting && setIsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {showBillingConfirmation && billingDetails && billingDetails.seatCost > 0 ? (
          <>
            <DialogTitle>Confirm Additional Seat</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Adding this team member will have the following billing implications:
              </DialogContentText>
              
              <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ border: 1, borderRadius: 1, p: 2, bgcolor: 'background.paper', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>Billing Impact</Typography>
                  <Typography variant="body2">
                    Your organization will be charged an additional <strong>${billingDetails.seatCost}/month</strong> for this seat.
                  </Typography>
                  {billingDetails.tokenAllocation > 0 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    You will receive <strong>{billingDetails.tokenAllocation} additional AI tokens</strong> each month.
                  </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    This change will be applied to your next invoice.
                  </Typography>
                </Box>
              </Box>
              
              {stripeError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {stripeError}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => {
                  setShowBillingConfirmation(false);
                  setStripeError('');
                }}
                disabled={isSubmitting || stripeProcessing}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={() => handleFormSubmit(control._formValues as InviteMemberFormValues)}
                disabled={isSubmitting || stripeProcessing}
              >
                {stripeProcessing ? "Processing..." : "Confirm & Invite"}
              </Button>
            </DialogActions>
            {(isSubmitting || stripeProcessing) && <LinearProgress />}
          </>
        ) : (
          <>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Send an invitation to join your team with a specific role.
                {billingDetails && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {billingDetails.currentSeats >= billingDetails.seatLimit ? (
                      <strong>Your plan has reached its seat limit. Please upgrade your plan to add more members.</strong>
                    ) : billingDetails.currentSeats < billingDetails.totalSeats ? (
                      `You have ${billingDetails.totalSeats - billingDetails.currentSeats} available seats.`
                    ) : billingDetails.seatCost > 0 ? (
                      `Adding a member will consume a seat (${billingDetails.tier} tier) at $${billingDetails.seatCost}/month.`
                    ) : (
                      `Adding this member will use one of your available seats.`
                    )}
                  </Typography>
                )}
              </DialogContentText>
              
              <Box component="form" sx={{ mt: 2 }}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      placeholder="colleague@example.com"
                      fullWidth
                      margin="normal"
                      error={!!errors.email}
                      helperText={errors.email?.message || "The email address of the person you want to invite."}
                    />
                  )}
                />
                
                <Controller
                  control={control}
                  name="roleId"
                  render={({ field }) => (
                    <FormControl 
                      fullWidth 
                      margin="normal"
                      error={!!errors.roleId}
                    >
                      <InputLabel id="role-select-label">Role</InputLabel>
                      <Select
                        {...field}
                        labelId="role-select-label"
                        label="Role"
                      >
                        {roles.filter(role => role.id !== 'role_owner').map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            {role.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {errors.roleId?.message || "The role determines what permissions they will have."}
                      </FormHelperText>
                    </FormControl>
                  )}
                />
                
                <Controller
                  control={control}
                  name="message"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Personal Message (Optional)"
                      placeholder="I'd like to invite you to collaborate on our team..."
                      fullWidth
                      multiline
                      rows={3}
                      margin="normal"
                      helperText="Add a personal message to the invitation email."
                    />
                  )}
                />
              </Box>
              
              {billingDetails && billingDetails.currentSeats >= billingDetails.seatLimit && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Your plan has reached its seat limit. Please upgrade your plan to add more members.
                </Alert>
              )}
              
              {stripeError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {stripeError}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button 
                variant="outlined"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSubmit(handleFormSubmit)}
                disabled={isSubmitting || (!!billingDetails && billingDetails.currentSeats >= billingDetails.seatLimit)}
              >
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogActions>
          </>
        )}
        {isSubmitting && !stripeProcessing && <LinearProgress />}
      </Dialog>
    </>
  );
} 