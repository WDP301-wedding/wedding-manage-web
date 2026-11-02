'use client';

import Link from 'next/link';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { bookingPhaseLabel, bookingPhaseTone, type BadgeTone } from './booking-helpers';
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

function statusBadge(item: Item): { tone: BadgeTone; label: string } {
  if (item.status === 'NEW') return { tone: 'warning', label: 'Mới' };
  if (item.status === 'CLOSED') return { tone: 'neutral', label: 'Lưu trữ' };
  if (item.bookingId) {
    return {
      tone: bookingPhaseTone(item.bookingPhase ?? ''),
      label: bookingPhaseLabel(item.bookingPhase ?? ''),
    };
  }
  return { tone: 'info', label: 'Đang tư vấn · Chưa lập tiệc' };
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

export function ConsultationRequestsList({
  items,
  pending,
  onAction,
  nextCursor,
  onLoadMore,
}: Readonly<ConsultationRequestsListProps>) {
  return (
    <>
      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const badge = statusBadge(item);
          const dateTag = item.preferredDate ? getDateRemainingText(item.preferredDate) : null;
          return (
            <article
              key={item.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card px-6 py-5 shadow-hy-1"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {
                        {
                          NEW: 'Cần tiếp nhận',
                          CONVERTED: 'Đã mở hồ sơ',
                          CLOSED: 'Đã đóng',
                        }[item.status]
                      }
                    </p>
                    <Badge variant={badge.tone}>{badge.label}</Badge>
                  </div>
                  <h2 className="text-lg font-semibold">{item.displayName}</h2>
                  <p className="flex flex-wrap gap-2 text-xs">
                    <a className="text-primary hover:underline" href={`mailto:${item.email}`}>
                      <span>{item.email}</span>
                    </a>
                    {item.phone && (
                      <>
                        <span className="text-input" aria-hidden="true">
                          ·
                        </span>
                        <a className="text-primary hover:underline" href={`tel:${item.phone}`}>
                          <span>{item.phone}</span>
                        </a>
                      </>
                    )}
                  </p>
                </div>

                {item.status === 'NEW' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      className="text-destructive hover:bg-hy-error-bg"
                      type="button"
                      disabled={pending}
                      onClick={() => void onAction(item, 'closure')}
                    >
                      Đóng yêu cầu
                    </Button>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => void onAction(item, 'conversion')}
                      aria-label="Mở hồ sơ tư vấn"
                    >
                      Duyệt hồ sơ và mời khách truy cập
                    </Button>
                  </div>
                )}

                {item.status === 'CONVERTED' && item.consultationId && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2">
                      <small className="text-xs font-semibold text-muted-foreground">
                        Mã hồ sơ tư vấn:
                      </small>
                      <code className="rounded-md bg-secondary px-2 py-1 font-mono text-2xs text-muted-foreground">
                        {item.consultationId}
                      </code>
                    </div>
                    <Link
                      className={buttonVariants({
                        variant: item.bookingId ? 'outline' : 'default',
                      })}
                      href={bookingHref({ ...item, consultationId: item.consultationId })}
                    >
                      {item.bookingId ? 'Mở hồ sơ đặt tiệc' : 'Tiếp tục tư vấn & lập tiệc'}
                    </Link>
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-6 gap-y-3 rounded-lg bg-muted p-4">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    <span>Ngày mong muốn</span>
                  </dt>
                  <dd className="flex flex-wrap items-center gap-2 font-semibold tabular-nums">
                    <span>
                      {item.preferredDate
                        ? item.preferredDate.split('-').reverse().join('/')
                        : 'Chưa chọn'}
                    </span>
                    {dateTag ? (
                      <span className="rounded-full border border-input px-2 text-2xs leading-5 font-medium">
                        {dateTag}
                      </span>
                    ) : null}
                  </dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    <span>Ca mong muốn</span>
                  </dt>
                  <dd className="font-semibold">
                    <span>
                      {item.preferredShift === 'LUNCH'
                        ? 'Ca trưa'
                        : item.preferredShift === 'DINNER'
                          ? 'Ca tối'
                          : 'Chưa chọn'}
                    </span>
                  </dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    <span>Số khách dự kiến</span>
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    <span>{item.expectedGuests ?? 'Chưa cung cấp'}</span>
                    {item.expectedGuests ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {` khách (~${Math.ceil(item.expectedGuests / 10)} bàn)`}
                      </span>
                    ) : null}
                  </dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    <span>Đã nhận</span>
                  </dt>
                  <dd className="tabular-nums">
                    <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                  </dd>
                </div>
              </dl>

              {item.message && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Lời nhắn từ khách hàng:</span>
                  <p className="whitespace-pre-line">{item.message}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {nextCursor ? (
        <Button
          variant="outline"
          className="self-center"
          type="button"
          disabled={pending}
          onClick={() => void onLoadMore(nextCursor)}
        >
          Xem thêm yêu cầu
        </Button>
      ) : null}
    </>
  );
}
