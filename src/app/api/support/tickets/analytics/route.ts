import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Collection names
const TICKETS_COLLECTION = 'supportTickets';

// Type definitions
interface TicketChanges {
  total: number;
  open: number;
  closed: number;
  avgResponseTime: number;
  avgCloseTime: number;
  avgSatisfaction: number;
}

interface TicketAnalytics {
  total: number;
  open: number;
  pending: number;
  closed: number;
  converted: number;
  avgResponseTime: number;
  avgCloseTime: number;
  avgSatisfaction: number;
  byPriority: { low: number; medium: number; high: number; urgent: number };
  byStatus: { open: number; pending: number; closed: number; converted: number };
  byTag: Record<string, number>;
  byAssignedTo: Record<string, number>;
  satisfaction: Record<string, number>;
  responseTimeDistribution: Record<string, number>;
  byTimeOfDay: { morning: number; afternoon: number; evening: number; night: number };
  byDayOfWeek: { Sunday: number; Monday: number; Tuesday: number; Wednesday: number; Thursday: number; Friday: number; Saturday: number };
  changes?: TicketChanges;
}

/**
 * Support ticket analytics API endpoint
 * Provides comprehensive statistics about support tickets for the admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request parameters
    const url = new URL(request.url);
    const timeFrame = url.searchParams.get('timeFrame') || 'all';
    const compareTo = url.searchParams.get('compareTo') || '';
    
    // Define time range filters
    let startDate;
    let compareStartDate;
    let compareEndDate;
    
    const now = new Date();
    
    switch (timeFrame) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    // Define comparison period if requested
    if (compareTo) {
      const duration = timeFrame === 'all' ? 'year' : timeFrame;
      const durationInMs = getDurationInMs(duration);
      
      compareEndDate = new Date(startDate);
      compareStartDate = new Date(compareEndDate.getTime() - durationInMs);
    }

    // Fetch all tickets
    const ticketsRef = collection(firestore, TICKETS_COLLECTION);
    const ticketsQuery = query(
      ticketsRef,
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(ticketsQuery);
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fetch comparison tickets if requested
    let comparisonTickets: any[] = [];
    if (compareStartDate && compareEndDate) {
      const comparisonQuery = query(
        ticketsRef,
        where('createdAt', '>=', compareStartDate),
        where('createdAt', '<', compareEndDate),
        orderBy('createdAt', 'desc')
      );
      
      const comparisonSnapshot = await getDocs(comparisonQuery);
      comparisonTickets = comparisonSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Calculate analytics metrics
    const analytics = calculateAnalytics(tickets);
    
    // Calculate comparison metrics if available
    let comparison = null;
    if (comparisonTickets.length > 0) {
      comparison = calculateAnalytics(comparisonTickets);
    }
    
    // Add percentage changes if comparison data available
    if (comparison) {
      analytics.changes = calculatePercentageChanges(analytics, comparison);
    }

    return NextResponse.json(analytics);
  } catch (error: any) {
    logger.error('Error generating ticket analytics', { error });
    return NextResponse.json({ 
      error: 'Failed to generate analytics',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Calculate analytics from ticket data
 */
