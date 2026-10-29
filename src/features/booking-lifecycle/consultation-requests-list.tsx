'use client';

import Link from 'next/link';
import { bookingPhaseLabel } from './booking-helpers';
import { intakeStyles } from './intake.styles';
import type { Item } from './use-consultation-requests';

export interface ConsultationRequestsListProps {
  items: readonly Item[];
  pending: boolean;
  onAction: (item: Item, action: 'conversion' | 'closure') => void;
  nextCursor?: string | null;
  onLoadMore: (cursor: string) => void;
}

function getDateRemainingText(dateStr: string): string | null {
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Đã qua';
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Ngày mai';
  if (diffDays <= 7) return `Còn ${diffDays} ngày`;
  return null;
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
            <div className="intake-card-header" style={intakeStyles.cardHeader}>
              <div className="intake-header-main">
                <div style={intakeStyles.kickerRow}>
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
                    {item.status === 'CONVERTED' &&
                      (item.bookingId
                        ? bookingPhaseLabel(item.bookingPhase ?? '')
                        : 'Đang tư vấn · Chưa lập tiệc')}
                    {item.status === 'CLOSED' && 'Lưu trữ'}
                  </span>
                </div>
                <h2>{item.displayName}</h2>
                <p style={intakeStyles.contactChips}>
                  <a href={`mailto:${item.email}`} style={intakeStyles.contactLink}>
                    <span>{item.email}</span>
                  </a>
                  {item.phone && (
                    <>
                      <span style={{ color: 'var(--hy-outline, #eadfd6)' }}>·</span>
                      <a href={`tel:${item.phone}`} style={intakeStyles.contactLink}>
                        <span>{item.phone}</span>
                      </a>
                    </>
                  )}
                </p>
              </div>

              {item.status === 'NEW' && (
                <div className="intake-header-actions" style={intakeStyles.headerActions}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onAction(item, 'closure')}
                    style={intakeStyles.secondaryActionBtn}
                  >
                    Đóng yêu cầu
                  </button>
                  <button
                    className="booking-primary-link"
                    type="button"
                    disabled={pending}
                    onClick={() => void onAction(item, 'conversion')}
                    style={intakeStyles.primaryActionBtn}
                    aria-label="Mở hồ sơ tư vấn"
                  >
                    Duyệt hồ sơ và mời khách truy cập
                  </button>
                </div>
              )}

              {item.status === 'CONVERTED' && item.consultationId && (
                <div className="intake-header-actions" style={intakeStyles.headerActions}>
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
                    <code style={intakeStyles.consultationCode}>{item.consultationId}</code>
                  </div>
                  {(() => {
                    const params = new URLSearchParams({ consultationId: item.consultationId });
                    return (
                      <Link
                        className="booking-primary-link"
                        href={`/bookings?${params.toString()}`}
                        style={intakeStyles.primaryActionBtn}
                      >
                        {item.bookingId ? 'Mở hồ sơ đặt tiệc' : 'Tiếp tục tư vấn & lập tiệc'}
                      </Link>
                    );
                  })()}
                </div>
              )}
            </div>

            <dl className="intake-data-ribbon" style={intakeStyles.dataRibbon}>
              <div style={intakeStyles.ribbonItem}>
                <dt style={intakeStyles.ribbonDt}>
                  <span>Ngày mong muốn</span>
                </dt>
                <dd style={intakeStyles.ribbonDd}>
                  <span>{item.preferredDate ?? 'Chưa chọn'}</span>
                  {item.preferredDate && getDateRemainingText(item.preferredDate) ? (
                    <span style={intakeStyles.contextTag(item.preferredDate)}>
                      {getDateRemainingText(item.preferredDate)}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div style={intakeStyles.ribbonItem}>
                <dt style={intakeStyles.ribbonDt}>
                  <span>Số khách dự kiến</span>
                </dt>
                <dd style={intakeStyles.ribbonDd}>
                  <span>{item.expectedGuests ?? 'Chưa cung cấp'}</span>
                  {item.expectedGuests ? (
                    <span style={intakeStyles.subDetail}>
                      {` khách (~${Math.ceil(item.expectedGuests / 10)} bàn)`}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div style={intakeStyles.ribbonItem}>
                <dt style={intakeStyles.ribbonDt}>
                  <span>Đã nhận</span>
                </dt>
                <dd style={intakeStyles.ribbonDd}>
                  <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                </dd>
              </div>
            </dl>

            {item.message && (
              <div className="intake-message-callout" style={intakeStyles.messageCallout}>
                <div style={intakeStyles.messageHeader}>
                  <span style={intakeStyles.messageLabel}>Lời nhắn từ khách hàng:</span>
                </div>
                <p className="intake-message" style={intakeStyles.messageText}>
                  {item.message}
                </p>
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
