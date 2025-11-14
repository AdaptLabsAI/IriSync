import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { firestore } from '@/lib/core/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Default platforms for fallback
const DEFAULT_PLATFORMS = [
  { id: 'facebook', name: 'Facebook' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'twitter', name: 'Twitter' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'reddit', name: 'Reddit' },
  { id: 'mastodon', name: 'Mastodon' },
  { id: 'threads', name: 'Threads' }
];

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // The user ID is the email in our system
    const userId = session.user.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }
    
    // Get user's connected platforms first (if available)
    const connectionsRef = collection(firestore, 'platformConnections');
    const connectionsQuery = query(connectionsRef, where('userId', '==', userId));
    const connectionsSnapshot = await getDocs(connectionsQuery);
    
    const connectedPlatforms = new Set<string>();
    
    if (!connectionsSnapshot.empty) {
      connectionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.platformId && data.status === 'connected') {
          connectedPlatforms.add(data.platformId);
        }
      });
    }
    
    // Then fetch all available platforms
    const platformsRef = collection(firestore, 'platforms');
    const platformsQuery = query(platformsRef, where('enabled', '==', true));
    const platformsSnapshot = await getDocs(platformsQuery);
    
    if (platformsSnapshot.empty) {
      // Return default platforms if no custom ones are defined
      return NextResponse.json({ 
        platforms: DEFAULT_PLATFORMS.map(platform => ({
          ...platform,
          connected: connectedPlatforms.has(platform.id)
        }))
      });
    }
    
    // Map the Firestore documents to platforms
    const platforms = platformsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || doc.id,
        connected: connectedPlatforms.has(doc.id)
      };
    });
    
    return NextResponse.json({ platforms });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    
    // Return default platforms on error
    return NextResponse.json(
      { 
        platforms: DEFAULT_PLATFORMS.map(platform => ({
          ...platform,
          connected: false
        })),
        error: 'Failed to load platforms from database'
      },
      { status: 500 }
    );
  }
} 