import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase/admin';
import { getServerSession } from 'next-auth';
import { logger } from '../../../../lib/logging/logger';
import { authOptions } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Access id safely - either use type assertion or check for existence
    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }
    
    const firestore = getFirestore();
    
    try {
      // Fetch data from Firestore
      // Stats
      const statsSnapshot = await firestore.collection('users').doc(userId).collection('stats').get();
      const stats = statsSnapshot.docs.map(doc => doc.data());
      
      // Upcoming posts
      const postsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('posts')
        .where('status', 'in', ['scheduled', 'draft'])
        .where('scheduledFor', '>=', new Date())
        .orderBy('scheduledFor', 'asc')
        .limit(5)
        .get();
      
      const upcomingPosts = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status === 'scheduled' ? 'ready' : 'draft',
        scheduledFor: formatScheduledDate(doc.data().scheduledFor)
      }));
      
      // Platform stats
      const platformsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('platformStats')
        .get();
      
      const platforms = platformsSnapshot.docs.map(doc => doc.data());
      
      // Top performing posts
      const topPostsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('posts')
        .where('status', '==', 'published')
        .orderBy('engagementRate', 'desc')
        .limit(3)
        .get();
      
      const topPosts = topPostsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          likes: data.metrics?.likes || 0,
          comments: data.metrics?.comments || 0,
          shares: data.metrics?.shares || 0
        };
      });
      
      // Recent activities
      const activitiesSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('activities')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
      
      const recentActivities = activitiesSnapshot.docs.map(doc => doc.data());
      
      // Notifications
      const notificationsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
      
      const notifications = notificationsSnapshot.docs.map(doc => doc.data());
      
      // Return the dashboard data with empty arrays when no data is found
      return NextResponse.json({
        stats: stats,
        upcomingPosts: upcomingPosts,
        platforms: platforms,
        topPosts: topPosts,
        recentActivities: recentActivities,
        notifications: notifications
      });
      
    } catch (error: any) {
      logger.error({ 
        type: 'dashboard_stats_db_error', 
        error: error.message, 
        userId 
      }, 'Error fetching dashboard stats from database');
      
      // If there's a database error, return empty data instead of fallbacks
      return NextResponse.json({
        stats: [],
        upcomingPosts: [],
        platforms: [],
        topPosts: [],
        recentActivities: [],
        notifications: []
      });
    }
    
  } catch (error: any) {
    logger.error({ 
      type: 'dashboard_stats_error', 
      error: error.message 
    }, 'Dashboard stats api error');
    
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

// Helper function to format scheduled date
function formatScheduledDate(date: any): string {
  if (!date) return 'Not scheduled';
  
  const timestamp = date instanceof Date ? date : date.toDate();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Check if it's today
  if (timestamp.toDateString() === now.toDateString()) {
    return `Today, ${timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // Check if it's tomorrow
  if (timestamp.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // If it's another day, show the day of week
  return `${timestamp.toLocaleDateString('en-US', { weekday: 'short' })}, ${timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
} 