import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { AttemptStatus, billingMessage, denied, unresolved } from './billing-display';
import type { AttemptView } from './billing-api';

const error = (code: string, status?: number, kind: 'api' | 'timeout' = 'api') =>
  new ApiClientError({
    kind,
    code,
    message: 'provider message',
    requestId: 'request',
    ...(status === undefined ? {} : { status }),
  });
describe('billing privacy and state messages', () => {
  it.each(['CREATED', 'PENDING', 'UNKNOWN', 'FAILED', 'SUCCEEDED'] as const)(
    'renders verified attempt state %s',
    (status) => {
      const attempt: AttemptView = {
        paymentAttemptId: 'attempt',
        amountVnd: 10,
        purpose: 'DEPOSIT',
        status,
        applicationStatus: null,
        expiresAt: '2026-10-09T10:00:00Z',
      };
      render(<AttemptStatus attempt={attempt} />);
      expect(screen.getByLabelText('Trạng thái thanh toán')).toBeInTheDocument();
    },
  );
  it.each(['PENDING', 'SUCCEEDED'] as const)(
    'separates settled money from application %s',
    (applicationStatus) => {
      render(
        <AttemptStatus
          attempt={{
            paymentAttemptId: 'attempt',
            amountVnd: 10,
            purpose: 'BALANCE',
            status: 'SUCCEEDED',
            applicationStatus,
            expiresAt: '2026-10-09T10:00:00Z',
          }}
        />,
      );
      expect(
        screen.getByText(
          applicationStatus === 'SUCCEEDED'
            ? 'Đã hoàn tất cập nhật hồ sơ.'
            : 'Tiền đã được xác minh; hồ sơ đang chờ cập nhật.',
        ),
      ).toBeInTheDocument();
    },
  );
  it('covers stable errors without disclosing raw provider text', () => {
    for (const code of [
      'STALE_BILLING_REVISION',
      'BILLING_REFUND_LIMIT_EXCEEDED',
      'BILLING_REFUND_NOT_APPROVED',
      'DEPOSIT_NOT_ELIGIBLE',
      'PAYMENT_OUTCOME_UNKNOWN',
      'REQUEST_IN_PROGRESS',
      'IDEMPOTENCY_KEY_REUSED',
    ])
      expect(billingMessage(error(code, 409))).not.toContain('provider message');
    for (const status of [401, 403, 404]) {
      expect(denied(error('DENIED', status))).toBe(true);
      expect(billingMessage(error('DENIED', status))).toContain('quyền');
    }
    expect(denied(new Error())).toBe(false);
    expect(unresolved(new Error())).toBe(true);
    expect(unresolved(error('TIMEOUT', undefined, 'timeout'))).toBe(true);
    expect(unresolved(error('SERVER', 503))).toBe(true);
    expect(unresolved(error('SERVER'))).toBe(true);
    expect(unresolved(error('VALIDATION', 422))).toBe(false);
    expect(billingMessage(error('VALIDATION', 422))).toContain('từ chối');
    expect(billingMessage(error('SERVER', 500))).toContain('Chưa rõ');
    expect(billingMessage(new Error())).toContain('lịch sử');
  });
});
