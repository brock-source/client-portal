import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { AppError } from "../utils/appError";

export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join(".");
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );

        throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", details);
      }
      throw error;
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join(".");
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );

        throw new AppError(400, "VALIDATION_ERROR", "Invalid query parameters", details);
      }
      throw error;
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join(".");
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );

        throw new AppError(400, "VALIDATION_ERROR", "Invalid URL parameters", details);
      }
      throw error;
    }
  };
}
