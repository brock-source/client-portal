import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: Role;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (req.session.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
