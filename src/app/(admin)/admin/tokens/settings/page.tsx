'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid as MuiGrid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import AdminGuard from '@/components/admin/AdminGuard';
import { AITaskType } from '@/lib/features/ai/models/AITask';
import useApi from '@/hooks/useApi';

// Create a properly typed Grid wrapper component for MUI v7
interface GridProps {
  item?: boolean;
  container?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  spacing?: number;
  alignItems?: string;
  justifyContent?: string;
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  children?: React.ReactNode;
  sx?: any;
  key?: string | number;
}

const Grid = (props: GridProps) => <MuiGrid {...props} />;

interface TokenLimits {
  tiers: Record<string, number>;
  tokensPerOperation: Record<string, number>;
  freeTasks: string[];
}

function TokenSettingsPage() {
  const [tokenLimits, setTokenLimits] = useState<TokenLimits>({
    tiers: {
      creator: 500,
      influencer: 1500, 
      enterprise: 5000
    },
    tokensPerOperation: {},
    freeTasks: []
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Convert AITaskType enum to array for rendering
  const taskTypes = Object.values(AITaskType);
  
  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/tokens/settings');
        if (!response.ok) {
          throw new Error('Failed to load token settings');
        }
        
        const data = await response.json();
        setTokenLimits(data);
        setLoading(false);
      } catch (err) {
        setError('Error loading token settings. Please try again.');
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Handle token cost change
  const handleTokenCostChange = (taskType: string, cost: number) => {
    setTokenLimits(prev => ({
      ...prev,
      tokensPerOperation: {
        ...prev.tokensPerOperation,
        [taskType]: cost
      }
    }));
  };

  // Handle tier limit change
  const handleTierLimitChange = (tier: string, limit: number) => {
    setTokenLimits(prev => ({
      ...prev,
      tiers: {
        ...prev.tiers,
        [tier]: limit
      }
    }));
  };

  // Toggle free task
  const handleToggleFreeTask = (taskType: string, isFree: boolean) => {
    setTokenLimits(prev => {
      if (isFree) {
        return {
          ...prev,
          freeTasks: [...prev.freeTasks, taskType]
        };
      } else {
        return {
          ...prev,
          freeTasks: prev.freeTasks.filter(task => task !== taskType)
        };
      }
    });
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch('/api/admin/tokens/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenLimits),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save token settings');
      }
      
      setSuccess(true);
      setSaving(false);
      
      // Reset success message after a few seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError('Error saving token settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          AI Token Settings
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={loading || saving}
            sx={{ mr: 2 }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <IconButton 
            onClick={() => window.location.reload()}
            disabled={loading || saving}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Token settings saved successfully!
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Subscription Tier Limits */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Token Limits by Subscription Tier
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Set the monthly token allocation for each subscription tier
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Creator Tier"
                  type="number"
                  value={tokenLimits.tiers.creator}
                  onChange={(e) => handleTierLimitChange('creator', parseInt(e.target.value))}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Influencer Tier"
                  type="number"
                  value={tokenLimits.tiers.influencer}
                  onChange={(e) => handleTierLimitChange('influencer', parseInt(e.target.value))}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Enterprise Tier"
                  type="number"
                  value={tokenLimits.tiers.enterprise}
                  onChange={(e) => handleTierLimitChange('enterprise', parseInt(e.target.value))}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
            </Grid>
          </Paper>
          
          {/* Token Costs per Operation */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h5" gutterBottom sx={{ mb: 0, mr: 1 }}>
                Token Cost per Operation
              </Typography>
              <Tooltip title="By default, each AI operation costs 1 token. You can adjust costs for specific operations here.">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              Set the token cost for each AI operation type
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Operation Type</TableCell>
                    <TableCell>Token Cost</TableCell>
                    <TableCell align="center">Free Operation</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taskTypes.map((taskType) => {
                    const cost = tokenLimits.tokensPerOperation[taskType] ?? 1;
                    const isFree = tokenLimits.freeTasks.includes(taskType);
                    
                    return (
                      <TableRow key={taskType}>
                        <TableCell>{taskType}</TableCell>
                        <TableCell width={150}>
                          <TextField
                            type="number"
                            size="small"
                            value={cost}
                            onChange={(e) => handleTokenCostChange(taskType, parseInt(e.target.value))}
                            InputProps={{ inputProps: { min: 0 } }}
                            disabled={isFree}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center" width={150}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isFree}
                                onChange={(e) => handleToggleFreeTask(taskType, e.target.checked)}
                              />
                            }
                            label=""
                          />
                        </TableCell>
                        <TableCell>
                          {getTaskDescription(taskType)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Token Usage Policies */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Token Usage Policies
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Configure how token limits and overages are handled
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Grace Period
                    </Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Allow a grace period for token limit exceedance"
                    />
                    <TextField
                      fullWidth
                      label="Grace Tokens"
                      type="number"
                      defaultValue={50}
                      margin="normal"
                      helperText="Number of tokens users can exceed their limit by"
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Customer Support Operations
                    </Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Make all customer support operations free"
                    />
                    <Typography variant="body2" color="text.secondary" mt={2}>
                      When enabled, users won&apos;t be charged tokens for chatbot or support ticket interactions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
}

// Helper function to get description for each task type
function getTaskDescription(taskType: string): string {
  const descriptions: Record<string, string> = {
    [AITaskType.GENERATE_POST]: 'Generate a complete social media post',
    [AITaskType.GENERATE_CAPTION]: 'Generate a caption for media',
    [AITaskType.GENERATE_HASHTAGS]: 'Generate relevant hashtags for content',
    [AITaskType.IMPROVE_CONTENT]: 'Enhance or improve existing content',
    [AITaskType.ANALYZE_SENTIMENT]: 'Analyze sentiment of content',
    [AITaskType.CATEGORIZE_CONTENT]: 'Categorize content by topic or theme',
    [AITaskType.PREDICT_ENGAGEMENT]: 'Predict potential engagement of content',
    [AITaskType.GENERATE_ALT_TEXT]: 'Generate alt text for images',
    [AITaskType.ANALYZE_IMAGE]: 'Analyze image content',
    [AITaskType.MODERATE_CONTENT]: 'Moderate content for policy compliance',
    [AITaskType.SUGGEST_POSTING_TIME]: 'Suggest optimal posting time',
    [AITaskType.OPTIMIZE_CONTENT_MIX]: 'Optimize content mix for maximum engagement',
    [AITaskType.SUGGEST_REPLY]: 'Suggest reply to a comment or message',
    [AITaskType.SUMMARIZE_CONVERSATION]: 'Summarize a conversation',
    [AITaskType.CUSTOMER_SUPPORT]: 'Automated customer support response',
    [AITaskType.CHATBOT]: 'Chatbot conversation'
  };
  
  return descriptions[taskType] || 'AI operation';
}

export default function AdminTokenSettingsPage() {
  return (
    <AdminGuard>
      <TokenSettingsPage />
    </AdminGuard>
  );
} 