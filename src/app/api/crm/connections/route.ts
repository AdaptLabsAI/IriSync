import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { firestore } from '@/lib/core/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { handleApiError } from '@/lib/features/auth/utils';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


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
    
    // Query Firestore for the user's CRM connections
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const connectionsRef = collection(firestore, 'crmConnections');
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
    logger.info('Retrieved CRM connections', { 
      userId, 
      connectionCount: connections.length 
    });
    
    return NextResponse.json({ connections });
  } catch (error) {
    // Log the error using standardized error handling
    logger.error('Error retrieving CRM connections', { error });
    
    return NextResponse.json(
      handleApiError(error, '/api/crm/connections', 'retrieving CRM connections'),
      { status: 500 }
    );
  }
} 