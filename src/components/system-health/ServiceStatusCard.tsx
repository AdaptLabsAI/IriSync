/**
 * Service Status Card Component
 * Displays the health status of an individual service
 */

'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Chip, LinearProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import { ServiceHealth, ServiceStatus } from '@/lib/features/system/models/health';
import { tokens } from '@/styles/tokens';

interface ServiceStatusCardProps {
  name: string;
  health: ServiceHealth;
  icon?: React.ReactNode;
}

const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({ name, health, icon }) => {
  // Determine status color and icon
  const getStatusConfig = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return {
          color: tokens.colors.state.success,
          bgcolor: tokens.colors.accent.teal + '15',
          icon: <CheckCircleIcon sx={{ color: tokens.colors.state.success }} />,
          label: 'Operational',
        };
      case 'degraded':
        return {
          color: tokens.colors.state.warning,
          bgcolor: tokens.colors.accent.orange + '15',
          icon: <WarningIcon sx={{ color: tokens.colors.state.warning }} />,
          label: 'Degraded',
        };
      case 'down':
        return {
          color: tokens.colors.state.error,
          bgcolor: tokens.colors.accent.red + '15',
          icon: <ErrorIcon sx={{ color: tokens.colors.state.error }} />,
          label: 'Down',
        };
    }
  };

  const statusConfig = getStatusConfig(health.status);

  return (
    <Card
      sx={{
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: tokens.shadows.lg,
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            {icon && <Box sx={{ color: tokens.colors.text.secondary }}>{icon}</Box>}
            <Typography variant="h6" fontWeight={tokens.typography.fontWeight.semibold} sx={{ fontSize: tokens.typography.fontSize.body }}>
              {name}
            </Typography>
          </Box>

          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            size="small"
            sx={{
              bgcolor: statusConfig.bgcolor,
              color: statusConfig.color,
              fontWeight: tokens.typography.fontWeight.semibold,
              border: `1px solid ${statusConfig.color}30`,
            }}
          />
        </Box>

        {/* Metrics */}
        <Box mb={2}>
          {health.latency !== undefined && (
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Response Time
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {health.latency.toFixed(0)}ms
              </Typography>
            </Box>
          )}

          {health.uptime !== undefined && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Uptime
                </Typography>
                <Typography variant="caption" fontWeight={600}>
                  {health.uptime.toFixed(2)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={health.uptime}
                sx={{
                  height: 6,
                  borderRadius: tokens.borderRadius.sm,
                  bgcolor: tokens.colors.gray[200],
                  '& .MuiLinearProgress-bar': {
                    bgcolor:
                      health.uptime >= 99
                        ? tokens.colors.state.success
                        : health.uptime >= 95
                        ? tokens.colors.state.warning
                        : tokens.colors.state.error,
                    borderRadius: tokens.borderRadius.sm,
                  },
                }}
              />
            </Box>
          )}
        </Box>

        {/* Message */}
        {health.message && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            {health.message}
          </Typography>
        )}

        {/* Last Checked */}
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
          Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ServiceStatusCard;
