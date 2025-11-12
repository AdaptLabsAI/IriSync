import { NextResponse } from 'next/server';
import { firestore } from '@/lib/core/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

export async function GET() {
  try {
    // Fetch published roadmap items from Firestore
    const roadmapRef = collection(firestore, 'roadmapItems');
    const q = query(
      roadmapRef, 
      where('public', '==', true),
      orderBy('createdAt', 'desc')
    );
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
    
    return NextResponse.json({ items: roadmapItems });
  } catch (error) {
    console.error('Error fetching roadmap items:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch roadmap items',
      items: []
    }, { status: 500 });
  }
} 