'use client';

import Link from 'next/link';
import { intakeStyles } from './intake.styles';
import type { Item } from './use-consultation-requests';
import { parseConsultationChoices } from './booking-helpers';

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
                    {item.status === 'CONVERTED' && 'Đang tư vấn'}
                    {item.status === 'CLOSED' && 'Lưu trữ'}
                  </span>
                </div>
                <h2>{item.displayName}</h2>
                <p style={intakeStyles.contactChips}>
                  <a href={`mailto:${item.email}`} style={intakeStyles.contactLink}>
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span>{item.email}</span>
                  </a>
                  {item.phone && (
                    <>
                      <span style={{ color: 'var(--hy-outline, #eadfd6)' }}>·</span>
                      <a href={`tel:${item.phone}`} style={intakeStyles.contactLink}>
                        <svg
                          aria-hidden="true"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
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
                    Duyệt hồ sơ và gửi lời mời kích hoạt
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
                    <code style={intakeStyles.consultationCode}>
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
                    if (item.message) {
                      params.set('note', item.message);
                      const parsed = parseConsultationChoices(item.message);
                      if (parsed.hallName) params.set('preferredHall', parsed.hallName);
                      if (parsed.menuName) params.set('preferredMenu', parsed.menuName);
                      if (parsed.shift) params.set('preferredShift', parsed.shift);
                    }
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
            </div>

            <dl className="intake-data-ribbon" style={intakeStyles.dataRibbon}>
              <div style={intakeStyles.ribbonItem}>
                <dt style={intakeStyles.ribbonDt}>
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: 'var(--hy-wine, #7a1f3d)' }}
                  >
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
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
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: 'var(--hy-wine, #7a1f3d)' }}
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
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
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: 'var(--hy-wine, #7a1f3d)' }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
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
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: 'var(--hy-wine-gold, #c5a880)' }}
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
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
