import { Request, Response, NextFunction } from 'express';
import { ActivityLog } from '../models/ActivityLog';

export const dlpAuditInterceptor = (req: Request, res: Response, next: NextFunction): void => {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const isDlpEvent = req.originalUrl.includes('/v1/dlp/event') || res.statusCode === 403;
    if (isDlpEvent || req.headers['x-dlp-flagged'] === 'true') {
      const elapsedHrTime = process.hrtime(startHrTime);
      const elapsedMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;

      setImmediate(async () => {
        try {
          await ActivityLog.create({
            timestamp: new Date(),
            userId: (req as any).user?.userId || 'UNAUTHENTICATED',
            vmId: (req as any).user?.vmId || 'UNKNOWN_HOST',
            clientIp: (req as any).clientIp || '0.0.0.0',
            eventType: res.statusCode === 403 ? 'NETWORK_BLOCKED' : 'DLP_VIOLATION_ATTEMPT',
            severity: res.statusCode === 403 ? 'HIGH' : (req.body?.severity || 'MEDIUM'),
            details: {
              endpoint: req.originalUrl,
              method: req.method,
              statusCode: res.statusCode,
              responseTimeMs: elapsedMs,
              payload: req.body || {},
            },
            resolvedStatus: 'FLAGGED',
          });
        } catch (err) {
          console.error('Failed to persist DLP Audit Log:', err);
        }
      });
    }
  });

  next();
};
