import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    vmId?: string;
    // any other claims you need
  };
}

export const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization || req.headers['x-access-token'];
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : undefined;

  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing JWT token.' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'super-secret-admin-key';
    const decoded = jwt.verify(token, secret) as any;
    // Attach user info to request for downstream handlers
    (req as any).user = {
      userId: decoded.sub || decoded.userId,
      role: decoded.role,
      vmId: decoded.vmId,
    };
    next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid JWT token.' });
    return;
  }
};
