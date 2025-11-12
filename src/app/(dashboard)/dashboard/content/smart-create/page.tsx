'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Paper
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import DashboardLayout from '../../../../../components/layouts/DashboardLayout';
import SmartContentCreator from '../../../../../components/content/SmartContentCreator';
import { SocialAccount, PlatformType } from '../../../../../lib/platforms/client';
import { SubscriptionData } from '../../../../../lib/subscription/models/subscription';

export default function SmartContentCreatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's connected accounts and subscription
  useEffect(() => {
    const fetchUserData = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch connected social accounts
        const accountsResponse = await fetch('/api/platforms/accounts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!accountsResponse.ok) {
          throw new Error('Failed to fetch connected accounts');
        }

        const accountsData = await accountsResponse.json();
        if (accountsData.success && accountsData.accounts) {
          setAccounts(accountsData.accounts);
        }

        // Fetch user subscription
        const subscriptionResponse = await fetch('/api/billing/subscription', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          if (subscriptionData.success && subscriptionData.subscription) {
            setSubscription(subscriptionData.subscription);
          }
        }

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [session, status]);

  // Handle content submission
  const handleContentSubmit = async (contentData: any) => {
    try {
      const response = await fetch('/api/content/smart-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...contentData,
          userId: session?.user?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create content');
      }

      const result = await response.json();
      
      if (result.success) {
        // Redirect to content management with success message
        router.push('/dashboard/content?created=smart');
      } else {
        throw new Error(result.error || 'Failed to create content');
      }

    } catch (err) {
      console.error('Content creation error:', err);
      throw err; // Re-throw to let SmartContentCreator handle the error display
    }
  };

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <Box>
        {/* Header & Navigation */}
        <Box sx={{ mb: 4 }}>
          <Breadcrumbs sx={{ mb: 2 }}>
            <Link 
              color="inherit" 
              href="/dashboard/content"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              <ArrowBack sx={{ mr: 0.5, fontSize: 16 }} />
              Content Management
            </Link>
            <Typography color="text.primary">Smart Content Creator</Typography>
          </Breadcrumbs>

          <Typography variant="h4" gutterBottom>
            ✨ Smart Content Creator
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Describe your idea in natural language, and our AI will help you create engaging content optimized for your platforms.
          </Typography>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Connected Accounts Check */}
        {!loading && accounts.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              No Connected Accounts
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You need to connect at least one social media account to create content.
            </Typography>
            <Link href="/dashboard/platforms" underline="none">
              Connect Your Social Media Accounts
            </Link>
          </Paper>
        )}

        {/* Smart Content Creator */}
        {!loading && accounts.length > 0 && (
          <SmartContentCreator
            accounts={accounts}
            subscription={subscription}
            onSubmit={handleContentSubmit}
            disabled={loading}
          />
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>
    </DashboardLayout>
  );
} 