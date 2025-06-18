import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// Error handling middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging
  console.error('Error 💥:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: (err as any).code,
    details: (err as any).details
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Error && 'code' in err) {
    const prismaError = err as { code: string; meta?: any };
    switch (prismaError.code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          status: 'fail',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this value already exists',
          details: { field: prismaError.meta?.target }
        });
        return;
      case 'P2025':
        res.status(404).json({
          success: false,
          status: 'fail',
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found'
        });
        return;
      default:
        res.status(500).json({
          success: false,
          status: 'error',
          code: 'DATABASE_ERROR',
          message: 'A database error occurred'
        });
        return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      status: 'fail',
      code: 'INVALID_TOKEN',
      message: 'Invalid token. Please log in again.'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      status: 'fail',
      code: 'TOKEN_EXPIRED',
      message: 'Your token has expired. Please log in again.'
    });
    return;
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    const validationError = err as any;
    const messages = Object.values(validationError.errors).map((val: any) => val.message);
    res.status(400).json({
      success: false,
      status: 'fail',
      code: 'VALIDATION_ERROR',
      message: messages.join('. '),
      details: validationError.errors
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong. Please try again later.'
      : err.message
  });
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Not Found - ${req.originalUrl}`);
  next(error);
}; 