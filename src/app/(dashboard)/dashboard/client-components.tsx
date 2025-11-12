'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Avatar, 
  Chip, 
  Stack, 
  CardActions, 
  Divider,
  Button,
  CardHeader
} from '@mui/material';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import types from server component
import type { DashboardData, ClientComponentsProps } from './types';

// Import DashboardStats
const DashboardStats = dynamic(() => import('@/components/dashboard/DashboardStats'), { ssr: false });

// Error Boundary Component
function ClientErrorBoundary({ children, apiEndpoint }: { children: React.ReactNode, apiEndpoint: string }) {
  return <>{children}</>;
}

// ContentPerformance component
function ContentPerformance({ posts }: { posts: any[] }) {
  return (
    <Box>
      {posts.length === 0 ? (
        <Typography>No top-performing content available.</Typography>
      ) : (
        <Stack spacing={2}>
          {posts.map((post) => (
            <Card key={post.id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">{post.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Platform: {post.platform}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                  <Typography variant="body2">Likes: {post.likes}</Typography>
                  <Typography variant="body2">Comments: {post.comments}</Typography>
                  <Typography variant="body2">Shares: {post.shares}</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ActivityWidget component
function ActivityWidget({ activities }: { activities: any[] }) {
  return (
    <Box>
      {activities.length === 0 ? (
        <Typography>No recent activities.</Typography>
      ) : (
        <Stack spacing={2}>
          {activities.map((activity) => (
            <Box key={activity.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={activity.user.avatar} sx={{ width: 40, height: 40 }}>
                {activity.user.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">{activity.user.name}</Typography>
                <Typography variant="body2">{activity.content}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(activity.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// NotificationsPanel component
function NotificationsPanel({ notifications }: { notifications: any[] }) {
  return (
    <Box>
      {notifications.length === 0 ? (
        <Typography>No notifications.</Typography>
      ) : (
        <Stack spacing={2}>
          {notifications.map((notification) => (
            <Box 
              key={notification.id} 
              sx={{ 
                p: 2, 
                borderRadius: 1,
                bgcolor: notification.read ? 'background.paper' : 'action.hover'
              }}
            >
              <Typography variant="subtitle2">{notification.title}</Typography>
              <Typography variant="body2">{notification.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(notification.time).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// UpcomingPosts component
function UpcomingPosts({ posts }: { posts: any[] }) {
  return (
    <Box>
      {posts.length === 0 ? (
        <Typography>No upcoming posts scheduled.</Typography>
      ) : (
        <Stack spacing={2}>
          {posts.map(post => (
            <Box key={post.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle1">{post.title}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Chip size="small" label={post.platform} />
                <Typography variant="caption">
                  {new Date(post.scheduledFor).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// PlatformOverview component
function PlatformOverview({ platforms }: { platforms: any[] }) {
  return (
    <Box>
      {platforms.length === 0 ? (
        <Typography>No connected platforms.</Typography>
      ) : (
        <Stack spacing={2}>
          {platforms.map(platform => (
            <Box key={platform.name} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="subtitle2">{platform.name}</Typography>
                <Typography variant="body2">{platform.followers} followers</Typography>
              </Box>
              <Box 
                sx={{ 
                  height: 4, 
                  borderRadius: 2, 
                  bgcolor: 'grey.200',
                  overflow: 'hidden'
                }}
              >
                <Box 
                  sx={{ 
                    height: '100%', 
                    width: `${platform.progress}%`, 
                    bgcolor: platform.color || 'primary.main'
                  }} 
                />
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// Permission error message component
function PermissionErrorMessage({ message }: { message: string }) {
  return (
    <Box sx={{ p: 3, mb: 3, bgcolor: 'error.lighter', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ color: 'error.main', mb: 1 }}>
        Firebase Permission Error
      </Typography>
      <Typography>{message}</Typography>
      <Button 
        variant="contained" 
        color="primary" 
        sx={{ mt: 2 }}
        onClick={() => window.location.href = '/logout'}
      >
        Sign Out and Try Again
      </Button>
    </Box>
  );
}

// Main dashboard client component
export default function ClientComponents({ 
  data, 
  permissionError,
  errorMessage
}: ClientComponentsProps) {
  return (
    <>
      {permissionError && <PermissionErrorMessage message={errorMessage} />}
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here&apos;s an overview of your social media performance.
        </Typography>
      </Box>
      
      <DashboardStats stats={data.stats} />
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 4, mx: -2 }}>
        {/* Left Column */}
        <Box sx={{ width: { xs: '100%', lg: '70%' }, p: 2 }}>
          {/* Upcoming Posts */}
          <ClientErrorBoundary apiEndpoint="/api/content/posts">
            <Card sx={{ mb: 4 }}>
              <CardHeader 
                title="Upcoming Posts" 
                action={
                  <Button 
                    component={Link} 
                    href="/dashboard/content/calendar"
                    variant="text" 
                    color="primary"
                    sx={{ mr: 1 }}
                  >
                    View Calendar
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                <UpcomingPosts posts={data.upcomingPosts} />
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button 
                  component={Link} 
                  href="/dashboard/content/create"
                  variant="contained" 
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  Create New Post
                </Button>
              </CardActions>
            </Card>
          </ClientErrorBoundary>
          
          {/* Top Performing Content */}
          <ClientErrorBoundary apiEndpoint="/api/content">
            <Card sx={{ mb: 4 }}>
              <CardHeader title="Top Performing Content" />
              <Divider />
              <CardContent>
                <ContentPerformance posts={data.topPosts} />
              </CardContent>
            </Card>
          </ClientErrorBoundary>
          
          {/* Recent Activity */}
          <ClientErrorBoundary apiEndpoint="/api/activities">
            <Card>
              <CardHeader title="Recent Activity" />
              <Divider />
              <CardContent>
                <ActivityWidget activities={data.recentActivities} />
              </CardContent>
            </Card>
          </ClientErrorBoundary>
        </Box>
        
        {/* Right Column */}
        <Box sx={{ width: { xs: '100%', lg: '30%' }, p: 2 }}>
          {/* Platform Overview */}
          <ClientErrorBoundary apiEndpoint="/api/platforms">
            <Card sx={{ mb: 4 }}>
              <CardHeader title="Platform Overview" />
              <Divider />
              <CardContent>
                <PlatformOverview platforms={data.platforms} />
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button 
                  component={Link} 
                  href="/dashboard/settings/connections"
                  variant="text" 
                  color="primary"
                >
                  Manage Connections
                </Button>
              </CardActions>
            </Card>
          </ClientErrorBoundary>
          
          {/* Notifications */}
          <ClientErrorBoundary apiEndpoint="/api/notifications">
            <Card>
              <CardHeader title="Notifications" />
              <Divider />
              <CardContent>
                <NotificationsPanel notifications={data.notifications} />
              </CardContent>
            </Card>
          </ClientErrorBoundary>
        </Box>
      </Box>
    </>
  );
} 