import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase/admin';
import { DocumentData } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600; // Revalidate this data every hour

// Helper function to add CORS headers to responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    // Pagination parameters
    const limit = parseInt(url.searchParams.get('limit') || '6');
    const page = parseInt(url.searchParams.get('page') || '1');
    const featured = url.searchParams.get('featured') === 'true';
    
    // Input validation
    if (isNaN(limit) || limit < 1 || limit > 20) {
      return NextResponse.json({ 
        error: 'Invalid limit parameter. Must be between 1 and 20',
        endpoint: '/api/testimonials'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ 
        error: 'Invalid page parameter. Must be 1 or greater',
        endpoint: '/api/testimonials'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    // Fetch testimonials from Firestore
    const db = getFirestore();
    let query = db.collection('testimonials')
      .where('isPublished', '==', true);
    
    // Add featured filter if requested
    if (featured) {
      query = query.where('featured', '==', true);
    }
    
    // Add sorting and pagination
    const skip = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc');
    
    // Execute query with pagination
    const testimonialSnapshot = await query.limit(limit + 1).offset(skip).get();
    
    // Check if we have any testimonials
    if (testimonialSnapshot.empty) {
      // Instead of returning an empty array, return an array with the testimonials-coming-soon message
      return NextResponse.json([
        {
          id: 'coming-soon',
          name: 'Testimonials Coming Soon',
          role: '',
          company: '',
          content: 'We\'re collecting feedback from our customers. Be the first to share your experience!',
          rating: 5,
          avatar: null,
          featured: true,
          isPublished: true,
          createdAt: new Date().toISOString(),
          isPlaceholder: true
        }
      ], { 
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      });
    }
    
    // Check if there are more results
    const hasMore = testimonialSnapshot.docs.length > limit;
    const docs = hasMore ? testimonialSnapshot.docs.slice(0, limit) : testimonialSnapshot.docs;
    
    // Transform the data
    const testimonials = docs.map((doc: DocumentData) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        role: data.role,
        company: data.company,
        content: data.content,
        rating: data.rating,
        avatar: data.avatar || null,
        featured: data.featured || false,
        isPublished: true,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
      };
    });
    
    // Return successful response with cache headers
    return NextResponse.json(testimonials, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    
    // Return a detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch testimonials data',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: '/api/testimonials'
      },
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}

// Add testimonial (admin only)
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Admin access required to create testimonials',
        endpoint: '/api/testimonials'
      }, { 
        status: 401,
        headers: corsHeaders 
      });
    }
    
    // Parse the request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.content) {
      return NextResponse.json({ 
        error: 'Bad Request',
        message: 'Name and content are required fields',
        endpoint: '/api/testimonials'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    // Validate rating if provided
    if (data.rating !== undefined) {
      const rating = Number(data.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ 
          error: 'Bad Request',
          message: 'Rating must be a number between 1 and 5',
          endpoint: '/api/testimonials'
        }, { 
          status: 400,
          headers: corsHeaders 
        });
      }
    }
    
    // Prepare testimonial data
    const testimonialData = {
      name: data.name,
      role: data.role || null,
      company: data.company || null,
      content: data.content,
      rating: data.rating ? Number(data.rating) : 5,
      avatar: data.avatar || null,
      featured: data.featured === true,
      isPublished: data.isPublished === false ? false : true,
      createdAt: new Date(),
      createdBy: (session.user as any).id || session.user.email,
      updatedAt: new Date()
    };
    
    // Add to Firestore
    const db = getFirestore();
    const testimonialRef = await db.collection('testimonials').add(testimonialData);
    
    // Return the created testimonial
    return NextResponse.json({
      id: testimonialRef.id,
      ...testimonialData,
      createdAt: testimonialData.createdAt.toISOString(),
      updatedAt: testimonialData.updatedAt.toISOString()
    }, { 
      status: 201,
      headers: corsHeaders 
    });
    
  } catch (error) {
    console.error('Error adding testimonial:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Server Error',
        message: 'Failed to add testimonial',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: '/api/testimonials'
      },
      { 
        status: 500,
        headers: corsHeaders 
      }
    );
  }
} 