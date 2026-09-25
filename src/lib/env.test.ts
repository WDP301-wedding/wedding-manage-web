import { describe, expect, it } from 'vitest';

import { parsePublicEnv } from './env';

describe('parsePublicEnv', () => {
  it('returns only the allowlisted public API configuration', () => {
    const parsed = parsePublicEnv(
      {
        NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com',
        DATABASE_URL: 'postgresql://should-not-leak',
        SUPABASE_SERVICE_ROLE_KEY: 'should-not-leak',
      },
      'production',
    );

    expect(parsed).toEqual({
      NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com',
    });
  });

  it('allows an HTTP loopback API during local development', () => {
    expect(
      parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001' }, 'development'),
    ).toEqual({
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001',
    });
  });

  it('rejects cleartext API URLs in production', () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001' }, 'production'),
    ).toThrow();
  });

  it('rejects non-HTTP protocols', () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: 'ftp://files.example.com' }, 'development'),
    ).toThrow();
  });

  it('rejects missing API configuration', () => {
    expect(() => parsePublicEnv({}, 'development')).toThrow();
  });
});
