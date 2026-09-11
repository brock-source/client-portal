import { Request, Response, NextFunction } from "express";

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  statusCode: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  statusCode: number;
}

declare global {
  namespace Express {
    interface Response {
      ok<T>(data?: T, statusCode?: number): this;
      created<T>(data?: T): this;
    }
  }
}

export function responseFormatter(_req: Request, res: Response, next: NextFunction) {
  res.ok = function <T>(data?: T, statusCode = 200): Response {
    const response: SuccessResponse<T> = {
      success: true,
      data: data as T,
      statusCode,
    };
    return this.status(statusCode).json(response);
  };

  res.created = function <T>(data?: T): Response {
    const response: SuccessResponse<T> = {
      success: true,
      data: data as T,
      statusCode: 201,
    };
    return this.status(201).json(response);
  };

  next();
}
