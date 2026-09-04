import { Request, Response, NextFunction } from 'express';
import { verifyHmacSignature } from '../../shared/crypto';
import { logger } from '../../shared/logger';

export interface HmacMiddlewareOptions {
  sourceName: string;
  secretEnvVar: string;
  headerNames: string[];
}

// Extend Express Request to include rawBody property
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer | string;
    }
  }
}

/**
 * Creates an Express middleware to validate HMAC-SHA256 signatures on inbound webhooks.
 *
 * If the secret environment variable is not defined and NODE_ENV is development or test,
 * it allows requests with a warning (to simplify local prototyping/testing).
 * If the secret is set, it strictly validates the HMAC signature using constant-time comparison.
 */
export function createHmacMiddleware(options: HmacMiddlewareOptions) {
  const { sourceName, secretEnvVar, headerNames } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const secret = process.env[secretEnvVar];

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        logger.error(
          { source: sourceName, secretEnvVar },
          `HMAC validation failed: Missing required secret in production`
        );
        res.status(500).json({ error: 'Server authentication configuration error' });
        return;
      }
      // In non-production, proceed with a log if secret is not set
      logger.debug(
        { source: sourceName },
        `HMAC secret '${secretEnvVar}' not set; skipping signature verification in ${process.env.NODE_ENV || 'development'}`
      );
      return next();
    }

    // Look for signature in configured header names (case-insensitive in Express)
    let providedSignature: string | undefined;
    for (const header of headerNames) {
      const val = req.headers[header.toLowerCase()];
      if (typeof val === 'string') {
        providedSignature = val;
        break;
      } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        providedSignature = val[0];
        break;
      }
    }

    if (!providedSignature) {
      logger.warn(
        {
          source: sourceName,
          ip: req.ip || req.socket.remoteAddress,
          timestamp: new Date().toISOString(),
        },
        'Webhook request rejected: Missing HMAC signature header'
      );
      res.status(401).json({ error: 'Unauthorized: Missing signature header' });
      return;
    }

    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const isValid = verifyHmacSignature(rawBody, providedSignature, secret);

    if (!isValid) {
      logger.warn(
        {
          source: sourceName,
          ip: req.ip || req.socket.remoteAddress,
          timestamp: new Date().toISOString(),
        },
        'Webhook request rejected: Invalid HMAC signature'
      );
      res.status(401).json({ error: 'Unauthorized: Invalid signature' });
      return;
    }

    next();
  };
}
