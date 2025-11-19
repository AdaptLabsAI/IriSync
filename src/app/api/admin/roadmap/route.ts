import { NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { withAdmin } from '@/lib/features/auth/route-handlers';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Helper function to check if user is admin
async function isUserAdmin(email: string | null | undefined) {
  if (!email) return false;
  
  try {
    const userRef = doc(firestore, 'users', email);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.isAdmin === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// GET all roadmap items (accessible by admins)
export const GET = withAdmin(async (_request: Request, adminUser: any) => {
  try {
    const roadmapRef = collection(firestore, 'roadmapItems');
    const q = query(roadmapRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const roadmapItems = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
    return NextResponse.json(roadmapItems);
  } catch (error) {
    console.error('Error fetching roadmap items:', error);
    return NextResponse.json({ error: 'Failed to fetch roadmap items' }, { status: 500 });
  }
});

// POST a new roadmap item (admin only)
export const POST = withAdmin(async (request: Request, adminUser: any) => {
  try {
    const data = await request.json();
    // Validate required fields
    if (!data.title || !data.description || !data.status || !data.category || !data.timeframe) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Create new roadmap item
    const roadmapRef = collection(firestore, 'roadmapItems');
    const newRoadmapItem = {
      title: data.title,
      description: data.description,
      status: data.status,
      category: data.category,
      timeframe: data.timeframe,
      voteCount: 0,
      public: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: adminUser.email || adminUser.id || 'Unknown'
    };
    const docRef = await addDoc(roadmapRef, newRoadmapItem);
    return NextResponse.json({ 
      id: docRef.id,
      ...newRoadmapItem,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating roadmap item:', error);
    return NextResponse.json({ error: 'Failed to create roadmap item' }, { status: 500 });
  }
}); 