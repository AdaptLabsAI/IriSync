'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import AdminGuard from '@/components/admin/AdminGuard';
import useApi from '@/hooks/useApi';
import { useNotification } from '@/hooks/useNotification';

// Platform engagement benchmark data structure
interface PlatformBenchmark {
  id: string;
  platform: string;
  lowEngagement: number;
  averageEngagement: number;
  highEngagement: number;
  lastUpdated: string;
}

export default function EngagementBenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState<PlatformBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempBenchmark, setTempBenchmark] = useState<Partial<PlatformBenchmark>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const notification = useNotification();
  
  // Using useApi hook instead of direct fetch
  const {
    data: benchmarksData,
    isLoading,
    error: apiError,
    refetch,
    patch
  } = useApi<PlatformBenchmark[]>('/api/admin/settings/engagement-benchmarks');

  // Handle data when it's loaded
  useEffect(() => {
    if (benchmarksData) {
      setBenchmarks(benchmarksData);
      setLoading(false);
    }
  }, [benchmarksData]);

  // Handle API error
  useEffect(() => {
    if (apiError) {
      setError(apiError);
      setLoading(false);
      notification.error({ 
        title: 'Error', 
        description: 'Failed to load engagement benchmarks' 
      });
    }
  }, [apiError, notification]);

  // Start editing a benchmark
  const handleEdit = (benchmark: PlatformBenchmark) => {
    setEditingId(benchmark.id);
    setTempBenchmark({ ...benchmark });
  };

  // Handle input changes
  const handleChange = (field: keyof PlatformBenchmark, value: number) => {
    setTempBenchmark(prev => ({ ...prev, [field]: value }));
  };

  // Save edited benchmark
  const handleSave = async () => {
    if (!tempBenchmark || !editingId) return;
    
    setIsSaving(true);
    
    try {
      // Use the patch method from useApi
      await patch({
        id: editingId,
        ...tempBenchmark,
        lastUpdated: new Date().toISOString().split('T')[0]
      }, { url: `/api/admin/settings/engagement-benchmarks/${editingId}` });
      
      // Update benchmarks with edited values
      setBenchmarks(prev => 
        prev.map(b => 
          b.id === editingId 
            ? { 
                ...b, 
                lowEngagement: Number(tempBenchmark.lowEngagement) || b.lowEngagement,
                averageEngagement: Number(tempBenchmark.averageEngagement) || b.averageEngagement,
                highEngagement: Number(tempBenchmark.highEngagement) || b.highEngagement,
                lastUpdated: new Date().toISOString().split('T')[0]
              } 
            : b
        )
      );
      
      notification.success({ 
        title: 'Saved', 
        description: 'Benchmark updated successfully' 
      });
      
      // Reset editing state
      setEditingId(null);
      setTempBenchmark({});
    } catch (error) {
      notification.error({ 
        title: 'Error', 
        description: 'Failed to update benchmark' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setTempBenchmark({});
  };

  return (
    <AdminGuard>
      <Box sx={{ maxWidth: '100%' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1">Engagement Rate Benchmarks</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Configure platform-specific engagement rate benchmarks used for analytics and reporting.
          </Typography>
        </Box>

        {/* Error handling */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
          >
            Error loading benchmarks: {error.message || 'Failed to load benchmarks'}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              API: /api/admin/settings/engagement-benchmarks
            </Typography>
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => refetch()}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Platform</TableCell>
                  <TableCell align="right">Low Engagement (%)</TableCell>
                  <TableCell align="right">Average Engagement (%)</TableCell>
                  <TableCell align="right">High Engagement (%)</TableCell>
                  <TableCell align="right">Last Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {benchmarks.map((benchmark) => (
                  <TableRow key={benchmark.id}>
                    <TableCell>{benchmark.platform}</TableCell>
                    
                    {editingId === benchmark.id ? (
                      <>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            inputProps={{ step: "0.1", min: "0" }}
                            value={tempBenchmark.lowEngagement}
                            onChange={(e) => handleChange('lowEngagement', parseFloat(e.target.value))}
                            size="small"
                            sx={{ width: '100px' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            inputProps={{ step: "0.1", min: "0" }}
                            value={tempBenchmark.averageEngagement}
                            onChange={(e) => handleChange('averageEngagement', parseFloat(e.target.value))}
                            size="small"
                            sx={{ width: '100px' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            inputProps={{ step: "0.1", min: "0" }}
                            value={tempBenchmark.highEngagement}
                            onChange={(e) => handleChange('highEngagement', parseFloat(e.target.value))}
                            size="small"
                            sx={{ width: '100px' }}
                          />
                        </TableCell>
                        <TableCell align="right">{benchmark.lastUpdated}</TableCell>
                        <TableCell align="right">
                          <Button 
                            onClick={handleSave}
                            disabled={isSaving}
                            size="small"
                            variant="contained"
                            color="primary"
                            sx={{ mr: 1 }}
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button 
                            onClick={handleCancel}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell align="right">{benchmark.lowEngagement}%</TableCell>
                        <TableCell align="right">{benchmark.averageEngagement}%</TableCell>
                        <TableCell align="right">{benchmark.highEngagement}%</TableCell>
                        <TableCell align="right">{benchmark.lastUpdated}</TableCell>
                        <TableCell align="right">
                          <Button 
                            onClick={() => handleEdit(benchmark)}
                            size="small"
                            variant="outlined"
                            color="primary"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Note: These benchmarks are used to categorize engagement rates in analytics reports.
            Values are percentage-based (e.g., 3.5 means 3.5% engagement rate).
          </Typography>
        </Box>
      </Box>
    </AdminGuard>
  );
} 