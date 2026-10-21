import { describe, expect, it } from 'vitest';
import { isValidUuid, sanitizeSearchId } from './input-sanitizers';

describe('input-sanitizers', () => {
  describe('sanitizeSearchId', () => {
    it('trims leading and trailing whitespace', () => {
      expect(sanitizeSearchId('  test-id  ')).toBe('test-id');
      expect(sanitizeSearchId('\t\nhello\r\n ')).toBe('hello');
    });

    it('returns empty string for non-string values', () => {
      expect(sanitizeSearchId(null)).toBe('');
      expect(sanitizeSearchId(undefined)).toBe('');
      expect(sanitizeSearchId(123)).toBe('');
      expect(sanitizeSearchId({})).toBe('');
      expect(sanitizeSearchId([])).toBe('');
    });
  });

  describe('isValidUuid', () => {
    it('returns true for valid standard UUIDs', () => {
      expect(isValidUuid('cd0b75ab-6256-427e-9b37-777f8b9c2822')).toBe(true);
      expect(isValidUuid('CD0B75AB-6256-427E-9B37-777F8B9C2822')).toBe(true);
    });

    it('returns true for valid UUID with surrounding whitespace', () => {
      expect(isValidUuid('  cd0b75ab-6256-427e-9b37-777f8b9c2822 \n')).toBe(true);
    });

    it('returns false for invalid or malformed strings', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('cd0b75ab-6256-427e-9b37-777f8b9c282')).toBe(false);
      expect(isValidUuid('cd0b75ab-6256-427e-9b37-777f8b9c2822-extra')).toBe(false);
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
    });
  });
});
