import { z } from 'zod';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

function createPublicEnvSchema(runtimeEnvironment: string | undefined) {
  return z.strictObject({
    NEXT_PUBLIC_API_BASE_URL: z.url({ protocol: /^https?$/ }).refine(
      (value) => {
        const url = new URL(value);

        if (url.protocol === 'https:') {
          return true;
        }

        return runtimeEnvironment !== 'production' && loopbackHosts.has(url.hostname);
      },
      {
        message: 'The public API URL must use HTTPS outside local development.',
      },
    ),
    NEXT_PUBLIC_REALTIME_URL: z.url({ protocol: /^https?$/ }).optional(),
  });
}

export type PublicEnv = Readonly<{
  NEXT_PUBLIC_API_BASE_URL: string;
  NEXT_PUBLIC_REALTIME_URL?: string | undefined;
}>;

export function parsePublicEnv(
  source: Readonly<Record<string, string | undefined>>,
  runtimeEnvironment: string | undefined = process.env.NODE_ENV,
): PublicEnv {
  return createPublicEnvSchema(runtimeEnvironment).parse({
    NEXT_PUBLIC_API_BASE_URL: source.NEXT_PUBLIC_API_BASE_URL,
    ...(source.NEXT_PUBLIC_REALTIME_URL
      ? { NEXT_PUBLIC_REALTIME_URL: source.NEXT_PUBLIC_REALTIME_URL }
      : {}),
  });
}

export function readPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
  });
}
