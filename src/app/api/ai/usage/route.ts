import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore  } from '@/lib/core/firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Define the structure of the usage stats
interface UsageStats {
  used: number;
  total: number;
  tools: Record<string, number>;
}

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
    
    // Get the user's current subscription to determine their token limit
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const subscriptionsRef = collection(firestore, 'subscriptions');
    const subscriptionsQuery = query(subscriptionsRef, where('userId', '==', userId), where('status', '==', 'active'));
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    let totalTokens = 0; // No tokens without subscription
    
    if (!subscriptionsSnapshot.empty) {
      const subscription = subscriptionsSnapshot.docs[0].data();
      const tier = subscription.tier;
      
      // Set token limits based on subscription tier
      switch (tier) {
        case 'enterprise':
          totalTokens = 5000; // 5000 base tokens for Enterprise tier
          break;
        case 'influencer':
          totalTokens = 500; // 500 tokens/month for Influencer tier
          break;
        case 'creator':
          totalTokens = 100; // 100 tokens/month for Creator tier
          break;
        default:
          // No subscription tier means no access
          return NextResponse.json(
            { error: 'A paid subscription is required to access AI features. Please upgrade to Creator, Influencer, or Enterprise tier.' },
            { status: 403 }
          );
      }
    } else {
      // No active subscription found
      return NextResponse.json(
        { error: 'A paid subscription is required to access AI features. Please upgrade to Creator, Influencer, or Enterprise tier.' },
        { status: 403 }
      );
    }

    // Get the user's AI usage data (firestore already initialized above)

    const usageRef = doc(firestore, 'aiUsage', userId);
    const usageSnapshot = await getDoc(usageRef);
    
    if (!usageSnapshot.exists()) {
      // If no usage data exists, return default values
      const defaultUsage: UsageStats = {
        used: 0,
        total: totalTokens,
        tools: {}
      };
      
      return NextResponse.json({ usage: defaultUsage });
    }
    
    const usageData = usageSnapshot.data();
    const toolUsage = usageData.tools || {};
    
    // Calculate total usage across all tools
    const usedTokens = Object.values(toolUsage).reduce((sum: number, count) => sum + (count as number), 0);
    
    const usage: UsageStats = {
      used: usedTokens,
      total: totalTokens,
      tools: toolUsage
    };
    
    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    
    // Return default usage on error
    return NextResponse.json(
      { 
        usage: {
          used: 0,
          total: 100,
          tools: {}
        },
        error: 'Failed to load AI usage data'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    // Get the request body
    const { toolId, tokens } = await request.json();
    
    if (!toolId || typeof tokens !== 'number' || tokens <= 0) {
      return NextResponse.json(
        { error: 'Invalid request. Tool ID and token count are required.' },
        { status: 400 }
      );
    }
    
    // Get the user's current AI usage
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const usageRef = doc(firestore, 'aiUsage', userId);
    const usageSnapshot = await getDoc(usageRef);
    
    let currentUsage: Record<string, any> = {};
    
    if (usageSnapshot.exists()) {
      currentUsage = usageSnapshot.data();
    }
    
    // Update the usage for the specified tool
    const toolsUsage = currentUsage.tools || {};
    toolsUsage[toolId] = (toolsUsage[toolId] || 0) + tokens;
    
    // Update the document in Firestore
    await setDoc(usageRef, {
      userId,
      tools: toolsUsage,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    // Calculate total usage
    const totalUsed = Object.values(toolsUsage).reduce((sum: number, count) => sum + (count as number), 0);
    
    return NextResponse.json({
      success: true,
      usage: {
        used: totalUsed,
        tools: toolsUsage
      }
    });
  } catch (error) {
    console.error('Error updating AI usage:', error);
    
    return NextResponse.json(
      { error: 'Failed to update AI usage data' },
      { status: 500 }
    );
  }
} 