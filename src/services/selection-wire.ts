import { z } from 'zod';
export const selectionLineSchema = z.object({
  category: z.enum(['MENU', 'SERVICE', 'PRINT']),
  sourceId: z.string().uuid(),
  sourceRevisionId: z.string().uuid(),
  quantity: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  unit: z.string(),
  unitPriceVnd: z.number().int().nonnegative(),
  lineTotalVnd: z.number().int().nonnegative(),
});
export const customerSelectionSchema = z.object({
  revisionId: z.string().uuid().nullable(),
  revisionNumber: z.number().int().nonnegative(),
  status: z.enum(['NOT_STARTED', 'DRAFT', 'SUBMITTED']),
  lines: z.array(selectionLineSchema).min(1).max(50),
  totalVnd: z.number().int().nonnegative(),
  submittedAt: z.string().nullable(),
});
export const selectionResultSchema = z.object({
  bookingRevision: z.number().int().positive(),
  selection: customerSelectionSchema,
});
export type CustomerSelection = z.infer<typeof customerSelectionSchema>;
export type SelectionResult = z.infer<typeof selectionResultSchema>;
