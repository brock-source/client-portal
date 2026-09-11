import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = uuidv4();
  req.id = requestId;

  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    logger.info(`${req.method} ${req.path} ${statusCode}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      userId: (req.session as any)?.userId,
    });

    return originalSend.call(this, data);
  };

  next();
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
