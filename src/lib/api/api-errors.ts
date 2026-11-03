import { presentError } from './error-presentation';
export type { FriendlyError } from './error-presentation';

export function describeApiError(error: unknown, overrides: Record<string, string> = {}) {
  return presentError(error, overrides);
}

export function isConflict(error: unknown): boolean {
  return presentError(error).status === 409;
}
