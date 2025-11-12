import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { firestore } from '@/lib/core/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.email;
    
    // Query Firestore for the user's storage connections
    const connectionsRef = collection(firestore, 'storageConnections');
    const connectionsQuery = query(connectionsRef, where('userId', '==', userId));
    const connectionsSnapshot = await getDocs(connectionsQuery);
    
    // Transform the data for the response
    const connections = connectionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        platform: data.platform,
        accountName: data.accountName,
        accountEmail: data.accountEmail,
        accountId: data.accountId,
        connected: data.connected,
        connectedAt: data.connectedAt,
        lastUsed: data.lastUsed
      };
    });
    
    // Log the successful request
    logger.info('Retrieved storage connections', { 
      userId, 
      connectionCount: connections.length 
    });
    
    return NextResponse.json({ connections });
  } catch (error) {
    // Log the error
    logger.error('Error retrieving storage connections', { error });
    
    return NextResponse.json(
      { error: 'Failed to retrieve storage connections' },
      { status: 500 }
    );
  }
} 