import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, serverTimestamp, increment } from '@/lib/core/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, taskType, model, tier, cost, tokenUsage } = body;

    if (!taskType || !model || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const firestore = getFirestore();
    
    // Get current date information for tracking
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-indexed, so add 1
    const day = now.getDate();
    
    // Create a usage record
    const usageRecord = {
      userId: userId || 'anonymous',
      taskType,
      model,
      tier,
      timestamp: serverTimestamp(),
      year,
      month,
      day,
      cost: cost || 0
    };
    
    // Log to main usage tracking collection
    await firestore.collection('aiUsage').add(usageRecord);
    
    // If we have a user ID, also update their usage stats
    if (userId) {
      const monthKey = `${year}_${month}`;
      
      // Update monthly stats
      const userMonthlyStatsRef = firestore
        .collection('users')
        .doc(userId)
        .collection('aiStats')
        .doc(monthKey);
      
      await userMonthlyStatsRef.set({
        [`tasks.${taskType}`]: increment(1),
        [`models.${model}`]: increment(1),
        totalRequests: increment(1),
        totalTokensUsed: increment(tokenUsage || 0),
        lastUsed: serverTimestamp()
      }, { merge: true });
      
      // If not on enterprise tier, update token usage
      if (tier !== 'enterprise') {
        await firestore.collection('users').doc(userId).update({
          'tokens.used': increment(tokenUsage || 0),
          'tokens.lastUpdated': serverTimestamp()
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking AI usage:', error);
    return NextResponse.json(
      { error: 'Failed to track AI usage' },
      { status: 500 }
    );
  }
} 