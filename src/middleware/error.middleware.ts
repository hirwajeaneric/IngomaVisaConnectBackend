import { Request, Response, NextFunction } from 'express';

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// Error handling middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error 💥:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // Handle specific error types
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        status: 'fail',
        message: 'A record with this value already exists',
      });
      return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      status: 'fail',
      message: 'Invalid token. Please log in again.',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      status: 'fail',
      message: 'Your token has expired. Please log in again.',
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const validationError = err as any;
    const messages = Object.values(validationError.errors).map((val: any) => val.message);
    res.status(400).json({
      success: false,
      status: 'fail',
      message: messages.join('. '),
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Not Found - ${req.originalUrl}`);
  next(error);
}; 