import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Define the structure of an AI tool
interface AITool {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'analysis' | 'media' | 'audience' | 'scheduling';
  status: 'complete' | 'partial' | 'planned';
  featureTier: 'creator' | 'influencer' | 'enterprise' | 'all';
  path: string;
}

// Default AI tools for fallback
const DEFAULT_TOOLS: AITool[] = [
  {
    id: 'content-generator',
    name: 'Content Generator',
    description: 'Generate social media posts, captions, and hashtags for any platform',
    category: 'content',
    status: 'complete',
    featureTier: 'all',
    path: '/dashboard/ai/content'
  },
  {
    id: 'hashtag-generator',
    name: 'Hashtag Generator',
    description: 'Generate relevant hashtags to increase content visibility',
    category: 'content',
    status: 'complete',
    featureTier: 'all',
    path: '/dashboard/ai/hashtags'
  },
  {
    id: 'content-analyzer',
    name: 'Content Analyzer',
    description: 'Analyze content sentiment, category, and engagement potential',
    category: 'analysis',
    status: 'complete',
    featureTier: 'all',
    path: '/dashboard/ai/analyze'
  },
  {
    id: 'media-analyzer',
    name: 'Media Analyzer',
    description: 'Analyze images for content, generate alt text, and detect inappropriate content',
    category: 'media',
    status: 'complete',
    featureTier: 'all',
    path: '/dashboard/ai/media'
  },
  {
    id: 'schedule-optimizer',
    name: 'Schedule Optimizer',
    description: 'Suggest optimal posting times based on audience engagement patterns',
    category: 'scheduling',
    status: 'partial',
    featureTier: 'influencer',
    path: '/dashboard/ai/schedule'
  },
  {
    id: 'response-assistant',
    name: 'Response Assistant',
    description: 'Generate response suggestions for comments and messages',
    category: 'content',
    status: 'partial',
    featureTier: 'enterprise',
    path: '/dashboard/ai/responses'
  }
];

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
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
    
    // Attempt to fetch AI tools from Firestore
    const toolsRef = collection(firestore, 'aiTools');
    const toolsQuery = query(toolsRef, where('enabled', '==', true));
    const toolsSnapshot = await getDocs(toolsQuery);
    
    if (toolsSnapshot.empty) {
      // Return default tools if no custom tools are defined
      return NextResponse.json({ tools: DEFAULT_TOOLS });
    }
    
    // Map the Firestore documents to the AITool interface
    const tools: AITool[] = toolsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unnamed Tool',
        description: data.description || '',
        category: data.category || 'content',
        status: data.status || 'planned',
        featureTier: data.featureTier || 'enterprise',
        path: data.path || `/dashboard/ai/${doc.id}`
      };
    });
    
    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Error fetching AI tools:', error);
    
    // Return default tools on error
    return NextResponse.json(
      { 
        tools: DEFAULT_TOOLS,
        error: 'Failed to load AI tools from database'
      },
      { status: 500 }
    );
  }
} 