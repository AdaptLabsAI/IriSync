import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';
import { logger } from '@/lib/core/logging/logger';
import { handleApiError } from '@/lib/features/auth/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    
    // Clear all completed todos for this user
    const todosRef = collection(firestore, 'todos');
    const completedTodosQuery = query(
      todosRef,
      where('userId', '==', userId),
      where('completed', '==', true)
    );
    
    const snapshot = await getDocs(completedTodosQuery);
    
    if (snapshot.empty) {
      return NextResponse.json({ message: 'No completed todos to delete' });
    }
    
    const batch = writeBatch(firestore);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    logger.info({
      type: 'todos_clear_completed',
      userId,
      count: snapshot.size
    }, `Cleared ${snapshot.size} completed todos for user ${userId}`);
    
    return NextResponse.json({ 
      message: `${snapshot.size} completed todos deleted successfully`,
      count: snapshot.size
    });
  } catch (error) {
    console.error('Error clearing completed todos:', error);
    logger.error({
      type: 'todos_clear_completed_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Failed to clear completed todos');
    
    return NextResponse.json(
      handleApiError(error, '/api/content/todos/clear-completed', 'clearing completed todos'),
      { status: 500 }
    );
  }
} 