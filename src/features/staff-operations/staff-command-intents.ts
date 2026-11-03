import { ApiServiceError } from '../../lib/api/axios-client';
import { z } from 'zod';
const intentSchema = z.object({ key: z.uuid(), fingerprint: z.string() });
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
};
// Retain only the command key/hash, never guest names or report contents.
export async function staffCommand<T>(
  scope: string,
  body: unknown,
  send: (key: string) => Promise<T>,
): Promise<T> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(body)));
  const fingerprint = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  const slot = `staff-command:${scope}`;
  const stored = sessionStorage.getItem(slot);
  const prior = stored === null ? null : intentSchema.parse(JSON.parse(stored));
  if (prior && prior.fingerprint !== fingerprint)
    throw new Error(
      'Yêu cầu trước chưa rõ kết quả. Giữ nguyên nội dung và thử lại, kiểm tra trạng thái trước khi đổi nội dung.',
    );
  const intent = prior ?? { key: crypto.randomUUID(), fingerprint };
  sessionStorage.setItem(slot, JSON.stringify(intent));
  try {
    const result = await send(intent.key);
    sessionStorage.removeItem(slot);
    return result;
  } catch (error) {
    if (
      error instanceof ApiServiceError &&
      error.status !== undefined &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429 &&
      error.code !== 'REQUEST_IN_PROGRESS'
    )
      sessionStorage.removeItem(slot);
    throw error;
  }
}
