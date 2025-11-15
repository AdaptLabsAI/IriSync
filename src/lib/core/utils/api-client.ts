/**
 * API Client utility for consistent API requests with CORS support
 */

interface FetchOptions extends RequestInit {
  authenticate?: boolean;
  baseUrl?: string;
}

/**
 * Make an API request with consistent error handling and CORS support
 * 
 * @param endpoint - API endpoint path (without base URL)
 * @param options - Fetch options with additional config
 * @returns Promise with the response data
 */
export async function apiRequest<T = any>(
  endpoint: string, 
  options: FetchOptions = {}
): Promise<T> {
  // IMPORTANT: Do not hard-code localhost URLs - they break in production and preview environments
  // Use relative URLs when called from the browser, or derive from environment variables
  const baseUrl = options.baseUrl || 
    process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : '');
  
  // Build the complete URL - use relative path if no baseUrl is needed
  const url = baseUrl 
    ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    : endpoint;
  
  // Set up default options for fetch
  const fetchOptions: FetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    },
    credentials: options.authenticate ? 'include' : 'omit',
    mode: 'cors',
    ...options
  };

  // Don't include our custom properties in the fetch call
  const { authenticate, baseUrl: _, ...fetchOpts } = fetchOptions;

  try {
    const response = await fetch(url, fetchOpts);
    
    // If the response is not OK, handle the error
    if (!response.ok) {
      // Try to parse error details if available
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      
      // Create an error with status and details
      const error: any = new Error(errorData.message || errorData.error || 'API request failed');
      error.status = response.status;
      error.details = errorData;
      throw error;
    }

    // For 204 No Content responses, return null
    if (response.status === 204) {
      return null as T;
    }

    // Parse the JSON response
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Shorthand for GET requests
 */
export function get<T = any>(
  endpoint: string, 
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Shorthand for POST requests
 */
export function post<T = any>(
  endpoint: string, 
  data: any,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { 
    ...options, 
    method: 'POST', 
    body: JSON.stringify(data) 
  });
}

/**
 * Shorthand for PUT requests
 */
export function put<T = any>(
  endpoint: string, 
  data: any,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { 
    ...options, 
    method: 'PUT', 
    body: JSON.stringify(data) 
  });
}

/**
 * Shorthand for PATCH requests
 */
export function patch<T = any>(
  endpoint: string, 
  data: any,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { 
    ...options, 
    method: 'PATCH', 
    body: JSON.stringify(data) 
  });
}

/**
 * Shorthand for DELETE requests
 */
export function del<T = any>(
  endpoint: string, 
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
} 