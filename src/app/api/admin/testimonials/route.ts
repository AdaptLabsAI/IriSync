import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/core/firebase/admin';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();
const testimonialCollection = 'testimonials';

// GET all testimonials (admin only)
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const snapshot = await db.collection(testimonialCollection)
      .orderBy('createdAt', 'desc')
      .get();

    const testimonials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString() || null
    }));

    return NextResponse.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
});

// POST a new testimonial (admin only)
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'role', 'company', 'content', 'rating'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Prepare testimonial data
    const now = Timestamp.now();
    const testimonialData = {
      ...data,
      isPublished: data.isPublished || false,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser.id
    };

    // Add to Firestore
    const docRef = await db.collection(testimonialCollection).add(testimonialData);

    // Return the created testimonial
    return NextResponse.json({
      id: docRef.id,
      ...testimonialData,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}); 