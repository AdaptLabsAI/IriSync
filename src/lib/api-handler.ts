// src/lib/api-handler.ts
import { NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

export function withAuth<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AuthenticationError();
    }
    return handler(...args);
  }) as T;
}

export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
