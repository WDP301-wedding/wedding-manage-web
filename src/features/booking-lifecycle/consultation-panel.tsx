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
  onInvite: () => Promise<void>;
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button disabled={disabled} type="button" onClick={() => void onInvite()}>
              Gửi lời mời cộng tác
            </button>
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

          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.6rem 0.75rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: '#1e40af',
              lineHeight: 1.5,
            }}
          >
            <strong>💡 Quy trình tránh lặp form:</strong> Sau khi có mã tư vấn, Quản lý cần hoàn tất{' '}
            <strong>Bước 02: Tạo booking</strong> (chọn sảnh, thực đơn, ngày tiệc bên cạnh). Nếu
            chưa tạo booking, Couple khi đăng nhập sẽ thấy chưa có tiệc và bị chuyển về form yêu cầu
            tư vấn.
          </div>

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
                📋 Nhật ký gửi lời mời (Log)
              </span>
              {logs && logs.length > 0 && onClearLogs ? (
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

            {!logs || logs.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                Chưa có thao tác gửi nào. Bấm &quot;Gửi lời mời cộng tác&quot; để gửi email kích
                hoạt cho Couple.
              </p>
            ) : (
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
                        <span style={{ color: '#64748b' }}>Mã lời mời (invitationId): </span>
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
                    {item.details ? (
                      <div style={{ marginTop: '3px', fontSize: '0.75rem', color: '#475569' }}>
                        {item.details}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
