import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { TokenBalance, TokenPackage, TokenPurchase } from '../../lib/tokens/TokenPurchaseService';
import { Box, Button, Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Divider, Chip, Alert } from '@mui/material';
import { formatCurrency, formatDate } from '../../utils/formatting';
import { useRouter } from 'next/router';
import { useNotification, NotificationOptions } from '../../hooks/useNotification';

interface TokenPurchasePanelProps {
  hideTitle?: boolean;
  onPurchaseComplete?: () => void;
  showHistory?: boolean;
}

export default function TokenPurchasePanel({ 
  hideTitle = false,
  onPurchaseComplete,
  showHistory = true
}: TokenPurchasePanelProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const notification = useNotification();
  
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [history, setHistory] = useState<TokenPurchase[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch token data on component mount
  useEffect(() => {
    if (session?.user) {
      fetchTokenData();
    }
  }, [session]);

  const fetchTokenData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/tokens/purchase');
      
      if (!response.ok) {
        throw new Error('Failed to fetch token data');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch token data');
      }
      
      setPackages(data.data.packages);
      setBalance(data.data.balance);
      setHistory(data.data.history);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error fetching token data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId === selectedPackage ? null : packageId);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      notification.warning({ description: 'Please select a token package' });
      return;
    }

    try {
      setIsPurchasing(true);
      setError(null);
      
      const response = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packageId: selectedPackage,
          paymentMethod: 'card' // In a real app, this would be collected from the user
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to purchase tokens');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to purchase tokens');
      }
      
      // Update the local state with the new balance and purchase
      setBalance(data.data.balance);
      setHistory([data.data.purchase, ...history]);
      setSelectedPackage(null);
      
      // Show success notification
      notification.success({ description: 'Token purchase completed successfully' });
      
      // Call the onPurchaseComplete callback if provided
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during purchase');
      notification.error({ description: error instanceof Error ? error.message : 'Purchase failed' });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const availableTokens = balance 
    ? balance.includedTokens + balance.purchasedTokens - balance.totalUsedTokens 
    : 0;
  
  const usedPercentage = balance 
    ? Math.min(100, Math.round((balance.totalUsedTokens / balance.includedTokens) * 100)) 
    : 0;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Token Balance Card */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Your Token Balance
          </Typography>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>Available Tokens</Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', margin: -12 }}>
              <div style={{ flex: '0 0 33.333%', padding: 12 }}>
                <Box textAlign="center" p={2}>
                  <Typography variant="h3">{availableTokens.toLocaleString()}</Typography>
                  <Typography variant="subtitle1" color="textSecondary">Available Tokens</Typography>
                </Box>
              </div>
              
              <div style={{ flex: '0 0 33.333%', padding: 12 }}>
                <Box textAlign="center" p={2}>
                  <Typography variant="h3">{balance?.includedTokens.toLocaleString()}</Typography>
                  <Typography variant="subtitle1" color="textSecondary">Monthly Included</Typography>
                  <Typography variant="caption">
                    Refreshes on {balance ? formatDate(balance.nextRefreshDate) : 'N/A'}
                  </Typography>
                </Box>
              </div>
              
              <div style={{ flex: '0 0 33.333%', padding: 12 }}>
                <Box textAlign="center" p={2}>
                  <Typography variant="h3">{balance?.purchasedTokens.toLocaleString()}</Typography>
                  <Typography variant="subtitle1" color="textSecondary">Additional Purchased</Typography>
                  <Typography variant="caption">Never expires</Typography>
                </Box>
              </div>
            </div>
          </Box>
          
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              You&apos;ve used {balance?.totalUsedTokens.toLocaleString()} tokens 
              ({usedPercentage}%) of your included monthly tokens.
            </Typography>
          </Box>
        </CardContent>
      </Card>
      
      {/* Token Packages */}
      <Typography variant="h5" gutterBottom>
        Purchase Additional Tokens
      </Typography>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 6 }}>Purchase Tokens</Typography>
      <div style={{ display: 'flex', flexWrap: 'wrap', margin: -8 }}>
        {packages.map((pkg) => (
          <div style={{ flex: '0 0 25%', padding: 8 }} key={pkg.id}>
            <Card 
              variant={selectedPackage === pkg.id ? "elevation" : "outlined"} 
              elevation={selectedPackage === pkg.id ? 6 : 1}
              sx={{ 
                height: '100%', 
                borderColor: selectedPackage === pkg.id ? 'primary.main' : undefined,
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                }
              }}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              <CardContent>
                <Typography variant="h6" align="center">
                  {pkg.tokenAmount.toLocaleString()} Tokens
                </Typography>
                <Typography variant="h5" align="center" sx={{ mt: 1, mb: 2 }}>
                  {formatCurrency(pkg.price)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {(pkg.price / pkg.tokenAmount * 1000).toFixed(2)} per 1,000 tokens
                </Typography>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      
      <Box display="flex" justifyContent="center" mb={4}>
        <Button 
          variant="contained" 
          size="large"
          disabled={!selectedPackage || isPurchasing}
          onClick={handlePurchase}
          startIcon={isPurchasing ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isPurchasing ? 'Processing...' : 'Purchase Tokens'}
        </Button>
      </Box>
      
      {/* Purchase History */}
      {showHistory && history.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          
          <Typography variant="h5" gutterBottom>
            Purchase History
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Package</TableCell>
                  <TableCell align="right">Tokens</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell>{purchase.notes}</TableCell>
                    <TableCell align="right">{purchase.tokenAmount.toLocaleString()}</TableCell>
                    <TableCell align="right">{formatCurrency(purchase.price, purchase.currency)}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={purchase.isProcessed ? "Completed" : "Processing"} 
                        color={purchase.isProcessed ? "success" : "warning"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
} 