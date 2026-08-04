import * as dotenv from 'dotenv';
dotenv.config();
import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { connectDatabase } from './config/database';
import { initializeSocket, emitCriticalAlert } from './config/socket';
import { enforceIpFencing } from './middlewares/ipFencing';
import { dlpAuditInterceptor } from './middlewares/dlpAudit';
import { jwtAuthMiddleware } from './middlewares/authentication';
import { PolicyController } from './controllers/policyController';
import { ActivityLog } from './models/ActivityLog';

const app: Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080;

// Initialize DB and WebSocket
connectDatabase();
initializeSocket(httpServer);

// Global middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.ADMIN_DASHBOARD_URL || 'https://vdi-admin.enterprise.internal',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests.' },
  })
);

// Security stack
app.use(enforceIpFencing);
app.use(dlpAuditInterceptor);
app.use(jwtAuthMiddleware);

// API Routes
app.post('/api/v1/agent/policy/sync', PolicyController.syncAgentPolicy);
app.post('/api/v1/admin/policy/update', PolicyController.upsertPolicy);

app.post('/api/v1/dlp/event', async (req: Request, res: Response) => {
  const { userId, vmId, eventType, details, severity } = req.body as {
    userId: string;
    vmId: string;
    eventType: string;
    details: any;
    severity?: string;
  };

  if (!userId || !vmId || !eventType) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  const log = await ActivityLog.create({
    timestamp: new Date(),
    userId,
    vmId,
    clientIp: (req as any).clientIp || '0.0.0.0',
    eventType,
    severity: severity || 'MEDIUM',
    details,
    resolvedStatus: 'FLAGGED',
  });

  if (severity === 'HIGH' || severity === 'CRITICAL') {
    emitCriticalAlert({
      eventId: log._id,
      userId,
      vmId,
      eventType,
      severity,
      details,
      clientIp: (req as any).clientIp,
    });
  }

  return res.status(201).json({ status: 'ACKNOWLEDGED', eventId: log._id });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Gateway Server + Socket.io listening on port ${PORT}`);
});
