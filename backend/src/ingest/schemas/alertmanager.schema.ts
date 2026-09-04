import { z } from 'zod';

export const AlertmanagerAlertItemSchema = z.object({
  status: z.enum(['firing', 'resolved']),
  labels: z
    .record(z.string(), z.string())
    .refine(
      (labels): boolean =>
        typeof labels['alertname'] === 'string' && labels['alertname'].trim().length > 0,
      {
        message: "labels must contain a non-empty 'alertname'",
      }
    ),
  annotations: z.record(z.string(), z.string()).optional().default({}),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  generatorURL: z.string().optional(),
  fingerprint: z.string().optional(),
});

export const AlertmanagerPayloadSchema = z.object({
  receiver: z.string().optional(),
  status: z.enum(['firing', 'resolved']).optional(),
  alerts: z
    .array(AlertmanagerAlertItemSchema)
    .min(1, 'Payload must contain at least one alert item in alerts array'),
  groupLabels: z.record(z.string(), z.string()).optional().default({}),
  commonLabels: z.record(z.string(), z.string()).optional().default({}),
  commonAnnotations: z.record(z.string(), z.string()).optional().default({}),
  externalURL: z.string().optional(),
  version: z.string().optional(),
  groupKey: z.string().optional(),
  truncatedAlerts: z.number().optional(),
});

export type AlertmanagerPayload = z.infer<typeof AlertmanagerPayloadSchema>;
export type AlertmanagerAlertItem = z.infer<typeof AlertmanagerAlertItemSchema>;
