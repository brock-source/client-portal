import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import logger from "../utils/logger";

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  statusCode: number;
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`[${err.code}] ${err.message}`, {
      statusCode: err.statusCode,
      details: err.details,
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      statusCode: err.statusCode,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  logger.error("Unhandled error", err);

  const response: ErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
    statusCode: 500,
  };

  res.status(500).json(response);
}
