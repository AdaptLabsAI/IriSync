import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { firestore, getFirestore } from '@/lib/firebase/admin';
import { logger } from '@/lib/logging/logger';
import { verifyAuthentication } from '@/lib/auth/utils';

// Interface for calendar posts
interface CalendarPost {
  id: string;
  title: string;
  platform: string;
  scheduledFor: Date;
  status: 'ready' | 'draft';
  content: string;
  userId: string;
  organizationId?: string;
}

export async function GET(request: NextRequest) {
  let session;
  
  try {
    // Get the authenticated user session
    session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const db = getFirestore();
    
    // Get URL parameters for date range (default to next 3 months)
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    const startDate = startParam ? new Date(startParam) : new Date();
    const endDate = endParam ? new Date(endParam) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months ahead
    
    // Get user data and start both queries in parallel
    const [userDoc, userPostsSnapshot] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('contentPosts')
        .where('userId', '==', userId)
        .where('status', 'in', ['scheduled', 'draft'])
        .where('scheduledFor', '>=', startDate)
        .where('scheduledFor', '<=', endDate)
        .orderBy('scheduledFor', 'asc')
        .limit(100) // Limit to 100 posts
        .get()
    ]);
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const organizationId = userData?.currentOrganizationId;

    let allDocs = userPostsSnapshot.docs;

    // If user has an organization, fetch organization posts in parallel
    if (organizationId) {
      const orgPostsSnapshot = await db.collection('contentPosts')
        .where('organizationId', '==', organizationId)
        .where('status', 'in', ['scheduled', 'draft'])
        .where('scheduledFor', '>=', startDate)
        .where('scheduledFor', '<=', endDate)
        .orderBy('scheduledFor', 'asc')
        .limit(100)
        .get();
        
      // Combine and deduplicate
      allDocs = [...userPostsSnapshot.docs, ...orgPostsSnapshot.docs];
      const uniqueDocs = allDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      allDocs = uniqueDocs;
    }
    
    // Map to CalendarPost objects
    const posts: CalendarPost[] = allDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled',
        platform: data.platform || 'Unknown',
        scheduledFor: data.scheduledFor ? data.scheduledFor.toDate() : new Date(),
        status: (data.status === 'draft' ? 'draft' : 'ready') as 'ready' | 'draft',
        content: data.content || '',
        userId: data.userId || '',
        organizationId: data.organizationId
      };
    });
    
    // Sort by scheduled date
    posts.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
    
    return NextResponse.json({ posts, meta: { count: posts.length, dateRange: { start: startDate, end: endDate } } });
    
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    logger.error({
      type: 'calendar_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: session?.user?.id
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) {
      logger.warn({ type: 'request', method: 'POST', url: req.url, statusCode: 401 }, 'Unauthorized');
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }
    const body = await req.json();
    const { title, start, end, allDay, type = 'event', color, description, resourceIds } = body;
    if (!title || !start) {
      return NextResponse.json({ error: 'Bad Request', message: 'Title and start date are required' }, { status: 400 });
    }
    const eventData = {
      title,
      start: new Date(start),
      end: end ? new Date(end) : null,
      allDay: allDay || false,
      type,
      color: color || getTypeColor(type),
      description: description || '',
      resourceIds: resourceIds || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const eventRef = await firestore.collection('users').doc(userId).collection('calendarEvents').add(eventData);
    logger.info({ type: 'request', method: 'POST', url: req.url, statusCode: 201 }, 'Calendar POST success');
    logRequestDuration(req, 201, startTime);
    return NextResponse.json({ id: eventRef.id, message: 'Calendar event created successfully', ...eventData }, { status: 201 });
  } catch (error: any) {
    logger.error({ type: 'request', method: 'POST', url: req.url, error }, 'Calendar POST error');
    logRequestDuration(req, 500, startTime);
    return NextResponse.json({ error: 'An error occurred while processing your request', message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : 'Internal server error' }, { status: 500 });
  }
}

