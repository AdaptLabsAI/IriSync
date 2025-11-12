import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/core/firebase/admin';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();
const testimonialCollection = 'testimonials';

// Utility to extract testimonial ID from the request (for dynamic API routes)
function getTestimonialId(request: NextRequest): string | undefined {
  // For Next.js app router, extract from request.nextUrl.pathname
  const match = request.nextUrl.pathname.match(/\/testimonials\/(.+)$/);
  return match ? match[1] : undefined;
}

// GET a single testimonial (admin only)
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const id = getTestimonialId(request);
    if (!id) {
      return NextResponse.json({ error: 'Missing testimonial ID' }, { status: 400 });
    }
    const docRef = db.collection(testimonialCollection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });
    }

    const testimonial = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt.toDate().toISOString(),
      updatedAt: doc.data()?.updatedAt?.toDate().toISOString() || null
    };

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonial' },
      { status: 500 }
    );
  }
});

// PUT to update a testimonial (admin only)
export const PUT = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const id = getTestimonialId(request);
    if (!id) {
      return NextResponse.json({ error: 'Missing testimonial ID' }, { status: 400 });
    }
    const data = await request.json();
    const docRef = db.collection(testimonialCollection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });
    }

    // Update the testimonial
    const now = Timestamp.now();
    const updateData = {
      ...data,
      updatedAt: now,
      updatedBy: adminUser.id
    };

    await docRef.update(updateData);

    // Get the updated document
    const updatedDoc = await docRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
});

// DELETE a testimonial (admin only)
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const id = getTestimonialId(request);
    if (!id) {
      return NextResponse.json({ error: 'Missing testimonial ID' }, { status: 400 });
    }
    const docRef = db.collection(testimonialCollection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}); 