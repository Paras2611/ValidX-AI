import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import authRoutes from './modules/auth/auth.routes';
import applicationsRoutes from './modules/applications/applications.routes';
import documentsRoutes from './modules/documents/documents.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import complianceRoutes from './modules/compliance/compliance.routes';
import reportsRoutes from './modules/reports/reports.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// Enable CORS for frontend clients
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
  })
);

// Standard JSON parser
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Correlation ID & Request Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    service: 'VALIDATEX Core API Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Versioned REST API routes under /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationsRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint '${req.method} ${req.originalUrl}' does not exist on this server`,
  });
});

// Centralized Secure Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] [${(req as any).correlationId || 'N/A'}]`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected internal error occurred'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    correlationId: (req as any).correlationId,
  });
});

export default app;