function getEventTitle(postData: any): string {
  if (postData.title) return postData.title;
  const content = postData.content || '';
  const truncatedContent = content.length > 30 ? content.substring(0, 30) + '...' : content;
  const platformLabels = postData.platforms?.map((p: string) => getPlatformEmoji(p)).join(' ') || '';
  return `${platformLabels} ${truncatedContent}`;
}
function addDefaultDuration(date: Date, type: string = 'post'): Date {
  if (!date) return new Date();
  const result = new Date(date);
  const durations: Record<string, number> = { 'post': 30, 'video': 60, 'story': 15, 'reel': 20, 'tweet': 10 };
  result.setMinutes(result.getMinutes() + (durations[type] || 30));
  return result;
}
function getPlatformEmoji(platform: string): string {
  const emojis: Record<string, string> = {
    'facebook': '📘', 'instagram': '📷', 'twitter': '🐦', 'linkedin': '💼', 'pinterest': '📌', 'tiktok': '🎵', 'youtube': '📹'
  };
  return emojis[platform] || '📱';
}
function getPlatformTitle(platform: string): string {
  const titles: Record<string, string> = {
    'facebook': 'Facebook', 'instagram': 'Instagram', 'twitter': 'Twitter', 'linkedin': 'LinkedIn', 'pinterest': 'Pinterest', 'tiktok': 'TikTok', 'youtube': 'YouTube'
  };
  return titles[platform] || platform.charAt(0).toUpperCase() + platform.slice(1);
}
function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    'facebook': '#3b5998', 'instagram': '#E1306C', 'twitter': '#1DA1F2', 'linkedin': '#0077B5', 'pinterest': '#E60023', 'tiktok': '#000000', 'youtube': '#FF0000'
  };
  return colors[platform] || '#6c757d';
}
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'event': '#6c757d', 'holiday': '#dc3545', 'campaign': '#28a745', 'meeting': '#007bff', 'deadline': '#ffc107', 'reminder': '#17a2b8'
  };
  return colors[type] || '#6c757d';
}
async function getBestTimeSuggestions(userId: string, startDate: Date, endDate: Date, platforms: string[]): Promise<Record<string, any>> {
  const analyticsSnapshot = await firestore.collection('users').doc(userId).collection('analytics').doc('bestTimes').get();
  if (!analyticsSnapshot.exists) return getDefaultTimeSuggestions(platforms);
  const analyticsData = analyticsSnapshot.data() || {};
  const suggestions: Record<string, any> = {};
  for (const platform of platforms) {
    if (analyticsData[platform]) {
      suggestions[platform] = analyticsData[platform];
    } else {
      suggestions[platform] = getDefaultTimeSuggestionForPlatform(platform);
    }
  }
  return suggestions;
}
function getDefaultTimeSuggestions(platforms: string[]): Record<string, any> {
  const suggestions: Record<string, any> = {};
  for (const platform of platforms) {
    suggestions[platform] = getDefaultTimeSuggestionForPlatform(platform);
  }
  return suggestions;
}
function getDefaultTimeSuggestionForPlatform(platform: string): Record<string, any> {
  const defaultTimes: Record<string, any> = {
    'facebook': { days: { 'monday': [9, 13, 15], 'tuesday': [9, 13, 15], 'wednesday': [9, 13, 15], 'thursday': [9, 13, 15], 'friday': [9, 13, 15], 'saturday': [12], 'sunday': [12] }, overall: [9, 13, 15] },
    'instagram': { days: { 'monday': [11, 13, 19], 'tuesday': [11, 13, 19], 'wednesday': [11, 13, 19], 'thursday': [11, 13, 19], 'friday': [11, 13, 19], 'saturday': [11, 19], 'sunday': [11, 19] }, overall: [11, 13, 19] },
    'twitter': { days: { 'monday': [8, 12, 16, 20], 'tuesday': [8, 12, 16, 20], 'wednesday': [8, 12, 16, 20], 'thursday': [8, 12, 16, 20], 'friday': [8, 12, 16, 20], 'saturday': [12, 16], 'sunday': [12, 16] }, overall: [8, 12, 16, 20] },
    'linkedin': { days: { 'monday': [9, 12, 16], 'tuesday': [9, 12, 16], 'wednesday': [9, 12, 16], 'thursday': [9, 12, 16], 'friday': [9, 12, 16], 'saturday': [], 'sunday': [] }, overall: [9, 12, 16] }
  };
  return defaultTimes[platform] || {
    days: { 'monday': [9, 13, 17], 'tuesday': [9, 13, 17], 'wednesday': [9, 13, 17], 'thursday': [9, 13, 17], 'friday': [9, 13, 17], 'saturday': [12], 'sunday': [12] }, overall: [9, 13, 17]
  };
}
function logRequestDuration(req: NextRequest, statusCode: number, startTime: [number, number]) {
  const duration = process.hrtime(startTime);
  const durationMs = Math.round((duration[0] * 1e9 + duration[1]) / 1e6);
  logger.info({ method: req.method, url: req.url, statusCode, durationMs }, `Request duration: ${durationMs}ms`);
} 