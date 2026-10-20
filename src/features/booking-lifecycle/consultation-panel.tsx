'use client';

import type { FormEvent } from 'react';
import type { BookingPrefill, InviteLogEntry } from './booking-helpers';
import { field } from './booking-helpers';
import { bookingStyles } from './booking.styles';

export interface ConsultationPanelProps {
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  logs?: readonly InviteLogEntry[] | undefined;
  onClearLogs?: (() => void) | undefined;
  onCreate: (input: { intendedEmail: string; displayName: string; note?: string }) => Promise<void>;
  onInvite?: (() => Promise<void>) | undefined;
  onReset?: (() => void) | undefined;
  prefill?: BookingPrefill | undefined;
}

export function ConsultationPanel({
  consultation,
  disabled,
  logs,
  onClearLogs,
  onCreate,
  onInvite,
  onReset,
  prefill,
}: Readonly<ConsultationPanelProps>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = field(data, 'note').trim();
    void onCreate({
      intendedEmail: field(data, 'email'),
      displayName: field(data, 'displayName'),
      ...(note === '' ? {} : { note }),
    });
  };

  return (
    <article className="booking-card">
      <span className="booking-step">01</span>
      <h2>Hồ sơ tư vấn</h2>
      <p style={bookingStyles.stepKicker}>
        Nhập thông tin cặp đôi và bấm <strong>&quot;Tạo hồ sơ tư vấn&quot;</strong> để cấp mã tự
        động sang Bước 02.
      </p>
      {prefill?.displayName || prefill?.email ? (
        <div style={bookingStyles.prefillBox}>
          <span>✓</span>
          <span>Đã tự động điền thông tin từ yêu cầu tư vấn của khách hàng.</span>
        </div>
      ) : null}
      <form onSubmit={submit}>
        <label>
          Tên cặp đôi
          <input
            key={`displayName-${prefill?.displayName ?? ''}`}
            name="displayName"
            required
            minLength={1}
            maxLength={120}
            defaultValue={prefill?.displayName ?? ''}
          />
        </label>
        <label>
          Email liên hệ
          <input
            key={`email-${prefill?.email ?? ''}`}
            name="email"
            type="email"
            required
            defaultValue={prefill?.email ?? ''}
          />
        </label>
        <label>
          Ghi chú
          <textarea
            key={`note-${prefill?.note ?? ''}`}
            name="note"
            maxLength={2000}
            rows={3}
            defaultValue={prefill?.note ?? ''}
          />
        </label>
        <button disabled={disabled} type="submit">
          Tạo hồ sơ tư vấn
        </button>
      </form>
      {consultation === null ? null : (
        <div className="booking-result">
          <small>CONSULTATION · REV {consultation.revision}</small>
          <code>{consultation.id}</code>
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 0.9rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              fontSize: '0.84rem',
              color: '#166534',
              lineHeight: 1.5,
            }}
          >
            <strong>✓ Đã tạo mã hồ sơ tư vấn.</strong>
            <p style={{ margin: '0.35rem 0 0', color: '#15803d' }}>
              Vui lòng chuyển sang <strong>Bước 02: Khảo sát sảnh &amp; Đặt tiệc</strong> để chọn
              sảnh, ngày và tạo booking nháp trước. Lời mời kích hoạt tài khoản sẽ xuất hiện để gửi
              cho cặp đôi ngay sau khi tạo booking thành công.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {onReset ? (
              <button
                disabled={disabled}
                type="button"
                className="booking-secondary"
                onClick={onReset}
              >
                + Đặt cho cặp đôi mới
              </button>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}
