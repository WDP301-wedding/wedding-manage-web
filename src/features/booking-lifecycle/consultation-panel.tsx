'use client';

import { ActivationStatus } from './activation-status';
import type { FormEvent } from 'react';
import type { BookingPrefill, InviteLogEntry } from './booking-helpers';
import { field } from './booking-helpers';
import { bookingStyles } from './booking.styles';

export interface ConsultationPanelProps {
  activationVisible?: boolean;
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  logs?: readonly InviteLogEntry[] | undefined;
  onClearLogs?: (() => void) | undefined;
  onCreate: (input: {
    intendedEmail: string;
    displayName: string;
    note?: string;
    sourceConsultationId?: string;
  }) => Promise<void>;
  onInvite?: (() => Promise<void>) | undefined;
  onReset?: (() => void) | undefined;
  prefill?: BookingPrefill | undefined;
  customerPicker?: React.ReactNode | undefined;
}

export function ConsultationPanel({
  consultation,
  activationVisible = true,
  disabled,
  logs,
  onClearLogs,
  onCreate,
  onReset,
  prefill,
  customerPicker,
}: Readonly<ConsultationPanelProps>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = field(data, 'note').trim();
    void onCreate({
      ...(prefill?.sourceConsultationId
        ? { sourceConsultationId: prefill.sourceConsultationId }
        : {}),
      intendedEmail: field(data, 'email'),
      displayName: field(data, 'displayName'),
      ...(note === '' ? {} : { note }),
    });
  };

  return (
    <article
      className="booking-card"
      style={{
        padding: '1.25rem 1.35rem',
        borderRadius: '14px',
        position: 'relative',
      }}
    >
      <span
        className="booking-step"
        style={{
          top: '1rem',
          right: '1.25rem',
          fontSize: '1.25rem',
          opacity: 0.7,
        }}
      >
        01
      </span>
      <h2
        style={{
          fontSize: '1.15rem',
          margin: '0 0 0.35rem',
          color: 'var(--hy-wine, #7a1f3d)',
          fontWeight: 600,
        }}
      >
        Hồ sơ tư vấn
      </h2>
      <p
        style={{
          ...bookingStyles.stepKicker,
          fontSize: '0.8rem',
          marginBottom: '0.75rem',
          lineHeight: 1.45,
        }}
      >
        {consultation ? (
          'Hồ sơ tư vấn đã được lưu. Tiếp tục xử lý hoặc chọn khách cũ cho tiệc khác.'
        ) : (
          <>
            Nhập thông tin khách và bấm <strong>&quot;Tạo hồ sơ tư vấn&quot;</strong> để chuyển sang
            Bước 02.
          </>
        )}
      </p>

      {customerPicker ? <div style={{ marginBottom: '0.75rem' }}>{customerPicker}</div> : null}

      {prefill?.displayName || prefill?.email ? (
        <div
          style={{
            ...bookingStyles.prefillBox,
            padding: '5px 8px',
            fontSize: '0.78rem',
            marginBottom: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✓</span>
          <span>
            {prefill?.sourceConsultationId
              ? 'Đã chọn khách cũ. Email được giữ cố định để liên kết đúng tài khoản; có thể chọn lại khách ở danh sách bên cạnh.'
              : 'Đã tự động điền thông tin từ yêu cầu tư vấn của khách hàng.'}
          </span>
        </div>
      ) : null}

      {prefill?.sourceConsultationId && consultation === null && onReset ? (
        <button type="button" disabled={disabled} onClick={onReset} className="booking-secondary">
          Bỏ chọn khách cũ
        </button>
      ) : null}
      <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem' }}>
        <div className="booking-fields-inline" style={{ gap: '0.65rem' }}>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', margin: 0 }}>
            <span>Tên khách</span>
            <input
              key={`displayName-${prefill?.displayName ?? ''}`}
              name="displayName"
              readOnly={consultation !== null}
              required
              minLength={1}
              maxLength={120}
              defaultValue={prefill?.displayName ?? ''}
              placeholder="VD: Lã Gia Huy"
              style={{
                minHeight: '2.35rem',
                height: '2.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.84rem',
              }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', margin: 0 }}>
            <span>Email liên hệ</span>
            <input
              key={`email-${prefill?.email ?? ''}`}
              name="email"
              readOnly={consultation !== null || Boolean(prefill?.sourceConsultationId)}
              type="email"
              required
              defaultValue={prefill?.email ?? ''}
              placeholder="email@example.com"
              style={{
                minHeight: '2.35rem',
                height: '2.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.84rem',
              }}
            />
          </label>
        </div>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', margin: 0 }}>
          <span>Ghi chú</span>
          <textarea
            key={`note-${prefill?.note ?? ''}`}
            name="note"
            readOnly={consultation !== null}
            maxLength={2000}
            rows={2}
            defaultValue={prefill?.note ?? ''}
            placeholder="Yêu cầu riêng, ngày dự kiến, số khách ước tính..."
            style={{
              minHeight: '3.6rem',
              padding: '0.4rem 0.75rem',
              fontSize: '0.84rem',
              resize: 'vertical',
            }}
          />
        </label>
        <button
          disabled={disabled || consultation !== null}
          type="submit"
          style={{
            minHeight: '2.45rem',
            height: '2.45rem',
            padding: '0 1rem',
            fontSize: '0.84rem',
            fontWeight: 600,
            borderRadius: '8px',
          }}
        >
          {consultation ? 'Đã tạo hồ sơ tư vấn' : 'Tạo hồ sơ tư vấn'}
        </button>
      </form>

      {consultation === null ? null : (
        <div
          className="booking-result"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 0.9rem',
            gap: '0.45rem',
            borderRadius: '8px',
          }}
        >
          <small style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
            CONSULTATION · REV {consultation.revision}
          </small>
          <code style={{ fontSize: '0.82rem' }}>{consultation.id}</code>
          <div
            style={{
              marginTop: '0.25rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#166534',
              lineHeight: 1.45,
            }}
          >
            <strong>✓ Đã lưu hồ sơ tư vấn ban đầu.</strong>
            <p style={{ margin: '0.25rem 0 0', color: '#15803d' }}>
              Kiểm tra quyền truy cập khách hoặc chuyển sang{' '}
              <strong>Bước 02: Khảo sát sảnh &amp; Đặt tiệc</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            {activationVisible ? (
              <ActivationStatus
                key={consultation.id}
                consultationId={consultation.id}
                disabled={disabled}
                reloadSignal={logs?.length ?? 0}
              />
            ) : null}
            {onReset ? (
              <button
                disabled={disabled}
                type="button"
                className="booking-secondary"
                onClick={onReset}
                style={{
                  minHeight: '2.1rem',
                  height: '2.1rem',
                  padding: '0 0.75rem',
                  fontSize: '0.78rem',
                }}
              >
                + Lập hồ sơ tư vấn cho tiệc khác
              </button>
            ) : null}
          </div>
          {logs && logs.length > 0 ? (
            <div
              style={{
                marginTop: '0.65rem',
                padding: '0.65rem',
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
                  marginBottom: '0.4rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Nhật ký gửi lời mời
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {logs.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      lineHeight: '1.35',
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
                      <small style={{ color: '#64748b', fontSize: '0.72rem' }}>{item.time}</small>
                    </div>
                    <div style={{ marginTop: '2px', color: '#1e293b' }}>{item.message}</div>
                    {item.invitationId ? (
                      <div style={{ marginTop: '3px', fontSize: '0.72rem' }}>
                        <span style={{ color: '#64748b' }}>Mã lời mời: </span>
                        <code
                          style={{
                            background: 'rgba(0,0,0,0.06)',
                            padding: '1px 4px',
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
