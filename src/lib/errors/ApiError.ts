/**
 * ApiError class for standardized error handling across the application
 * This allows creating consistent error responses with appropriate status codes
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  
  /**
   * Create a new API error
   * @param message Error message
   * @param statusCode HTTP status code
   * @param code Error code (for client-side handling)
   * @param details Additional error details
   */
  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    // Capture stack trace for better debugging
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Create a 400 Bad Request error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static badRequest(message: string, code = 'BAD_REQUEST', details?: any): ApiError {
    return new ApiError(message, 400, code, details);
  }
  
  /**
   * Create a 401 Unauthorized error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static unauthorized(message: string, code = 'UNAUTHORIZED', details?: any): ApiError {
    return new ApiError(message, 401, code, details);
  }
  
  /**
   * Create a 403 Forbidden error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static forbidden(message: string, code = 'FORBIDDEN', details?: any): ApiError {
    return new ApiError(message, 403, code, details);
  }
  
  /**
   * Create a 404 Not Found error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static notFound(message: string, code = 'NOT_FOUND', details?: any): ApiError {
    return new ApiError(message, 404, code, details);
  }
  
  /**
   * Create a 409 Conflict error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static conflict(message: string, code = 'CONFLICT', details?: any): ApiError {
    return new ApiError(message, 409, code, details);
  }
  
  /**
   * Create a 422 Unprocessable Entity error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static validation(message: string, code = 'VALIDATION_ERROR', details?: any): ApiError {
    return new ApiError(message, 422, code, details);
  }
  
  /**
   * Create a 429 Too Many Requests error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static tooManyRequests(message: string, code = 'TOO_MANY_REQUESTS', details?: any): ApiError {
    return new ApiError(message, 429, code, details);
  }
  
  /**
   * Create a 405 Method Not Allowed error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static methodNotAllowed(message: string, code = 'METHOD_NOT_ALLOWED', details?: any): ApiError {
    return new ApiError(message, 405, code, details);
  }
  
  /**
   * Create a 500 Internal Server Error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static internal(message: string, code = 'INTERNAL_ERROR', details?: any): ApiError {
    return new ApiError(message, 500, code, details);
  }
  
  /**
   * Create a 503 Service Unavailable error
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  static serviceUnavailable(message: string, code = 'SERVICE_UNAVAILABLE', details?: any): ApiError {
    return new ApiError(message, 503, code, details);
  }
  
  /**
   * Convert this error to a JSON response
   */
  toJSON(): Record<string, any> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {})
      }
    };
  }
} 