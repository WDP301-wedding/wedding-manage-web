import { z } from 'zod';
import { ApiClientError } from '../../lib/api/client';

export class BillingIntentMismatchError extends Error {
  constructor() {
    super(
      'Nội dung nhập lại khác yêu cầu trước. Hãy giữ đúng số tiền, loại giao dịch và thời điểm ban đầu rồi thử lại; nếu là yêu cầu từ phiên bản cũ, kiểm tra lịch sử trước khi liên hệ nhà hàng xử lý.',
    );
    this.name = 'BillingIntentMismatchError';
  }
}

// Sort every object level so nested approval bases participate in request identity.
function canonicalBody(body: object): string {
  return JSON.stringify(body, (_key, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, record[key]]),
      );
    }
    return value;
  });
}

export interface IntentStorage {
  read(this: void, key: string): Promise<string | null>;
  write(this: void, key: string, value: string): Promise<void>;
  remove(this: void, key: string): Promise<void>;
}
const metadataSchema = z.strictObject({
  expectedBillingRevision: z.number().int().positive().optional(),
  timelineRevisionId: z.uuid().optional(),
});
const recoveryBodySchema = z.union([
  z.strictObject({
    bookingId: z.uuid(),
    purpose: z.enum(['DEPOSIT', 'BALANCE']),
    amountVnd: z.int().positive().max(Number.MAX_SAFE_INTEGER),
    settledAt: z.iso.datetime({ offset: true }),
    expectedBillingRevision: z.int().positive().optional(),
    timelineRevisionId: z.uuid().optional(),
    contractRevisionId: z.uuid().optional(),
    documentDigest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  }),
  z.strictObject({
    sourcePaymentId: z.uuid(),
    amountVnd: z.int().positive().max(Number.MAX_SAFE_INTEGER),
    expectedBillingRevision: z.int().positive(),
  }),
]);
export type RecoveryBody = z.infer<typeof recoveryBodySchema>;
const recordSchema = z.strictObject({
  key: z.uuid(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  metadata: metadataSchema.default({}),
  body: recoveryBodySchema.optional(),
});
const browserStorage: IntentStorage = {
  read: (key) => Promise.resolve(sessionStorage.getItem(key)),
  write: (key, value) => {
    sessionStorage.setItem(key, value);
    return Promise.resolve();
  },
  remove: (key) => {
    sessionStorage.removeItem(key);
    return Promise.resolve();
  },
};
async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Session-local, account/booking-scoped recovery stores only validated amounts, IDs and time.
// No tokens, customer contacts, receipt text or external evidence are persisted.
export function createBillingIntents(
  accountId: string,
  storage: IntentStorage = browserStorage,
  hash: (value: string) => Promise<string> = digest,
) {
  const busy = new Set<string>();
  const slotFor = async (scope: string) =>
    `wedding.billing.${await hash(JSON.stringify([accountId, scope]))}`;
  return {
    async pending(scope: string) {
      const saved = await storage.read(await slotFor(scope));
      return saved === null ? null : recordSchema.parse(JSON.parse(saved) as unknown).metadata;
    },
    async inspect(scope: string) {
      const saved = await storage.read(await slotFor(scope));
      if (saved === null) return null;
      const record = recordSchema.parse(JSON.parse(saved) as unknown);
      const body =
        record.body && (await hash(canonicalBody(record.body))) === record.hash
          ? record.body
          : null;
      return { metadata: record.metadata, body };
    },
    async run<T>(
      scope: string,
      body: object,
      operation: (key: string, stableBody: object) => Promise<T>,
    ): Promise<T> {
      if (busy.has(scope)) throw new Error('Yêu cầu này đang được xử lý.');
      busy.add(scope);
      try {
        const slot = await slotFor(scope);
        const saved = await storage.read(slot);
        const previous = saved === null ? null : recordSchema.parse(JSON.parse(saved) as unknown);
        const payload = body as Record<string, unknown>;
        const metadata =
          previous?.metadata ??
          metadataSchema.parse({
            ...(payload.expectedBillingRevision === undefined
              ? {}
              : { expectedBillingRevision: payload.expectedBillingRevision }),
            ...(payload.timelineRevisionId === undefined
              ? {}
              : { timelineRevisionId: payload.timelineRevisionId }),
          });
        const stableBody = { ...body, ...metadata };
        const fingerprint = await hash(canonicalBody(stableBody));
        const recoverable = recoveryBodySchema.safeParse(stableBody);
        const record = previous ?? {
          key: crypto.randomUUID(),
          hash: fingerprint,
          metadata,
          ...(recoverable.success ? { body: recoverable.data } : {}),
        };
        if (record.hash !== fingerprint) throw new BillingIntentMismatchError();
        await storage.write(slot, JSON.stringify(record));
        try {
          const result = await operation(record.key, stableBody);
          await storage.remove(slot);
          return result;
        } catch (error) {
          if (
            error instanceof ApiClientError &&
            error.kind === 'api' &&
            error.status !== undefined &&
            error.status >= 400 &&
            error.status < 500 &&
            ![401, 403, 404, 429].includes(error.status) &&
            error.code !== 'REQUEST_IN_PROGRESS'
          )
            await storage.remove(slot);
          throw error;
        }
      } finally {
        busy.delete(scope);
      }
    },
  };
}

/** Older adapters may supply only pending/run; recovery then stays in explicit legacy mode. */
export type BillingIntents = Pick<ReturnType<typeof createBillingIntents>, 'pending' | 'run'> &
  Partial<Pick<ReturnType<typeof createBillingIntents>, 'inspect'>>;
