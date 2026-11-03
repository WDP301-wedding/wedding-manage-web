import { describeApiError } from '../../lib/api/api-errors';
/** Preserve API business codes instead of treating every HTTP conflict alike. */
export function identityErrorMessage(error: unknown): string {
  return describeApiError(error).message;
}
