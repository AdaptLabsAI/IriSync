/**
 * Testimonials Client Helper
 * 
 * Provides utilities for fetching testimonials with proper error handling
 * for unauthorized (401) and forbidden (403) responses.
 */

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
  content: string;
  rating: number;
  isPublished: boolean;
  createdAt: string;
  isPlaceholder?: boolean;
}

/**
 * Fallback testimonials to use when the API is unavailable or returns errors
 * These are used to ensure the UI still renders properly even without backend
 */
const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'fallback-1',
    name: 'Sarah Johnson',
    role: 'Marketing Director',
    company: 'TechStart Inc.',
    content: 'IriSync has transformed how we manage our social media presence. The AI-powered content suggestions save us hours every week!',
    rating: 5,
    avatar: '/images/profile2.png',
    isPublished: true,
    createdAt: new Date().toISOString(),
    isPlaceholder: true
  },
  {
    id: 'fallback-2',
    name: 'Michael Chen',
    role: 'Content Manager',
    company: 'GrowthCo',
    content: 'The analytics dashboard gives us incredible insights into our audience engagement. Highly recommend for any growing business.',
    rating: 5,
    avatar: '/images/profile3.png',
    isPublished: true,
    createdAt: new Date().toISOString(),
    isPlaceholder: true
  },
  {
    id: 'fallback-3',
    name: 'Emma Davis',
    role: 'Social Media Specialist',
    company: 'Brand Builders',
    content: 'Best social media management tool we\'ve used. The scheduling features and team collaboration tools are fantastic!',
    rating: 5,
    avatar: '/images/profile4.jpg',
    isPublished: true,
    createdAt: new Date().toISOString(),
    isPlaceholder: true
  }
];

// Track if we've already logged a warning about authorization failures
let hasLoggedAuthWarning = false;

/**
 * Fetch testimonials with proper error handling
 * 
 * This function:
 * - Handles 401 (Unauthorized) and 403 (Forbidden) responses gracefully
 * - Falls back to hardcoded testimonials instead of throwing errors
 * - Logs warnings only once to avoid console spam
 * - Returns an empty array for other errors
 * 
 * @param options - Optional fetch configuration
 * @returns Promise<Testimonial[]> Array of testimonials or fallback data
 */
export async function fetchTestimonials(
  options: {
    limit?: number;
    page?: number;
    featured?: boolean;
  } = {}
): Promise<Testimonial[]> {
  try {
    const { limit = 6, page = 1, featured = false } = options;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (limit) queryParams.set('limit', limit.toString());
    if (page) queryParams.set('page', page.toString());
    if (featured) queryParams.set('featured', 'true');
    
    const url = `/api/feedback/testimonials${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });
    
    // Handle 401 Unauthorized or 403 Forbidden - not a fatal error
    if (response.status === 401 || response.status === 403) {
      // Log warning only once to avoid console spam
      if (!hasLoggedAuthWarning) {
        console.warn(
          `Testimonials API returned ${response.status} ${response.statusText}. ` +
          'Using fallback testimonials. This is normal for unauthenticated users.'
        );
        hasLoggedAuthWarning = true;
      }
      
      // Return fallback testimonials instead of throwing
      return FALLBACK_TESTIMONIALS.slice(0, limit);
    }
    
    // Handle other HTTP errors
    if (!response.ok) {
      console.error(`Testimonials API error: ${response.status} ${response.statusText}`);
      // Return empty array for other errors
      return [];
    }
    
    // Parse response
    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.testimonials && Array.isArray(data.testimonials)) {
      return data.testimonials;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    // If we can't parse the response, log and return fallback
    console.warn('Unexpected testimonials API response format:', data);
    return FALLBACK_TESTIMONIALS.slice(0, limit);
    
  } catch (error) {
    // Catch any fetch errors (network issues, etc.)
    console.error('Error fetching testimonials:', error instanceof Error ? error.message : 'Unknown error');
    
    // Return fallback testimonials to ensure UI doesn't break
    return FALLBACK_TESTIMONIALS.slice(0, options.limit || 6);
  }
}

/**
 * Get fallback testimonials directly
 * Useful for testing or when you explicitly want the placeholder data
 * 
 * @param limit - Maximum number of testimonials to return
 * @returns Testimonial[] Array of fallback testimonials
 */
export function getFallbackTestimonials(limit: number = 6): Testimonial[] {
  return FALLBACK_TESTIMONIALS.slice(0, limit);
}

export type { Testimonial };
