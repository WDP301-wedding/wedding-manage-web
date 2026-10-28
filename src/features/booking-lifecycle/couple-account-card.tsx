'use client';

import { ActivationStatus } from './activation-status';
import type { InviteLogEntry } from './booking-helpers';

export interface CoupleAccountCardProps {
  consultationId?: string | undefined;
  email?: string | undefined;
  canInvite: boolean;
  pending: boolean;
  inviteLogs: readonly InviteLogEntry[];
  onInvite: () => void;
  onClearLogs: () => void;
}

export function CoupleAccountCard({
  consultationId,
  email,
  canInvite,
  pending,
  inviteLogs,
  onInvite,
  onClearLogs,
}: Readonly<CoupleAccountCardProps>) {
  return (
    <article
      id="couple-account-card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--hy-outline, #eadfd6)',
        borderRadius: '14px',
        padding: '1.35rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 12px rgba(122, 31, 61, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          marginBottom: inviteLogs.length > 0 ? '0.85rem' : 0,
        }}
      >
        <div>
          <h3
            style={{
              margin: '0 0 0.35rem',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              lineHeight: 1.35,
              color: 'var(--hy-wine, #7a1f3d)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Tài khoản &amp; Quyền truy cập hồ sơ tiệc
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.84rem',
              lineHeight: 1.45,
              color: 'var(--hy-ink-muted, #6e5d63)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Gửi email kích hoạt tài khoản để cặp đôi đăng nhập vào cổng thông tin duyệt kịch bản và
            xem hợp đồng. Khách có thể kích hoạt và đăng nhập app trước đặt cọc; các chức năng sau
            cọc vẫn theo quyền của từng tiệc. Khách đã có tài khoản dùng tài khoản hiện có để nhận
            lời mời vào tiệc mới, không cần tạo lại tài khoản.
            {email ? (
              <>
                {' '}
                · Email:{' '}
                <span className="hy-couple-email-pill">
                  {email}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {canInvite && !consultationId ? (
          <button
            type="button"
            disabled={pending}
            onClick={onInvite}
            className="hy-action-btn-primary"
            style={{
              padding: '0.55rem 1.15rem',
            }}
          >
            <span>
              {inviteLogs.some((l) => l.type === 'success')
                ? 'Gửi lại email kích hoạt'
                : 'Gửi lời mời cộng tác'}
            </span>
          </button>
        ) : null}
      </div>

      {consultationId ? (
        <ActivationStatus
          key={consultationId}
          consultationId={consultationId}
          disabled={pending}
          reloadSignal={inviteLogs.length}
        />
      ) : null}
      {inviteLogs.length > 0 ? (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--hy-surface-warm, #fbf4ee)',
            border: '1px solid var(--hy-outline, #eadfd6)',
            borderRadius: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.6rem',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--hy-ink, #2b1d22)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Nhật ký gửi lời mời
            </span>
            <button
              type="button"
              onClick={onClearLogs}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.74rem',
                color: 'var(--hy-ink-muted, #6e5d63)',
                cursor: 'pointer',
                padding: '2px 6px',
                textDecoration: 'underline',
                fontFamily: 'var(--font-body)',
              }}
            >
              Xóa log
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {inviteLogs.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                  fontFamily: 'var(--font-body)',
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
                  color:
                    item.type === 'success'
                      ? '#166534'
                      : item.type === 'error'
                        ? '#991b1b'
                        : '#92400e',
                }}
              >
                <span>[{item.time}] </span>
                <span>{item.message}</span>
                {item.invitationId && item.invitationId !== 'Đã phát hành (ISSUED)' ? (
                  <span style={{ marginLeft: '6px', opacity: 0.8 }}>(ID: {item.invitationId})</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
