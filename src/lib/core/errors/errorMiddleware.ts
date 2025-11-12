import { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from './ApiError';
import { ZodError } from 'zod';
import { logger } from '../logging/logger';

/**
 * Type definition for Next.js API handler
 */
export type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Error handling middleware for API routes
 * Catches and properly formats errors thrown during API request handling
 * 
 * @param handler The API route handler
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Call the original handler
      await handler(req, res);
    } catch (error: any) {
      // Log the error
      logger.error('API Error:', {
        url: req.url,
        method: req.method,
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      // Handle ApiError directly
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json(error.toJSON());
      }
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const apiError = ApiError.validation('Validation failed', 'VALIDATION_ERROR', {
          errors: error.errors
        });
        return res.status(apiError.statusCode).json(apiError.toJSON());
      }
      
      // Handle Firebase errors
      if (error.code && error.code.startsWith('auth/')) {
        let apiError: ApiError;
        
        // Map common Firebase Auth errors to appropriate API errors
        switch (error.code) {
          case 'auth/id-token-expired':
          case 'auth/id-token-revoked':
          case 'auth/invalid-id-token':
            apiError = ApiError.unauthorized('Authentication token is invalid or expired');
            break;
          case 'auth/user-disabled':
            apiError = ApiError.forbidden('User account has been disabled');
            break;
          case 'auth/user-not-found':
            apiError = ApiError.notFound('User not found');
            break;
          case 'auth/invalid-email':
          case 'auth/invalid-password':
            apiError = ApiError.validation('Invalid credentials');
            break;
          case 'auth/email-already-exists':
            apiError = ApiError.conflict('Email already exists');
            break;
          default:
            apiError = ApiError.internal('Authentication error', error.code);
        }
        
        return res.status(apiError.statusCode).json(apiError.toJSON());
      }
      
      // Handle Firestore errors
      if (error.code && error.code.startsWith('firestore/')) {
        let apiError: ApiError;
        
        // Map common Firestore errors to appropriate API errors
        switch (error.code) {
          case 'firestore/invalid-argument':
            apiError = ApiError.badRequest('Invalid request data');
            break;
          case 'firestore/not-found':
            apiError = ApiError.notFound('Requested data not found');
            break;
          case 'firestore/already-exists':
            apiError = ApiError.conflict('Data already exists');
            break;
          case 'firestore/permission-denied':
            apiError = ApiError.forbidden('Permission denied');
            break;
          case 'firestore/resource-exhausted':
            apiError = ApiError.tooManyRequests('Quota exceeded');
            break;
          default:
            apiError = ApiError.internal('Database error', error.code);
        }
        
        return res.status(apiError.statusCode).json(apiError.toJSON());
      }
      
      // Fallback for unknown errors
      const apiError = ApiError.internal(
        'An unexpected error occurred',
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      );
      
      return res.status(apiError.statusCode).json(apiError.toJSON());
    }
  };
} 