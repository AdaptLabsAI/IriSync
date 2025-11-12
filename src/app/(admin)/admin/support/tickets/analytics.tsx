import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A020F0', '#FF6384', '#36A2EB', '#FFCE56'];

export default function SupportTicketAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/support/tickets/analytics')
      .then(res => res.json())
      .then(setData)
      .catch(e => setError(e.message || 'Error loading analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="error">{error}</Typography></Box>;
  if (!data) return null;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Support Ticket Analytics</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
          <Typography variant="h6">Total Tickets</Typography>
          <Typography variant="h3">{data.total}</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
          <Typography variant="h6">Open</Typography>
          <Typography variant="h3" color="primary">{data.open}</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
          <Typography variant="h6">Closed</Typography>
          <Typography variant="h3" color="secondary">{data.closed}</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
          <Typography variant="h6">Avg. Response Time</Typography>
          <Typography variant="h4">{data.avgResponseTime} min</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
          <Typography variant="h6">Avg. Close Time</Typography>
          <Typography variant="h4">{data.avgCloseTime} min</Typography>
        </Paper>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Paper sx={{ p: 3, flex: '1 1 350px', minWidth: '300px' }}>
          <Typography variant="subtitle1">Satisfaction Ratings</Typography>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={Object.entries(data.satisfaction).map(([k, v]) => ({ name: k, value: v }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                {Object.entries(data.satisfaction).map((entry, idx) => <Cell key={entry[0]} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
        <Paper sx={{ p: 3, flex: '1 1 350px', minWidth: '300px' }}>
          <Typography variant="subtitle1">Tickets by Priority</Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Object.entries(data.byPriority).map(([k, v]) => ({ name: k, value: v }))}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
        <Paper sx={{ p: 3, flex: '1 1 350px', minWidth: '300px' }}>
          <Typography variant="subtitle1">Tickets by Tag</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {Object.entries(data.byTag).map(([tag, count], idx) => (
              <Chip key={tag} label={`${tag}: ${count}`} color={COLORS[idx % COLORS.length] as any} />
            ))}
          </Box>
        </Paper>
        <Paper sx={{ p: 3, flex: '1 1 350px', minWidth: '300px' }}>
          <Typography variant="subtitle1">Tickets by Assignee</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {Object.entries(data.byAssignedTo).map(([assignee, count], idx) => (
              <Chip key={assignee} label={`${assignee}: ${count}`} color={COLORS[idx % COLORS.length] as any} />
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
} 