function calculateAnalytics(tickets: any[]): TicketAnalytics {
  // Basic counts
  const total = tickets.length;
  const open = tickets.filter(t => t.status === 'open').length;
  const pending = tickets.filter(t => t.status === 'pending').length;
  const closed = tickets.filter(t => t.status === 'closed').length;
  const converted = tickets.filter(t => t.status === 'converted').length;
  
  // Response times
  let totalResponseTime = 0;
  let responseCount = 0;
  let totalCloseTime = 0;
  let closeCount = 0;
  
  tickets.forEach(ticket => {
    if (ticket.firstResponseAt && ticket.createdAt) {
      const responseTime = getTimeDifference(ticket.firstResponseAt, ticket.createdAt);
      if (responseTime > 0) {
        totalResponseTime += responseTime;
        responseCount++;
      }
    }
    
    if (ticket.closedAt && ticket.createdAt) {
      const closeTime = getTimeDifference(ticket.closedAt, ticket.createdAt);
      if (closeTime > 0) {
        totalCloseTime += closeTime;
        closeCount++;
      }
    }
  });
  
  const avgResponseTime = responseCount > 0 
    ? Math.round(totalResponseTime / responseCount) 
    : 0;
    
  const avgCloseTime = closeCount > 0 
    ? Math.round(totalCloseTime / closeCount) 
    : 0;
  
  // Satisfaction ratings
  const satisfactionRatings = tickets
    .filter(t => t.satisfactionRating)
    .map(t => t.satisfactionRating);
    
  const avgSatisfaction = satisfactionRatings.length > 0
    ? satisfactionRatings.reduce((sum: number, rating: number) => sum + rating, 0) / satisfactionRatings.length
    : 0;
  
  // Distribution by priority
  const byPriority = {
    low: tickets.filter(t => t.priority === 'low').length,
    medium: tickets.filter(t => t.priority === 'medium').length,
    high: tickets.filter(t => t.priority === 'high').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length
  };
  
  // Distribution by status
  const byStatus = {
    open,
    pending,
    closed,
    converted
  };
  
  // Distribution by tags
  const byTag: Record<string, number> = {};
  tickets.forEach(ticket => {
    if (Array.isArray(ticket.tags)) {
      ticket.tags.forEach((tag: string) => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
    }
  });
  
  // Distribution by assigned to
  const byAssignedTo: Record<string, number> = {};
  tickets.forEach(ticket => {
    if (ticket.assignedTo) {
      byAssignedTo[ticket.assignedTo] = (byAssignedTo[ticket.assignedTo] || 0) + 1;
    } else {
      byAssignedTo['unassigned'] = (byAssignedTo['unassigned'] || 0) + 1;
    }
  });
  
  // Satisfaction distribution
  const satisfaction: Record<string, number> = {
    'Excellent (5)': satisfactionRatings.filter(r => r === 5).length,
    'Good (4)': satisfactionRatings.filter(r => r === 4).length,
    'Average (3)': satisfactionRatings.filter(r => r === 3).length,
    'Poor (2)': satisfactionRatings.filter(r => r === 2).length,
    'Very Poor (1)': satisfactionRatings.filter(r => r === 1).length
  };
  
  // Response time distribution
  const responseTimeDistribution = {
    'Under 15 minutes': 0,
    '15-60 minutes': 0,
    '1-4 hours': 0,
    '4-24 hours': 0,
    'Over 24 hours': 0
  };
  
  tickets.forEach(ticket => {
    if (ticket.firstResponseAt && ticket.createdAt) {
      const responseTime = getTimeDifference(ticket.firstResponseAt, ticket.createdAt);
      
      if (responseTime <= 15) responseTimeDistribution['Under 15 minutes']++;
      else if (responseTime <= 60) responseTimeDistribution['15-60 minutes']++;
      else if (responseTime <= 240) responseTimeDistribution['1-4 hours']++;
      else if (responseTime <= 1440) responseTimeDistribution['4-24 hours']++;
      else responseTimeDistribution['Over 24 hours']++;
    }
  });
  
  // Time-based data
  const byTimeOfDay = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  };
  
  const byDayOfWeek = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0
  };
  
  tickets.forEach(ticket => {
    if (ticket.createdAt) {
      const date = new Date(ticket.createdAt.seconds ? ticket.createdAt.seconds * 1000 : ticket.createdAt);
      const hour = date.getHours();
      const day = date.getDay();
      
      // Time of day
      if (hour >= 5 && hour < 12) byTimeOfDay.morning++;
      else if (hour >= 12 && hour < 17) byTimeOfDay.afternoon++;
      else if (hour >= 17 && hour < 21) byTimeOfDay.evening++;
      else byTimeOfDay.night++;
      
      // Day of week
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      byDayOfWeek[days[day] as keyof typeof byDayOfWeek]++;
    }
  });
  
  return {
    total,
    open,
    pending,
    closed,
    converted,
    avgResponseTime,
    avgCloseTime,
    avgSatisfaction,
    byPriority,
    byStatus,
    byTag,
    byAssignedTo,
    satisfaction,
    responseTimeDistribution,
    byTimeOfDay,
    byDayOfWeek
  };
}

/**
 * Calculate percentage changes between current and previous periods
 */
function calculatePercentageChanges(current: TicketAnalytics, previous: TicketAnalytics): TicketChanges {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  return {
    total: calculateChange(current.total, previous.total),
    open: calculateChange(current.open, previous.open),
    closed: calculateChange(current.closed, previous.closed),
    avgResponseTime: calculateChange(current.avgResponseTime, previous.avgResponseTime),
    avgCloseTime: calculateChange(current.avgCloseTime, previous.avgCloseTime),
    avgSatisfaction: calculateChange(current.avgSatisfaction, previous.avgSatisfaction)
  };
}

/**
 * Get time difference in minutes between two timestamps
 */
function getTimeDifference(time1: any, time2: any): number {
  let date1: Date;
  let date2: Date;
  
  if (typeof time1 === 'string') {
    date1 = new Date(time1);
  } else if (time1.seconds) {
    date1 = new Date(time1.seconds * 1000);
  } else {
    return 0;
  }
  
  if (typeof time2 === 'string') {
    date2 = new Date(time2);
  } else if (time2.seconds) {
    date2 = new Date(time2.seconds * 1000);
  } else {
    return 0;
  }
  
  return Math.round((date1.getTime() - date2.getTime()) / (1000 * 60));
}

/**
 * Get duration in milliseconds for a time frame
 */
function getDurationInMs(timeFrame: string): number {
  switch (timeFrame) {
    case 'today':
      return 24 * 60 * 60 * 1000;
    case 'week':
      return 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return 30 * 24 * 60 * 60 * 1000;
    case 'quarter':
      return 90 * 24 * 60 * 60 * 1000;
    case 'year':
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 30 * 24 * 60 * 60 * 1000; // Default to month
  }
} 