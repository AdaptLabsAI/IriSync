import { NextResponse } from 'next/server';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  apiEndpoint: string;
  details?: any;
  code?: string;
}

/**
 * Handles validation errors with consistent format
 */
export function handleValidationError(
  message: string, 
  endpoint: string, 
  status = 400
): NextResponse<ErrorResponse> {
  console.warn(`Validation error in ${endpoint}: ${message}`);
  
  return NextResponse.json(
    {
      error: message,
      apiEndpoint: endpoint,
      code: 'VALIDATION_ERROR'
    },
    { status }
  );
}

/**
 * Handles API errors with consistent format, including the fallback text
 */
export function handleApiError(
  error: any,
  endpoint: string,
  defaultMessage = 'An unexpected error occurred',
  status = 500
): NextResponse<ErrorResponse> {
  // Extract error message with priority:
  // 1. Custom error message from API response
  // 2. Standard error message
  // 3. Default message
  const errorMessage = error.response?.data?.error_description ||
                      error.response?.data?.error?.message ||
                      error.response?.data?.error ||
                      error.message ||
                      defaultMessage;
  
  console.error(`Error in ${endpoint}:`, error);
  
  return NextResponse.json(
    {
      error: `Error loading data: ${errorMessage}`,
      apiEndpoint: endpoint,
      details: process.env.NODE_ENV === 'development' ? {
        status: error.response?.status,
        data: error.response?.data
      } : undefined,
      code: 'API_ERROR'
    },
    { status }
  );
}

/**
 * Handles unauthorized errors with consistent format
 */
export function handleUnauthorizedError(
  endpoint: string,
  message = 'Unauthorized: Invalid or missing credentials'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      apiEndpoint: endpoint,
      code: 'UNAUTHORIZED'
    },
    { status: 401 }
  );
}

/**
 * Handles not found errors with consistent format
 */
export function handleNotFoundError(
  resource: string,
  endpoint: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: `Resource not found: ${resource}`,
      apiEndpoint: endpoint,
      code: 'NOT_FOUND'
    },
    { status: 404 }
  );
} 