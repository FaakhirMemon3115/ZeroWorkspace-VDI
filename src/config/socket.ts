import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server;

export const initializeSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ADMIN_DASHBOARD_URL || 'https://vdi-admin.enterprise.internal',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('AUTHENTICATION_FAILED: Missing socket credentials.'));
    }
    try {
      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'super-secret-admin-key') as any;
      if (decoded.role !== 'ADMIN' && decoded.role !== 'AUDITOR') {
        return next(new Error('FORBIDDEN: Insufficient socket privileges.'));
      }
      (socket as any).user = decoded;
      next();
    } catch (err) {
      return next(new Error('AUTHENTICATION_FAILED: Invalid token.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`🔌 Admin connected to Real-Time Monitoring: ${user.userId} (${socket.id})`);
    socket.join('admin_alerts_room');
    socket.on('disconnect', () => {
      console.log(`❌ Admin disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const emitCriticalAlert = (eventData: Record<string, any>): void => {
  if (io) {
    io.to('admin_alerts_room').emit('DLP_CRITICAL_INCIDENT', {
      timestamp: new Date(),
      ...eventData,
    });
  }
};
