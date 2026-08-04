import { Request, Response, NextFunction } from 'express';
import ipRangeCheck from 'ip-range-check';

const ALLOWED_OFFICE_SUBNETS = (process.env.ALLOWED_OFFICE_IPS || '203.0.113.0/24,198.51.100.12/32,127.0.0.1').split(',');

export const enforceIpFencing = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    ''
  ).replace('::ffff:', '');

  const isAllowed = ipRangeCheck(clientIp, ALLOWED_OFFICE_SUBNETS);

  if (!isAllowed) {
    console.warn(`🚨 SECURITY ALERT: Access attempt blocked from unauthorized IP: ${clientIp}`);
    res.status(403).json({
      error: 'ACCESS_DENIED',
      message: 'Zero-Trust Policy Violation: Access allowed only from designated Office Subnets.',
      code: 'IP_FENCE_BREACH'
    });
    return;
  }

  // Attach cleaned IP for later middlewares
  (req as any).clientIp = clientIp;
  next();
};
