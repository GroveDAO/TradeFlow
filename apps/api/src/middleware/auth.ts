import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    evmAddress?: string | null;
    hederaAccountId?: string | null;
  };
}

export function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as {
      sub: string;
      email: string;
      role: string;
    };
    // Attach minimal user info; full lookup can be done in route if needed
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

// Helper to get full user from DB (attaches evmAddress, hederaAccountId)
export async function enrichUser(req: AuthRequest): Promise<void> {
  if (!req.user) return;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user) {
    req.user.evmAddress = user.evmAddress;
    req.user.hederaAccountId = user.hederaAccountId;
  }
}
