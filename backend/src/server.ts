import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ingestRouter } from './ingest/ingest.router';
import { logger } from './shared/logger';
import { bootstrapPipeline } from './bootstrap';
import { dashboardRouter } from './dashboard-api/router';

dotenv.config();

// Initialize the pipeline components
bootstrapPipeline();

export const app: Express = express();

// Security middleware
app.use(helmet());

// Rate limiter: 500 requests per 1-minute window
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// JSON body parser with rawBody capture for HMAC verification
app.use(
  express.json({
    limit: '5mb',
    verify: (req: Request, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

// URL encoded body parser if needed
app.use(express.urlencoded({ extended: true }));

// Mount Ingest Webhooks & Health routes
app.use('/', ingestRouter);

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled server error');
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Alert Fatigue Buster Ingest Service listening on port ${PORT}`);
  });
}
