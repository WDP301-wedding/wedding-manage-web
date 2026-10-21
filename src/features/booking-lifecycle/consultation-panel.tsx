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
            <strong>✓ Đã lưu hồ sơ tư vấn ban đầu.</strong>
            <p style={{ margin: '0.35rem 0 0', color: '#15803d' }}>
              Bạn có thể <strong>Gửi lời mời cộng tác</strong> ngay để cặp đôi cùng theo dõi thông tin
              tư vấn, hoặc chuyển sang <strong>Bước 02: Khảo sát sảnh &amp; Đặt tiệc</strong> để chọn
              sảnh và hoàn tất thủ tục đặt tiệc.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {onInvite ? (
              <button disabled={disabled} type="button" onClick={() => void onInvite()}>
                Gửi lời mời cộng tác
              </button>
            ) : null}
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
          {logs && logs.length > 0 ? (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  📋 Nhật ký gửi lời mời
                </span>
                {onClearLogs ? (
                  <button
                    type="button"
                    onClick={onClearLogs}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      textDecoration: 'underline',
                    }}
                  >
                    Xóa log
                  </button>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {logs.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.5rem 0.65rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      lineHeight: '1.4',
                      backgroundColor:
                        item.type === 'success'
                          ? '#f0fdf4'
                          : item.type === 'error'
                            ? '#fef2f2'
                            : '#fffbeb',
                      border: `1px solid ${
                        item.type === 'success'
                          ? '#bbf7d0'
                          : item.type === 'error'
                            ? '#fecaca'
                            : '#fde68a'
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            item.type === 'success'
                              ? '#166534'
                              : item.type === 'error'
                                ? '#991b1b'
                                : '#92400e',
                        }}
                      >
                        {item.type === 'success'
                          ? '✓ Đã gửi thành công'
                          : item.type === 'error'
                            ? '✕ Gửi thất bại'
                            : '⏳ Đang xử lý...'}
                      </span>
                      <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.time}</small>
                    </div>
                    <div style={{ marginTop: '3px', color: '#1e293b' }}>{item.message}</div>
                    {item.invitationId ? (
                      <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                        <span style={{ color: '#64748b' }}>Mã lời mời: </span>
                        <code
                          style={{
                            background: 'rgba(0,0,0,0.06)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            wordBreak: 'break-all',
                          }}
                        >
                          {item.invitationId}
                        </code>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
