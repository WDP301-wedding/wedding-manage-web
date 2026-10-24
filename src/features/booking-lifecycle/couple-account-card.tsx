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
        border: '1px solid var(--hy-outline, #e2e8f0)',
        borderRadius: '8px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: inviteLogs.length > 0 ? '0.75rem' : 0,
        }}
      >
        <div>
          <h3
            style={{
              margin: '0 0 0.25rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--hy-wine, #7a1f3d)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>👥</span>
            <span>Tài khoản Cặp đôi &amp; Không gian cộng tác</span>
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.82rem',
              color: 'var(--hy-text-muted, #64748b)',
            }}
          >
            Gửi email kích hoạt tài khoản để cặp đôi đăng nhập vào cổng thông tin duyệt kịch bản và
            xem hợp đồng. Khách có thể kích hoạt và đăng nhập app trước đặt cọc; các chức năng sau
            cọc vẫn theo quyền của từng tiệc.
            {email ? (
              <>
                {' '}
                · Email: <strong>{email}</strong>
              </>
            ) : null}
          </p>
        </div>
        {canInvite && !consultationId ? (
          <button
            type="button"
            disabled={pending}
            onClick={onInvite}
            style={{
              backgroundColor: 'var(--hy-wine, #7a1f3d)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✉️</span>
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
            marginTop: '0.75rem',
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
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              📋 Nhật ký gửi lời mời
            </span>
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
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {inviteLogs.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '0.45rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
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
