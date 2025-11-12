'use client';

import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid as MuiGrid,
  Card, 
  CardContent, 
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import axios from 'axios';

// CRM types for type safety
type CRMPlatform = 'hubspot' | 'salesforce' | 'zoho' | 'pipedrive' | 'dynamics' | 'sugarcrm';

interface CRMConnection {
  platform: CRMPlatform;
  accountName: string;
  accountEmail: string;
  connected: boolean;
  connectedAt: string;
  lastUsed: string;
  accountId: string;
}

interface ContactData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  platform: CRMPlatform;
}

interface DealData {
  id: string;
  name: string;
  amount?: number;
  stage?: string;
  closeDate?: string;
  company?: string;
  platform: CRMPlatform;
}

// Create a properly typed Grid component
// Fix: Define specific props for the Grid component to handle 'item' prop correctly
interface GridProps {
  item?: boolean;
  container?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  spacing?: number;
  children?: React.ReactNode;
  sx?: any;
  key?: string | number;
}

const Grid = (props: GridProps) => <MuiGrid {...props} />;

export default function CRMDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [connections, setConnections] = useState<CRMConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [deals, setDeals] = useState<DealData[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch user's CRM connections
  useEffect(() => {
    const fetchConnections = async () => {
      if (status !== 'authenticated') return;
      
      setLoading(true);
      try {
        const response = await axios.get('/api/crm/connections');
        setConnections(response.data.connections || []);
      } catch (err) {
        console.error('Error fetching CRM connections:', err);
        setError('Failed to load your CRM connections. API: /api/crm/connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [status]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    if (newValue === 1) {
      fetchContacts();
    } else if (newValue === 2) {
      fetchDeals();
    }
  };

  // Fetch contacts from all connected CRMs
  const fetchContacts = async () => {
    if (connections.length === 0) return;
    
    setLoadingData(true);
    try {
      const response = await axios.get('/api/crm/contacts');
      setContacts(response.data.contacts || []);
    } catch (err) {
      console.error('Error fetching CRM contacts:', err);
      setError('Failed to load contacts from your CRM systems. API: /api/crm/contacts');
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch deals from all connected CRMs
  const fetchDeals = async () => {
    if (connections.length === 0) return;
    
    setLoadingData(true);
    try {
      const response = await axios.get('/api/crm/deals');
      setDeals(response.data.deals || []);
    } catch (err) {
      console.error('Error fetching CRM deals:', err);
      setError('Failed to load deals from your CRM systems. API: /api/crm/deals');
    } finally {
      setLoadingData(false);
    }
  };

  // Navigate to connections page
  const handleConnectCRM = () => {
    router.push('/dashboard/settings/connections');
  };

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading your CRM dashboard...
        </Typography>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="warning">
          You need to be logged in to access the CRM dashboard.
        </Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => router.push('/auth/login')}
        >
          Log In
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>CRM Dashboard</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage and view your CRM data across multiple platforms in one place.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {connections.length === 0 ? (
        <Card sx={{ mb: 4, p: 4, textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              No CRM platforms connected
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Connect your CRM platforms to access your contacts, deals, and other data.
            </Typography>
            <Button 
              variant="contained"
              onClick={handleConnectCRM}
            >
              Connect CRM Platforms
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ErrorBoundary apiEndpoint="/api/crm/*">
          <Box sx={{ width: '100%' }}>
            {/* CRM connections summary */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>Connected CRM Platforms</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {connections.map((connection) => (
                  <Grid item xs={12} sm={6} md={4} key={connection.platform}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1">
                            {connection.platform.charAt(0).toUpperCase() + connection.platform.slice(1)}
                          </Typography>
                          <Chip 
                            label="Connected" 
                            color="success" 
                            size="small" 
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {connection.accountName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {connection.accountEmail}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Connected on {new Date(connection.connectedAt).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Tabs for different CRM data sections */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="CRM data tabs">
                <Tab label="Overview" />
                <Tab label="Contacts" />
                <Tab label="Deals" />
              </Tabs>
            </Box>

            {/* Overview tab */}
            {activeTab === 0 && (
              <Box sx={{ py: 3 }}>
                <Typography variant="h6" gutterBottom>CRM Overview</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h5">{connections.length}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Connected CRM Platforms
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => handleTabChange(null as any, 1)}>
                      <CardContent>
                        <Typography variant="h5">Contacts</Typography>
                        <Typography variant="body2" color="text.secondary">
                          View your contacts across all platforms
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => handleTabChange(null as any, 2)}>
                      <CardContent>
                        <Typography variant="h5">Deals</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Track your opportunities and deals
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Contacts tab */}
            {activeTab === 1 && (
              <Box sx={{ py: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Contacts</Typography>
                  <Button 
                    variant="outlined" 
                    onClick={fetchContacts}
                    disabled={loadingData}
                  >
                    Refresh
                  </Button>
                </Box>
                
                {loadingData ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : contacts.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No contacts found. Click "Refresh" to load contacts from your CRM systems.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="contacts table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Platform</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contacts.map((contact) => (
                          <TableRow key={`${contact.platform}-${contact.id}`}>
                            <TableCell>{contact.name}</TableCell>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell>{contact.phone || '-'}</TableCell>
                            <TableCell>{contact.company || '-'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={contact.platform.charAt(0).toUpperCase() + contact.platform.slice(1)} 
                                size="small" 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Deals tab */}
            {activeTab === 2 && (
              <Box sx={{ py: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Deals & Opportunities</Typography>
                  <Button 
                    variant="outlined" 
                    onClick={fetchDeals}
                    disabled={loadingData}
                  >
                    Refresh
                  </Button>
                </Box>
                
                {loadingData ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : deals.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No deals found. Click "Refresh" to load deals from your CRM systems.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="deals table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Deal Name</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Stage</TableCell>
                          <TableCell>Close Date</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Platform</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deals.map((deal) => (
                          <TableRow key={`${deal.platform}-${deal.id}`}>
                            <TableCell>{deal.name}</TableCell>
                            <TableCell>
                              {deal.amount ? new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              }).format(deal.amount) : '-'}
                            </TableCell>
                            <TableCell>{deal.stage || '-'}</TableCell>
                            <TableCell>{deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>{deal.company || '-'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={deal.platform.charAt(0).toUpperCase() + deal.platform.slice(1)} 
                                size="small" 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Box>
        </ErrorBoundary>
      )}
    </Container>
  );
} 