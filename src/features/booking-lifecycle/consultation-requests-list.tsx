'use client';

import Link from 'next/link';
import { intakeStyles } from './intake.styles';
import type { Item } from './use-consultation-requests';

export interface ConsultationRequestsListProps {
  items: readonly Item[];
  pending: boolean;
  onAction: (item: Item, action: 'conversion' | 'closure') => void;
  nextCursor?: string | null;
  onLoadMore: (cursor: string) => void;
}

export function ConsultationRequestsList({
  items,
  pending,
  onAction,
  nextCursor,
  onLoadMore,
}: Readonly<ConsultationRequestsListProps>) {
  return (
    <>
      <div className="intake-list">
        {items.map((item) => (
          <article
            className="intake-item"
            key={item.id}
            style={intakeStyles.intakeItem(item.status)}
          >
            <div style={intakeStyles.cardHeader}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <p className="section-kicker" style={{ margin: 0 }}>
                    {
                      {
                        NEW: 'Cần tiếp nhận',
                        CONVERTED: 'Đã mở hồ sơ',
                        CLOSED: 'Đã đóng',
                      }[item.status]
                    }
                  </p>
                  <span style={intakeStyles.statusBadge(item.status)}>
                    {item.status === 'NEW' && 'Mới'}
                    {item.status === 'CONVERTED' && 'Đang tư vấn'}
                    {item.status === 'CLOSED' && 'Lưu trữ'}
                  </span>
                </div>
                <h2>{item.displayName}</h2>
                <p style={intakeStyles.contactChips}>
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                  {item.phone && (
                    <>
                      {' '}
                      · <a href={`tel:${item.phone}`}>{item.phone}</a>
                    </>
                  )}
                </p>
              </div>
            </div>

            <dl>
              <div>
                <dt>Ngày mong muốn</dt>
                <dd>{item.preferredDate ?? 'Chưa chọn'}</dd>
              </div>
              <div>
                <dt>Số khách dự kiến</dt>
                <dd>{item.expectedGuests ?? 'Chưa cung cấp'}</dd>
              </div>
              <div>
                <dt>Đã nhận</dt>
                <dd>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</dd>
              </div>
            </dl>

            {item.message && <p className="intake-message">{item.message}</p>}

            {item.status === 'NEW' && (
              <div className="intake-actions">
                <button
                  className="booking-primary-link"
                  type="button"
                  disabled={pending}
                  onClick={() => void onAction(item, 'conversion')}
                  style={intakeStyles.primaryActionBtn}
                >
                  Duyệt hồ sơ và gửi lời mời kích hoạt
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onAction(item, 'closure')}
                  style={intakeStyles.secondaryActionBtn}
                >
                  Đóng yêu cầu
                </button>
              </div>
            )}

            {item.status === 'CONVERTED' && item.consultationId && (
              <div style={intakeStyles.convertedBanner}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <small
                    style={{
                      color: 'var(--hy-text-muted, #6e5d63)',
                      fontWeight: 600,
                    }}
                  >
                    Mã hồ sơ tư vấn:
                  </small>
                  <code
                    style={{
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      border: '1px solid var(--hy-status-success-border, #bbf7d0)',
                      color: 'var(--hy-status-success, #2f6b4f)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {item.consultationId}
                  </code>
                </div>
                {(() => {
                  const params = new URLSearchParams({
                    consultationId: item.consultationId,
                    consultationRevision: String(item.consultationRevision ?? 1),
                  });
                  if (item.displayName) params.set('displayName', item.displayName);
                  if (item.email) params.set('email', item.email);
                  if (item.preferredDate) params.set('preferredDate', item.preferredDate);
                  if (item.expectedGuests !== undefined && item.expectedGuests !== null) {
                    params.set('expectedGuests', String(item.expectedGuests));
                  }
                  if (item.message) params.set('note', item.message);
                  return (
                    <Link
                      className="booking-primary-link"
                      href={`/bookings?${params.toString()}`}
                      style={intakeStyles.primaryActionBtn}
                    >
                      Tiếp tục đặt tiệc
                    </Link>
                  );
                })()}
              </div>
            )}
          </article>
        ))}
      </div>

      {nextCursor ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void onLoadMore(nextCursor)}
          style={intakeStyles.loadMoreBtn}
        >
          Xem thêm yêu cầu
        </button>
      ) : null}
    </>
  );
}
