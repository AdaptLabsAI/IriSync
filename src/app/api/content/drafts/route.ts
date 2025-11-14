import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { firestore } from '@/lib/core/firebase';
import { collection, doc, getDoc, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, deleteDoc, updateDoc } from 'firebase/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Interface for content draft
interface ContentDraft {
  id?: string;
  platform: string;
  type: string;
  content: string;
  hashtags: string[];
  scheduledDate?: string;
  status: 'draft' | 'scheduled' | 'published';
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

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
    
    // Parse query parameters
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    const status = url.searchParams.get('status') || 'draft';
    const limitParam = url.searchParams.get('limit');
    const maxResults = limitParam ? parseInt(limitParam, 10) : 20;
    
    // Build the query
    const draftsRef = collection(firestore, 'contentDrafts');
    let draftsQuery = query(
      draftsRef,
      where('userId', '==', userId),
      where('status', '==', status)
    );
    
    // Add platform filter if provided
    if (platform) {
      draftsQuery = query(
        draftsQuery,
        where('platform', '==', platform)
      );
    }
    
    // Add ordering and limit
    draftsQuery = query(
      draftsQuery,
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
    
    const draftsSnapshot = await getDocs(draftsQuery);
    
    // Map the documents to the ContentDraft interface
    const drafts: ContentDraft[] = draftsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        platform: data.platform || '',
        type: data.type || '',
        content: data.content || '',
        hashtags: data.hashtags || [],
        scheduledDate: data.scheduledDate,
        status: data.status || 'draft',
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : undefined
      };
    });
    
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Error fetching content drafts:', error);
    
    return NextResponse.json(
      { error: 'Failed to load content drafts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    // Get the draft data from the request
    const draftData: Partial<ContentDraft> = await request.json();
    
    // Validate required fields
    if (!draftData.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    // Create the draft document
    const draft: ContentDraft = {
      platform: draftData.platform || 'general',
      type: draftData.type || 'post',
      content: draftData.content,
      hashtags: draftData.hashtags || [],
      status: 'draft',
      userId
    };
    
    // Add the draft to Firestore
    const draftsRef = collection(firestore, 'contentDrafts');
    const docRef = await addDoc(draftsRef, {
      ...draft,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return NextResponse.json({ 
      draft: {
        id: docRef.id,
        ...draft
      },
      message: 'Draft saved successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating content draft:', error);
    
    return NextResponse.json(
      { error: 'Failed to save content draft' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    
    // Get the draft data from the request
    const draftData: Partial<ContentDraft> = await request.json();
    
    // Validate required fields
    if (!draftData.id) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }
    
    // Get the existing draft
    const draftRef = doc(firestore, 'contentDrafts', draftData.id);
    const draftSnapshot = await getDoc(draftRef);
    
    if (!draftSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }
    
    // Verify that this draft belongs to the user
    const existingDraft = draftSnapshot.data();
    
    if (existingDraft.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this draft' },
        { status: 403 }
      );
    }
    
    // Update the draft
    const updatedDraft = {
      ...draftData,
      updatedAt: serverTimestamp()
    };
    
    // Remove the ID from the update data
    delete updatedDraft.id;
    
    await updateDoc(draftRef, updatedDraft);
    
    return NextResponse.json({ 
      message: 'Draft updated successfully',
      draft: {
        id: draftData.id,
        ...updatedDraft
      }
    });
  } catch (error) {
    console.error('Error updating content draft:', error);
    
    return NextResponse.json(
      { error: 'Failed to update content draft' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    
    // Get the draft ID from the query parameters
    const url = new URL(request.url);
    const draftId = url.searchParams.get('id');
    
    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }
    
    // Get the existing draft
    const draftRef = doc(firestore, 'contentDrafts', draftId);
    const draftSnapshot = await getDoc(draftRef);
    
    if (!draftSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }
    
    // Verify that this draft belongs to the user
    const existingDraft = draftSnapshot.data();
    
    if (existingDraft.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this draft' },
        { status: 403 }
      );
    }
    
    // Delete the draft
    await deleteDoc(draftRef);
    
    return NextResponse.json({ 
      message: 'Draft deleted successfully',
      draftId
    });
  } catch (error) {
    console.error('Error deleting content draft:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete content draft' },
      { status: 500 }
    );
  }
} 