import { createHash, webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { createBillingIntents, type IntentStorage } from './billing-intents';

function memory(): IntentStorage {
  const records = new Map<string, string>();
  return {
    read: (key) => Promise.resolve(records.get(key) ?? null),
    write: (key, value) => {
      records.set(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      records.delete(key);
      return Promise.resolve();
    },
  };
}
const hash = (value: string) => Promise.resolve(createHash('sha256').update(value).digest('hex'));
const unknown = new ApiClientError({
  kind: 'network',
  code: 'NETWORK_ERROR',
  message: 'offline',
  requestId: 'request',
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('durable billing intent identity', () => {
  it.each([401, 403, 404, 429])(
    'keeps an uncertain monetary key after an intervening %i response',
    async (status) => {
      const storage = memory();
      const first = createBillingIntents('actor', storage, hash);
      const keys: string[] = [];
      const body = { amountVnd: 10 };
      await expect(
        first.run('manual:booking', body, (key) => {
          keys.push(key);
          return Promise.reject(unknown);
        }),
      ).rejects.toBe(unknown);
      await expect(
        first.run('manual:booking', body, (key) => {
          keys.push(key);
          return Promise.reject(
            new ApiClientError({
              kind: 'api',
              code: status === 429 ? 'RATE_LIMITED' : 'BILLING_ACCESS_DENIED',
              status,
              message: 'refused',
              requestId: 'request',
            }),
          );
        }),
      ).rejects.toThrow('refused');
      const reauthenticated = createBillingIntents('actor', storage, hash);
      expect(await reauthenticated.pending('manual:booking')).not.toBeNull();
      await reauthenticated.run('manual:booking', body, (key) => {
        keys.push(key);
        return Promise.resolve('payment');
      });
      expect(keys).toEqual([keys[0], keys[0], keys[0]]);
      expect(await reauthenticated.pending('manual:booking')).toBeNull();
    },
  );
  it('includes nested approval basis in the durable fingerprint', async () => {
    const intents = createBillingIntents('actor', memory(), hash);
    const body = { expectedBillingRevision: 7, basis: { kind: 'CREDIT', sourceEntryId: 'one' } };
    await expect(intents.run('approval:booking', body, () => Promise.reject(unknown))).rejects.toBe(
      unknown,
    );
    const submit = vi.fn().mockResolvedValue('approval');
    await expect(
      intents.run(
        'approval:booking',
        { ...body, basis: { kind: 'CREDIT', sourceEntryId: 'two' } },
        submit,
      ),
    ).rejects.toThrow('giữ nguyên');
    expect(submit).not.toHaveBeenCalled();
    await expect(
      intents.run(
        'approval:booking',
        { basis: { sourceEntryId: 'one', kind: 'CREDIT' }, expectedBillingRevision: 8 },
        submit,
      ),
    ).resolves.toBe('approval');
  });
  it('recovers original server revision after committed money changes the loaded head', async () => {
    const storage = memory();
    const first = createBillingIntents('actor', storage, hash);
    await expect(
      first.run('refund:booking', { amountVnd: 10, expectedBillingRevision: 7 }, () =>
        Promise.reject(unknown),
      ),
    ).rejects.toBe(unknown);
    const reloaded = createBillingIntents('actor', storage, hash);
    expect(await reloaded.pending('refund:booking')).toEqual({ expectedBillingRevision: 7 });
    let recovered: object = {};
    await reloaded.run(
      'refund:booking',
      { amountVnd: 10, expectedBillingRevision: 8 },
      (_key, body) => {
        recovered = body;
        return Promise.resolve();
      },
    );
    expect(recovered).toEqual({ amountVnd: 10, expectedBillingRevision: 7 });
    expect(await reloaded.pending('refund:booking')).toBeNull();
  });
  it('uses real SHA-256 and browser storage without persisting identity, token or receipt text', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const intents = createBillingIntents('private-account');
    const body = {
      reason: 'private receipt note',
      evidenceReference: 'receipt-sensitive',
      amountVnd: 10,
    };
    await expect(intents.run('manual:booking', body, () => Promise.reject(unknown))).rejects.toBe(
      unknown,
    );
    const slot = sessionStorage.key(0)!;
    expect(slot).toMatch(/^wedding\.billing\.[a-f0-9]{64}$/);
    const record = sessionStorage.getItem(slot)!;
    expect(record).not.toContain('private');
    expect(record).not.toContain('receipt');
    await intents.run('manual:booking', body, () => Promise.resolve());
    expect(sessionStorage.length).toBe(0);
  });
  it('keeps the key through network failure, reload and token rotation; success releases it', async () => {
    const storage = memory();
    const keys: string[] = [];
    const first = createBillingIntents('actor', storage, hash);
    await expect(
      first.run('manual:booking', { amount: 10 }, (key) => {
        keys.push(key);
        return Promise.reject(unknown);
      }),
    ).rejects.toBe(unknown);
    const reloaded = createBillingIntents('actor', storage, hash);
    await reloaded.run('manual:booking', { amount: 10 }, (key) => {
      keys.push(key);
      return Promise.resolve('payment');
    });
    await reloaded.run('manual:booking', { amount: 10 }, (key) => {
      keys.push(key);
      return Promise.resolve('next');
    });
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });
  it('blocks changed draft and concurrent submission before executing money', async () => {
    const intents = createBillingIntents('actor', memory(), hash);
    let finish!: () => void;
    const running = intents.run(
      'refund:booking',
      { amount: 10 },
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await expect(
      intents.run('refund:booking', { amount: 20 }, () => Promise.resolve()),
    ).rejects.toThrow('đang');
    await new Promise((resolve) => setTimeout(resolve, 0));
    finish();
    await running;
    await expect(
      intents.run('refund:booking', { amount: 10 }, () => Promise.reject(unknown)),
    ).rejects.toBe(unknown);
    await expect(
      intents.run('refund:booking', { amount: 20 }, () => Promise.resolve()),
    ).rejects.toThrow('giữ nguyên');
  });
  it.each([409, 500, 503])(
    'retains unresolved response %i but removes definitive 422',
    async (status) => {
      const intents = createBillingIntents('actor', memory(), hash);
      const keys: string[] = [];
      const fail = (code: string, status: number) =>
        intents.run('balance:booking', {}, (key) => {
          keys.push(key);
          return Promise.reject(
            new ApiClientError({
              kind: 'api',
              code,
              status,
              message: 'error',
              requestId: 'request',
            }),
          );
        });
      await expect(
        fail(status === 409 ? 'REQUEST_IN_PROGRESS' : 'INTERNAL_ERROR', status),
      ).rejects.toThrow();
      await expect(fail('IDEMPOTENCY_KEY_REUSED', 422)).rejects.toThrow();
      await intents.run('balance:booking', {}, (key) => {
        keys.push(key);
        return Promise.resolve();
      });
      expect(keys[1]).toBe(keys[0]);
      expect(keys[2]).not.toBe(keys[0]);
    },
  );
  it('separates actors and fails closed on unavailable or corrupt storage', async () => {
    const storage = memory();
    await createBillingIntents('one', storage, hash)
      .run('manual', {}, () => Promise.reject(unknown))
      .catch(() => undefined);
    await expect(
      createBillingIntents('two', storage, hash).run('manual', { other: true }, () =>
        Promise.resolve(),
      ),
    ).resolves.toBeUndefined();
    const corrupt = { ...storage, read: () => Promise.resolve('{broken') };
    await expect(
      createBillingIntents('one', corrupt, hash).run('manual', {}, () => Promise.resolve()),
    ).rejects.toThrow();
    const failed = { ...storage, write: () => Promise.reject(new Error('storage unavailable')) };
    await expect(
      createBillingIntents('one', failed, hash).run('new', {}, () => Promise.resolve()),
    ).rejects.toThrow('storage unavailable');
  });
});
