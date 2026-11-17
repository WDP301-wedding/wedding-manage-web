'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Mail, Phone } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { Button, buttonVariants } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { bookingPhaseLabel, bookingPhaseTone, formatDate, type BadgeTone } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import type { Item } from '@/src/features/booking-lifecycle/hooks/use-consultation-requests';
import styles from '@/src/features/booking-lifecycle/styles/consultation-requests.module.css';

export interface ConsultationRequestsListProps {
  items: readonly Item[];
  pending: boolean;
  onAction: (item: Item, action: 'conversion' | 'closure') => void;
  nextCursor?: string | null;
  onLoadMore: (cursor: string) => void;
}

export function ConsultationListSkeleton() {
  return (
    <div
      className={styles.results}
      role="status"
      aria-label="Đang tải danh sách yêu cầu tư vấn"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải danh sách yêu cầu tư vấn…</span>
      <div className={styles.grid}>
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className={styles.card}>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
            <div className={styles.metadata}>
              {[1, 2, 3, 4].map((cell) => (
                <Skeleton key={cell} className="h-10 w-full" />
              ))}
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-auto h-9 w-32 self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

const requestStatuses: Record<Item['status'], { tone: BadgeTone; label: string }> = {
  NEW: { tone: 'warning', label: 'Chờ tiếp nhận' },
  CONVERTED: { tone: 'neutral', label: 'Đã mở tư vấn' },
  CLOSED: { tone: 'neutral', label: 'Đã kết thúc' },
};

function LinkedBooking({ item }: Readonly<{ item: Item }>) {
  if (!item.bookingId)
    return (
      <span className={styles.secondary}>
        {item.status === 'CONVERTED' ? 'Chưa lập tiệc' : 'Chưa có tiệc'}
      </span>
    );
  return (
    <Badge
      className={styles.statusBadge}
      variant={bookingPhaseTone(item.bookingPhase ?? '', item.preferredDate)}
    >
      {bookingPhaseLabel(item.bookingPhase ?? '', item.preferredDate)}
    </Badge>
  );
}

function bookingHref(item: Item & { consultationId: string }): string {
  const params = new URLSearchParams({ consultationId: item.consultationId });
  if (item.displayName) params.set('displayName', item.displayName);
  if (item.email) params.set('email', item.email);
  if (item.preferredDate) params.set('preferredDate', item.preferredDate);
  if (item.expectedGuests !== undefined && item.expectedGuests !== null) {
    params.set('expectedGuests', String(item.expectedGuests));
  }
  if (item.preferredShift) params.set('preferredShift', item.preferredShift);
  if (item.preferredHallId) params.set('preferredHall', item.preferredHallId);
  if (item.preferredMenuVersionId) params.set('preferredMenu', item.preferredMenuVersionId);
  if (item.message) params.set('note', item.message);
  return `/bookings?${params.toString()}`;
}

function RequestCard({
  item,
  pending,
  onAction,
}: Readonly<Pick<ConsultationRequestsListProps, 'pending' | 'onAction'> & { item: Item }>) {
  const [expanded, setExpanded] = useState(false);
  const detailId = `consultation-detail-${item.id}`;
  const headingId = `consultation-heading-${item.id}`;
  const request = requestStatuses[item.status];
  const shift =
    item.preferredShift === 'LUNCH'
      ? 'Ca trưa'
      : item.preferredShift === 'DINNER'
        ? 'Ca tối'
        : 'Chưa chọn ca';
  return (
    <li className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHeader}>
        <h2 id={headingId} className={styles.customerName}>
          {item.displayName}
        </h2>
        <Badge className={styles.statusBadge} variant={request.tone}>
          {request.label}
        </Badge>
      </div>
      <div className={styles.contacts}>
        <a className={styles.contact} href={`mailto:${item.email}`}>
          <Mail size={14} aria-hidden />
          <span>{item.email}</span>
        </a>
        {item.phone && (
          <a className={styles.contact} href={`tel:${item.phone}`}>
            <Phone size={14} aria-hidden />
            <span>{item.phone}</span>
          </a>
        )}
      </div>
      <dl className={styles.metadata}>
        <div>
          <dt>Ngày mong muốn</dt>
          <dd>{item.preferredDate ? formatDate(item.preferredDate) : 'Chưa chọn ngày'}</dd>
        </div>
        <div>
          <dt>Ca mong muốn</dt>
          <dd>{shift}</dd>
        </div>
        <div>
          <dt>Số khách dự kiến</dt>
          <dd>
            {item.expectedGuests == null
              ? 'Chưa cung cấp'
              : `${item.expectedGuests.toLocaleString('vi-VN')} khách`}
          </dd>
        </div>
        <div>
          <dt>Ngày nhận</dt>
          <dd>{formatDate(item.createdAt)}</dd>
        </div>
      </dl>
      <div className={styles.bookingStatus}>
        <span>Tiệc liên quan</span>
        <LinkedBooking item={item} />
      </div>
      <div
        id={detailId}
        className={styles.messageSection}
        role="region"
        aria-label={`Lời nhắn trong yêu cầu của ${item.displayName}`}
      >
        <div className={`${styles.message} ${styles.messagePreview}`}>
          <strong hidden={!expanded}>Lời nhắn từ khách hàng</strong>
          <p className={styles.previewText} data-expanded={expanded}>
            {item.message || 'Khách hàng chưa để lại lời nhắn.'}
          </p>
        </div>
        {expanded && item.status === 'NEW' && (
          <div className={styles.detail}>
            <p className={styles.secondary}>
              Tiếp nhận sẽ mở hồ sơ tư vấn và gửi lời mời khách truy cập.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-destructive hover:bg-hy-error-bg"
              type="button"
              disabled={pending}
              onClick={() => onAction(item, 'closure')}
            >
              Đóng yêu cầu
            </Button>
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.expandButton}
          type="button"
          aria-expanded={expanded}
          aria-controls={detailId}
          aria-label={`${expanded ? 'Thu gọn' : 'Xem chi tiết'} yêu cầu của ${item.displayName}`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <ChevronDown size={16} aria-hidden />
          ) : (
            <ChevronRight size={16} aria-hidden />
          )}
          <span>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
        </button>
        {item.status === 'NEW' && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onAction(item, 'conversion')}
            aria-label="Mở hồ sơ tư vấn"
            title="Mở hồ sơ tư vấn và mời khách truy cập"
          >
            Tiếp nhận &amp; mời khách
          </Button>
        )}
        {item.status === 'CONVERTED' && item.consultationId && (
          <Link
            className={buttonVariants({
              variant: item.bookingId ? 'outline' : 'default',
              size: 'sm',
            })}
            href={bookingHref({ ...item, consultationId: item.consultationId })}
          >
            {item.bookingId ? 'Mở hồ sơ' : 'Tiếp tục tư vấn'}
          </Link>
        )}
      </div>
    </li>
  );
}

export function ConsultationRequestsList({
  items,
  pending,
  onAction,
  nextCursor,
  onLoadMore,
}: Readonly<ConsultationRequestsListProps>) {
  return (
    <div className={styles.results}>
      <ul className={styles.grid} aria-label="Danh sách yêu cầu tư vấn">
        {items.map((item) => (
          <RequestCard key={item.id} item={item} pending={pending} onAction={onAction} />
        ))}
      </ul>
      <footer className={styles.resultsFooter}>
        <p>
          Đang hiển thị <strong>{items.length.toLocaleString('vi-VN')}</strong> yêu cầu
        </p>
        {nextCursor && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={pending}
            onClick={() => onLoadMore(nextCursor)}
          >
            Xem thêm yêu cầu
          </Button>
        )}
      </footer>
    </div>
  );
}
