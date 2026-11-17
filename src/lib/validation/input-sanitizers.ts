/**
 * Shared input sanitizers and validators for management operations.
 *
 * Rules:
 * - Pure functions with zero side effects.
 * - Robust handling of non-string / null / undefined inputs.
 * - Standard RFC 4122 UUID pattern matching.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sanitizes search identifiers by trimming leading/trailing whitespace.
 * Returns empty string if value is null, undefined, or not a string.
 */
export function sanitizeSearchId(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * Validates whether a given value is a valid 36-character UUID string (trimmed).
 */
export function isValidUuid(value: unknown): boolean {
  return UUID_PATTERN.test(sanitizeSearchId(value));
}
