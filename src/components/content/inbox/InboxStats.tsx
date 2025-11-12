import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Schedule,
  Reply,
  Archive,
  Flag,
  People,
  Speed,
  Info as InfoIcon
} from '@mui/icons-material';
import { InboxMessage } from '@/lib/content/SocialInboxService';

export interface InboxStatsProps {
  messages: InboxMessage[];
  teamMembers: Array<{ userId: string; name: string; email: string; role: string }>;
  timeRange?: 'today' | 'week' | 'month';
  showTrends?: boolean;
  compact?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  subtitle?: string;
  progress?: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  subtitle,
  progress,
  onClick
}) => {
  const theme = useTheme();

  return (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: theme.shadows[4] } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ color: color }}>
            {icon}
          </Box>
          {trend !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {trend >= 0 ? (
                <TrendingUp sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
              ) : (
                <TrendingDown sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
              )}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: trend >= 0 ? 'success.main' : 'error.main',
                  fontWeight: 600
                }}
              >
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Box>
        
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          {value}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {title}
        </Typography>
        
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        
        {progress !== undefined && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                height: 4, 
                borderRadius: 2,
                backgroundColor: `${color}20`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color
                }
              }} 
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export const InboxStats: React.FC<InboxStatsProps> = ({
  messages,
  teamMembers,
  timeRange = 'today',
  showTrends = true,
  compact = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate basic stats
  const totalMessages = messages.length;
  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const repliedCount = messages.filter(m => m.status === 'replied').length;
  const archivedCount = messages.filter(m => m.status === 'archived').length;
  const flaggedCount = messages.filter(m => m.status === 'flagged').length;

  // Calculate response time
  const repliedMessages = messages.filter(m => 
    m.repliedAt && 
    m.receivedAt && 
    m.status === 'replied'
  );

  const avgResponseTime = (() => {
    if (repliedMessages.length === 0) return 'N/A';
    
    const responseTimes = repliedMessages.map(m => {
      const receivedTime = new Date(m.receivedAt!).getTime();
      const repliedTime = new Date(m.repliedAt!).getTime();
      return repliedTime - receivedTime;
    });
    
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    const avgTimeMs = totalResponseTime / responseTimes.length;
    
    const avgTimeMinutes = Math.floor(avgTimeMs / 60000);
    const avgTimeHours = Math.floor(avgTimeMinutes / 60);
    
    if (avgTimeHours > 24) {
      const days = Math.floor(avgTimeHours / 24);
      return `${days}d ${avgTimeHours % 24}h`;
    } else if (avgTimeHours > 0) {
      return `${avgTimeHours}h ${avgTimeMinutes % 60}m`;
    } else if (avgTimeMinutes > 0) {
      return `${avgTimeMinutes}m`;
    } else {
      return '<1m';
    }
  })();

  // Calculate platform distribution
  const platformStats = messages.reduce((acc, message) => {
    const platform = message.platformType || 'unknown';
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate team performance
  const teamStats = teamMembers.map(member => {
    const memberMessages = messages.filter(m => m.assignedTo === member.userId);
    const memberReplied = memberMessages.filter(m => m.status === 'replied');
    
    return {
      ...member,
      messageCount: memberMessages.length,
      repliedCount: memberReplied.length,
      responseRate: memberMessages.length > 0 ? (memberReplied.length / memberMessages.length) * 100 : 0
    };
  });

  // Response rate calculation
  const responseRate = totalMessages > 0 ? (repliedCount / totalMessages) * 100 : 0;

  // Mock trend data (in production, this would come from historical data)
  const trends = {
    messages: Math.random() * 20 - 10,
    responseTime: Math.random() * 30 - 15,
    responseRate: Math.random() * 10 - 5
  };

  const stats = [
    {
      title: 'Total Messages',
      value: totalMessages,
      icon: <Reply />,
      color: theme.palette.primary.main,
      trend: showTrends ? trends.messages : undefined,
      subtitle: `${unreadCount} unread`
    },
    {
      title: 'Response Rate',
      value: `${responseRate.toFixed(1)}%`,
      icon: <Speed />,
      color: theme.palette.success.main,
      trend: showTrends ? trends.responseRate : undefined,
      progress: responseRate,
      subtitle: `${repliedCount} replied`
    },
    {
      title: 'Avg Response Time',
      value: avgResponseTime,
      icon: <Schedule />,
      color: theme.palette.warning.main,
      trend: showTrends ? trends.responseTime : undefined,
      subtitle: `${repliedMessages.length} responses`
    },
    {
      title: 'Flagged',
      value: flaggedCount,
      icon: <Flag />,
      color: theme.palette.error.main,
      subtitle: 'Needs attention'
    }
  ];

  if (compact) {
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {stats.slice(0, isMobile ? 2 : 4).map((stat, index) => (
            <Box key={index} sx={{ flex: '1 1 calc(50% - 4px)', minWidth: '150px' }}>
              <StatCard {...stat} />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main Stats */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {stats.map((stat, index) => (
          <Box key={index} sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
            <StatCard {...stat} />
          </Box>
        ))}
      </Box>

      {/* Platform Distribution */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Platform Distribution
                </Typography>
                <Tooltip title="Messages by social media platform">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(platformStats).map(([platform, count]) => (
                  <Chip
                    key={platform}
                    label={`${platform}: ${count}`}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Team Performance */}
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Team Performance
                </Typography>
                <Tooltip title="Response rates by team member">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {teamStats.slice(0, 5).map((member) => (
                  <Box key={member.userId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {member.name || member.email}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={member.responseRate}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                      {member.responseRate.toFixed(0)}%
                    </Typography>
                  </Box>
                ))}
                {teamStats.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No team members assigned
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default InboxStats; 