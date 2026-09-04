import { z } from 'zod';

export const DatadogPayloadSchema = z.object({
  alert_type: z.string().optional().default('error'), // error, warning, success, info
  event_type: z.string().optional(),
  title: z.string().min(1, 'Title is required for Datadog webhook'),
  body: z.string().optional().default(''),
  aggregation_key: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional().default([]), // Can be comma-separated or array
  date: z.union([z.number(), z.string()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  priority: z.string().optional(), // P1, P2, P3, P4, P5
  alert_transition: z.string().optional(), // Triggered, Recovered, etc.
  alert_status: z.string().optional(),
  hostname: z.string().optional(),
  org: z.record(z.string(), z.unknown()).optional(),
});

export type DatadogPayload = z.infer<typeof DatadogPayloadSchema>;
