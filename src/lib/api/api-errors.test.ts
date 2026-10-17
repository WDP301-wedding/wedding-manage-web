import { describe, expect, it } from 'vitest';
import { ApiClientError } from './client';
import { ApiServiceError } from './axios-client';
import { describeApiError, isConflict } from './api-errors';

describe('describeApiError in wedding-manage-web', () => {
  it('maps business error code to friendly Vietnamese message for ApiClientError', () => {
    const error = new ApiClientError({
      kind: 'api',
      code: 'CONTRACT_CAPACITY_EXCEEDED',
      message: 'Capacity exceeded',
      requestId: '00000000-0000-4000-8000-000000000001',
      status: 409,
    });

    const result = describeApiError(error);
    expect(result.message).toBe('Số bàn hoặc số khách vượt quá sức chứa tối đa của sảnh tiệc.');
    expect(result.code).toBe('CONTRACT_CAPACITY_EXCEEDED');
    expect(result.requestId).toBe('00000000-0000-4000-8000-000000000001');
    expect(isConflict(error)).toBe(true);
  });

  it('maps business error code for ApiServiceError', () => {
    const error = new ApiServiceError({
      code: 'STALE_BILLING_REVISION',
      message: 'Revision stale',
      requestId: 'req-123',
      status: 409,
    });

    const result = describeApiError(error);
    expect(result.message).toContain('Dữ liệu công nợ vừa thay đổi');
    expect(result.code).toBe('STALE_BILLING_REVISION');
    expect(result.requestId).toBe('req-123');
    expect(isConflict(error)).toBe(true);
  });

  it('includes validation details for 422 errors', () => {
    const error = new ApiClientError({
      kind: 'api',
      code: 'VALIDATION_FAILED',
      message: 'Validation error',
      requestId: 'req-422',
      status: 422,
      details: [{ code: 'invalid_format', message: 'Invalid', path: 'body.email' }],
    });

    const result = describeApiError(error);
    expect(result.message).toContain('body.email');
  });

  it('supports custom screen overrides', () => {
    const error = new ApiClientError({
      kind: 'api',
      code: 'BOOKING_SLOT_UNAVAILABLE',
      message: 'Slot taken',
      requestId: 'req-over',
      status: 409,
    });

    const result = describeApiError(error, {
      BOOKING_SLOT_UNAVAILABLE: 'Khung giờ này đã được đặt cọc.',
    });
    expect(result.message).toBe('Khung giờ này đã được đặt cọc.');
  });
});
