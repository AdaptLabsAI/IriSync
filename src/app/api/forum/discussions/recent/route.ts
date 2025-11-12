import { NextResponse } from 'next/server';
import { getRecentDiscussions } from '@/lib/features/forum/discussions';

export async function GET() {
  try {
    // Fetch recent discussions from the database
    const discussions = await getRecentDiscussions();
    
    return NextResponse.json({ 
      success: true, 
      discussions
    });
  } catch (error) {
    console.error('Error fetching recent discussions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recent discussions' 
      },
      { status: 500 }
    );
  }
} 