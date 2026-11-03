import { z } from 'zod';

const amount = z.int().nonnegative().max(Number.MAX_SAFE_INTEGER);
// Additive response extension until the next immutable OpenAPI contract is pinned.
export const financialOverviewSchema = z.strictObject({
  bookingRevision: z.int().positive(),
  phase: z.enum(['DRAFT', 'AWAITING_DEPOSIT', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
  source: z.enum(['CONTRACT', 'LEGACY_PROPOSAL', 'NONE']),
  state: z.enum(['NOT_CREATED', 'DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SUPERSEDED']),
  revisionId: z.uuid().nullable(),
  revisionNumber: z.int().positive().nullable(),
  totalVnd: amount.nullable(),
  requiredDepositVnd: amount.nullable(),
  depositReceivedVnd: amount,
  depositRemainingVnd: amount.nullable(),
  depositApplied: z.boolean(),
  settlementSummary: z
    .strictObject({
      effectiveContractVnd: amount.nullable(),
      payableVnd: amount.nullable(),
      netReceivedVnd: amount,
      outstandingVnd: amount.nullable(),
      creditVnd: amount,
    })
    .optional(),
});
export const financialOverviewExtension = z.object({
  financialOverview: financialOverviewSchema.optional(),
});
export type FinancialOverview = z.infer<typeof financialOverviewSchema>;
