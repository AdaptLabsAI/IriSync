import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { withAdmin } from '@/lib/features/auth/route-handlers';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// GET a specific roadmap item
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Extract ID from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    const docRef = doc(firestore, 'roadmapItems', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 });
    }
    
    const data = docSnap.data();
    const roadmapItem = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
    
    return NextResponse.json(roadmapItem);
  } catch (error) {
    console.error('Error fetching roadmap item:', error);
    return NextResponse.json({ error: 'Failed to fetch roadmap item' }, { status: 500 });
  }
});

// PUT/PATCH update a roadmap item
export const PUT = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Extract ID from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.description || !data.status || !data.category || !data.timeframe) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const docRef = doc(firestore, 'roadmapItems', id);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 });
    }
    
    // Update the document
    const updateData = {
      title: data.title,
      description: data.description,
      status: data.status,
      category: data.category,
      timeframe: data.timeframe,
      updatedAt: serverTimestamp(),
      updatedBy: adminUser.email || adminUser.id || 'Unknown'
    };
    
    await updateDoc(docRef, updateData);
    
    return NextResponse.json({ 
      id: id,
      ...updateData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating roadmap item:', error);
    return NextResponse.json({ error: 'Failed to update roadmap item' }, { status: 500 });
  }
});

// DELETE a roadmap item
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Extract ID from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    const docRef = doc(firestore, 'roadmapItems', id);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 });
    }
    
    // Delete the document
    await deleteDoc(docRef);
    
    return NextResponse.json({ message: 'Roadmap item deleted successfully' });
  } catch (error) {
    console.error('Error deleting roadmap item:', error);
    return NextResponse.json({ error: 'Failed to delete roadmap item' }, { status: 500 });
  }
}); 