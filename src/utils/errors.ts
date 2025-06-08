export class BadRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestError';
    }
  }
  
  export class UnauthorizedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'UnauthorizedError';
    }
  }
  
  export class NotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  }
  
  export class ConflictError extends Error {
    status = 409;
    constructor(message: string) {
      super(message);
      this.name = 'ConflictError';
    }
  }
  
  export class ForbiddenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ForbiddenError';
    }
  }