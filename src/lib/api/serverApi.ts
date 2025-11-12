import { headers } from 'next/headers';
import { logger } from '../logging/logger';
import { redirect } from 'next/navigation';

interface FetchOptions extends RequestInit {
  cache?: RequestCache;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: {
    message: string;
    status: number;
    endpoint: string;
  };
};

/**
 * Server-side API fetch with error handling for Next.js server components
 */
export async function serverFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  try {
    // Determine if it's an absolute URL or a relative path to our API
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      const message = errorData?.message || `Failed with status: ${response.status}`;
      
      logger.error({
        type: 'server_api_error',
        endpoint,
        status: response.status,
        message
      }, `API error from ${endpoint}`);
      
      // Handle 401 unauthorized globally
      if (response.status === 401) {
        const headersList = headers();
        const referer = headersList.get('referer') || '/';
        redirect(`/auth/login?returnUrl=${encodeURIComponent(referer)}`);
      }
      
      return {
        data: null,
        error: {
          message,
          status: response.status,
          endpoint
        }
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    const message = error.message || 'An unexpected error occurred';
    
    logger.error({
      type: 'server_api_error',
      endpoint,
      message,
      error: error?.stack
    }, `API fetch error: ${message}`);
    
    return {
      data: null,
      error: {
        message,
        status: 500,
        endpoint
      }
    };
  }
}

/**
 * Helper for handling API data in server components with automatic error handling
 */
export async function fetchData<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, error } = await serverFetch<T>(endpoint, options);
  
  if (error) {
    // This will be caught by the closest error.tsx boundary
    throw new Error(`API Error [${endpoint}]: ${error.message}`);
  }
  
  return data;
}

export default { serverFetch, fetchData }; 