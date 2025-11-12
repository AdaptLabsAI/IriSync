'use client';

import React from 'react';
import { 
  Box, Typography, Paper, Card, CardContent, 
  Button, IconButton, List, ListItem, ListItemText, 
  ListItemAvatar, Avatar, Chip, Divider, LinearProgress
} from '@mui/material';
import Grid from '@/components/ui/grid';
import AdminGuard from '@/components/admin/AdminGuard';
import Link from 'next/link';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  ContactSupport as SupportIcon,
  Payment as PaymentIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon,
  BugReport as BugReportIcon,
  Notifications as NotificationsIcon,
  Speed as SpeedIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
        
        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Active Users */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" color="text.secondary">Active Users</Typography>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PeopleIcon />
                  </Avatar>
                </Box>
                <Typography variant="h4">2,547</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <ArrowUpwardIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                  <Typography variant="body2" color="success.main">
                    +12% this week
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Revenue */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" color="text.secondary">Monthly Revenue</Typography>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <PaymentIcon />
                  </Avatar>
                </Box>
                <Typography variant="h4">$38,450</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <ArrowUpwardIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                  <Typography variant="body2" color="success.main">
                    +7.5% vs last month
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Support Tickets */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" color="text.secondary">Open Tickets</Typography>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <SupportIcon />
                  </Avatar>
                </Box>
                <Typography variant="h4">34</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <ArrowDownwardIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                  <Typography variant="body2" color="success.main">
                    -18% this week
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Content Items */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" color="text.secondary">Content Items</Typography>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <AssignmentIcon />
                  </Avatar>
                </Box>
                <Typography variant="h4">1,247</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <ArrowUpwardIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                  <Typography variant="body2" color="success.main">
                    +24% this month
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* System Health and Recent Activity */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* System Status */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">System Health</Typography>
                <IconButton component={Link} href="/admin/system-status">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <SpeedIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="API Response Time"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">124ms</Typography>
                          <Typography variant="body2" color="success.main">Healthy</Typography>
                        </Box>
                        <LinearProgress
                          value={30}
                          variant="determinate"
                          sx={{ width: '100%', borderRadius: 1, height: 6 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <StorageIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Database Status"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">12ms query time</Typography>
                          <Typography variant="body2" color="success.main">Optimal</Typography>
                        </Box>
                        <LinearProgress
                          value={25}
                          variant="determinate"
                          sx={{ width: '100%', borderRadius: 1, height: 6 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <BugReportIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Error Rate"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">0.4% error rate</Typography>
                          <Typography variant="body2" color="warning.main">Monitoring</Typography>
                        </Box>
                        <LinearProgress
                          value={40}
                          variant="determinate"
                          color="warning"
                          sx={{ width: '100%', borderRadius: 1, height: 6 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              </List>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button component={Link} href="/admin/system-status">
                  View System Status
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Activity</Typography>
                <IconButton component={Link} href="/admin/audit-logs">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="John Smith upgraded to Enterprise plan"
                    secondary="5 minutes ago"
                  />
                  <Chip label="SUBSCRIPTION" size="small" color="primary" />
                </ListItem>
                
                <Divider component="li" />
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <SupportIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="New support ticket: Issues with AI content creation"
                    secondary="22 minutes ago"
                  />
                  <Chip label="SUPPORT" size="small" color="warning" />
                </ListItem>
                
                <Divider component="li" />
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      <NotificationsIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="API rate limit exceeded for user alex@example.com"
                    secondary="1 hour ago"
                  />
                  <Chip label="ALERT" size="small" color="error" />
                </ListItem>
                
                <Divider component="li" />
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <TimelineIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Monthly analytics report generated"
                    secondary="2 hours ago"
                  />
                  <Chip label="ANALYTICS" size="small" color="success" />
                </ListItem>
              </List>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button component={Link} href="/admin/audit-logs">
                  View All Activity
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Quick Actions and New Users */}
        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Quick Actions</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 1.5 }}>
                    <Button
                      component={Link}
                      href="/admin/users"
                      variant="text"
                      color="primary"
                      sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
                    >
                      <PeopleIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body2">Manage Users</Typography>
                    </Button>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 1.5 }}>
                    <Button
                      component={Link}
                      href="/admin/support/tickets"
                      variant="text"
                      color="primary"
                      sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
                    >
                      <SupportIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body2">Support Tickets</Typography>
                    </Button>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 1.5 }}>
                    <Button
                      component={Link}
                      href="/admin/content"
                      variant="text"
                      color="primary"
                      sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
                    >
                      <AssignmentIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body2">Content Manager</Typography>
                    </Button>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 1.5 }}>
                    <Button
                      component={Link}
                      href="/admin/analytics"
                      variant="text"
                      color="primary"
                      sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
                    >
                      <TimelineIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body2">Analytics</Typography>
                    </Button>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Latest Signups */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">New Users</Typography>
                <Button component={Link} href="/admin/users" size="small">View All</Button>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>JS</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Jennifer Smith"
                    secondary="jennifer@example.com"
                  />
                  <Chip label="Creator" size="small" color="primary" variant="outlined" />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>RJ</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Robert Johnson"
                    secondary="robert@company.co"
                  />
                  <Chip label="Influencer" size="small" color="secondary" variant="outlined" />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>MC</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Marketing Corp LLC"
                    secondary="admin@marketingcorp.com"
                  />
                  <Chip label="Enterprise" size="small" color="success" variant="outlined" />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>AP</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Alice Parker"
                    secondary="alice@freelance.net"
                  />
                  <Chip label="Creator" size="small" color="primary" variant="outlined" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AdminGuard>
  );
} 