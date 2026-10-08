import type { Middleware } from 'openapi-fetch';
import { ApiClientError, type ApiClient } from '../../lib/api/client';

// Unknown responses retain their original key so an explicit retry can reconcile the same command.
export function installCommandRetries(client: ApiClient): ApiClient {
  const intents = new Map<string, string>();
  const requests = new WeakMap<Request, string>();
  const middleware: Middleware = {
    async onRequest({ request }) {
      const key = request.headers.get('Idempotency-Key');
      if (key === null) return;
      const signature = JSON.stringify([
        request.method,
        request.url,
        request.headers.get('Authorization'),
        await request.clone().text(),
      ]);
      const pending = intents.get(signature);
      if (pending === undefined && intents.size >= 100)
        throw new Error('Cần đồng bộ lại các yêu cầu chưa rõ kết quả trước khi gửi thêm.');
      intents.set(signature, pending ?? key);
      request.headers.set('Idempotency-Key', pending ?? key);
      requests.set(request, signature);
    },
    onResponse({ request }) {
      const signature = requests.get(request);
      if (signature !== undefined) intents.delete(signature);
    },
    onError({ request, error }) {
      const signature = requests.get(request);
      if (
        signature !== undefined &&
        error instanceof ApiClientError &&
        error.kind === 'api' &&
        error.code !== 'REQUEST_IN_PROGRESS'
      )
        intents.delete(signature);
    },
  };
  client.use(middleware);
  return client;
}
