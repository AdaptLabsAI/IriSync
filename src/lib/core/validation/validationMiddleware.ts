import { NextApiRequest, NextApiResponse } from 'next';
import { ZodSchema } from 'zod';
import { ApiError } from '../errors/ApiError';

/**
 * Type definition for request data locations
 */
export type RequestDataLocation = 'body' | 'query' | 'params';

/**
 * Validation options for the middleware
 */
export interface ValidationOptions {
  /**
   * Strip unknown properties from the validated object
   * @default true
   */
  stripUnknown?: boolean;
}

/**
 * Validation middleware for API routes
 * Validates request data against the provided schema
 * 
 * @param schema The Zod schema to validate against
 * @param dataLocation Where to find the data to validate ('body', 'query', or 'params')
 * @param options Additional validation options
 * @returns Middleware function that validates the request data
 */
export function validate<T>(
  schema: ZodSchema<T>,
  dataLocation: RequestDataLocation = 'body',
  options: ValidationOptions = { stripUnknown: true }
) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Get the data to validate based on the location
      const data = dataLocation === 'body' 
        ? req.body 
        : dataLocation === 'query' 
          ? req.query 
          : (req as any).params;
      
      // Validate the data against the schema
      const validationResult = schema.safeParse(data);
      
      if (!validationResult.success) {
        // If validation fails, throw a validation error
        throw ApiError.validation('Validation failed', 'VALIDATION_ERROR', {
          errors: validationResult.error.format()
        });
      }
      
      // Assign the validated data back to the request
      if (dataLocation === 'body') {
        req.body = validationResult.data;
      } else if (dataLocation === 'query') {
        req.query = validationResult.data as any;
      } else {
        (req as any).params = validationResult.data;
      }
      
      // Continue to the next middleware or handler
      if (next) {
        next();
      }
    } catch (error) {
      // If it's already an ApiError, just throw it
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Otherwise, wrap it in a validation error
      throw ApiError.validation(
        'Validation failed',
        'VALIDATION_ERROR',
        { message: (error as Error).message }
      );
    }
  };
}

/**
 * Higher-order function to create a validated handler
 * This is an alternative to using the middleware directly
 * 
 * @param handler The API route handler
 * @param schema The Zod schema to validate against
 * @param dataLocation Where to find the data to validate
 * @param options Additional validation options
 * @returns A handler with validation
 */
export function withValidation<T>(
  handler: Function,
  schema: ZodSchema<T>,
  dataLocation: RequestDataLocation = 'body',
  options: ValidationOptions = { stripUnknown: true }
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get the data to validate based on the location
      const data = dataLocation === 'body' 
        ? req.body 
        : dataLocation === 'query' 
          ? req.query 
          : (req as any).params;
      
      // Validate the data against the schema
      const validationResult = schema.safeParse(data);
      
      if (!validationResult.success) {
        // If validation fails, return a validation error
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationResult.error.format()
          }
        });
      }
      
      // Assign the validated data back to the request
      if (dataLocation === 'body') {
        req.body = validationResult.data;
      } else if (dataLocation === 'query') {
        req.query = validationResult.data as any;
      } else {
        (req as any).params = validationResult.data;
      }
      
      // Call the handler with the validated data
      return handler(req, res);
    } catch (error) {
      // If it's an ApiError, format it
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json(error.toJSON());
      }
      
      // Otherwise, return a generic validation error
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { message: (error as Error).message }
        }
      });
    }
  };
} 