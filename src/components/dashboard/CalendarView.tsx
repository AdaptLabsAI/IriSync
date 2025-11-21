'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
  Calendar,
  dateFnsLocalizer,
  Views
} from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup localizer for calendar using date-fns
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarPost {
  id: string;
  title: string;
  platform: string;
  scheduledFor: Date;
  status: 'ready' | 'draft';
  content: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  platform: string;
  status: 'ready' | 'draft';
  content: string;
}

interface CalendarViewProps {
  posts: CalendarPost[];
}

export default function CalendarView({ posts }: CalendarViewProps) {
  // Convert posts to calendar events
  const events: CalendarEvent[] = posts.map(post => ({
    id: post.id,
    title: post.title,
    start: post.scheduledFor,
    end: addHours(post.scheduledFor, 1), // Default 1 hour duration
    platform: post.platform,
    status: post.status,
    content: post.content,
  }));

  // Custom event component to render in calendar
  const EventComponent = ({ event }: { event: CalendarEvent }) => (
    <Box
      sx={{
        height: '100%',
        bgcolor: event.status === 'ready' ? 'primary.light' : 'grey.300',
        borderRadius: 1,
        p: 0.5,
        color: event.status === 'ready' ? 'white' : 'text.primary',
        fontSize: '0.8rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        borderLeft: 3,
        borderColor: getPlatformColor(event.platform),
      }}
    >
      <Typography variant="caption" component="div" fontWeight="bold">
        {event.title}
      </Typography>
      <Typography variant="caption" component="div">
        {event.platform}
      </Typography>
    </Box>
  );

  // Get color based on platform
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return '#3b5998';
      case 'instagram':
        return '#e1306c';
      case 'twitter':
        return '#1da1f2';
      case 'linkedin':
        return '#0077b5';
      case 'pinterest':
        return '#e60023';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <Box sx={{ height: '70vh' }}>
      {posts.length === 0 ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            p: 4
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>No scheduled content</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            When you schedule content, it will appear on this calendar.
          </Typography>
        </Box>
      ) : (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.MONTH}
          views={['month', 'week', 'day']}
          tooltipAccessor={(event: any) => `${event.title} - ${event.platform}`}
          components={{
            event: EventComponent,
          }}
          style={{ height: '100%' }}
        />
      )}
    </Box>
  );
} 