'use client';

import React from 'react';
import { Box, useTheme } from '@mui/material';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';

// Define the data type
type EngagementData = {
  date: string;
  value: number;
};

type EngagementGraphProps = {
  data: EngagementData[];
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Format number with commas
const formatNumber = (value: number) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function EngagementGraph({ data }: EngagementGraphProps) {
  const theme = useTheme();
  
  // Process data for display
  const chartData = data.map(item => ({
    date: formatDate(item.date),
    value: item.value,
    originalDate: item.date // Keep original for sorting
  }));
  
  // Sort by date if needed
  chartData.sort((a, b) => {
    return new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime();
  });
  
  // Calculate gradient colors
  const primaryColor = theme.palette.primary.main;
  const primaryLightColor = theme.palette.primary.light;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            boxShadow: 2,
            borderRadius: 1,
            p: 1.5,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Box sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
            {label}
          </Box>
          <Box sx={{ color: primaryColor, display: 'flex', alignItems: 'center' }}>
            <Box
              component="span"
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: primaryColor,
                mr: 1,
              }}
            />
            Engagement: {formatNumber(payload[0].value)}
          </Box>
        </Box>
      );
    }
    return null;
  };
  
  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8} />
              <stop offset="95%" stopColor={primaryLightColor} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke={theme.palette.grey[200]} 
          />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            tickFormatter={formatNumber}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={10}
            formatter={(value) => (
              <span style={{ color: theme.palette.text.primary, fontSize: 14 }}>
                Total Engagement
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Engagement"
            stroke={primaryColor}
            fillOpacity={1}
            fill="url(#engagementGradient)"
            activeDot={{ r: 6, strokeWidth: 0 }}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
} 