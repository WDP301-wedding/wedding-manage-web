import { z } from 'zod';
export const consultationWorkspaceSchema = z.object({
  consultationId: z.string().uuid(),
  revision: z.number().int().positive(),
  displayName: z.string(),
  email: z.string(),
  note: z.string().nullable(),
  bookingId: z.string().uuid().nullable(),
  bookingPhase: z.string().nullable(),
  preferredDate: z.string().nullable(),
  expectedGuests: z.number().nullable(),
  preferredHallId: z.string().uuid().nullable(),
  preferredMenuVersionId: z.string().uuid().nullable(),
  preferredShift: z.enum(['LUNCH', 'DINNER']).nullable(),
});
export const consultationCustomerSchema = z.object({
  consultationId: z.string().uuid(),
  displayName: z.string(),
  email: z.string(),
});
export type ConsultationWorkspace = z.infer<typeof consultationWorkspaceSchema>;
export type ConsultationCustomer = z.infer<typeof consultationCustomerSchema>;
export type ConsultationWorkspacePaths = {
  '/management/consultations/{consultationId}/workspace': {
    get: {
      parameters: { path: { consultationId: string } };
      responses: { 200: { content: { 'application/json': { data: ConsultationWorkspace } } } };
    };
  };
  '/management/consultation-customers': {
    get: {
      parameters: { query: { q: string } };
      responses: {
        200: { content: { 'application/json': { data: readonly ConsultationCustomer[] } } };
      };
    };
  };
};
