import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../database';
import { UserRole, User } from '../types';
import { AuditService } from '../modules/audit/audit.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    organization_id?: string;
    full_name: string;
  };
  correlationId?: string;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization token is missing or malformed',
    });
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: UserRole;
      organization_id?: string;
    };

    const user = db.findById('users', decoded.id);
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User account no longer exists',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      full_name: user.full_name,
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      AuditService.log({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'ACCESS_DENIED',
        resourceType: 'ROUTE',
        resourceId: req.originalUrl,
        outcome: 'denied',
        ipAddress: req.ip,
        metadata: { requiredRoles: allowedRoles },
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `User role '${req.user.role}' lacks permission to perform this action`,
      });
      return;
    }

    next();
  };
}
