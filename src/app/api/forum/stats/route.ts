import { NextResponse } from 'next/server';
import { getForumStats } from '@/lib/features/forum/stats';

export async function GET() {
  try {
    // Fetch forum statistics from the database
    const stats = await getForumStats();
    
    return NextResponse.json({ 
      success: true, 
      stats
    });
  } catch (error) {
    console.error('Error fetching forum statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch forum statistics' 
      },
      { status: 500 }
    );
  }
} 