import { z } from 'zod';

export const OpenCodeResponseSchema = z.object({
  category: z.enum(['ORDER', 'BILLING', 'TECHNICAL', 'ACCOUNT', 'GENERAL']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'ANGRY']),
  confidence: z.number().min(0).max(1),
  suggestedResponse: z.string().min(1),
});

export type OpenCodeResponse = z.infer<typeof OpenCodeResponseSchema>;
