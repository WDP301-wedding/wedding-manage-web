import { useState } from 'react';
import type { useStaffEventContext } from './use-staff-event-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cardClass } from './staff-classes';
import type { StaffWorkspace } from '../../services/staff-workspace.contracts';
import { formatDate, formatDateTime } from '../booking-lifecycle/booking-helpers';
export const eventDate = (value: string) => formatDate(value);
export function StaffEventSelector({
  context,
  disabled,
  isManager,
}: Readonly<{
  context: ReturnType<typeof useStaffEventContext>;
  disabled: boolean;
  isManager: boolean;
}>) {
  const [lookup, setLookup] = useState('');
  return (
    <section className={cardClass} aria-label="Chọn tiệc tác nghiệp">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {isManager ? 'Chọn tiệc điều phối' : 'Tiệc được phân công'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {context.workspace
              ? `${context.workspace.bookingCode} · ${context.workspace.alias ?? context.workspace.timeline.hallName} · ${eventDate(context.workspace.timeline.eventDate)}`
              : 'Chọn tiệc trước khi tác nghiệp. Chỉ hiển thị tiệc thuộc quyền truy cập.'}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={disabled || context.loadingEvents}
          onClick={() => void context.loadEvents()}
        >
          Tải danh sách tiệc
        </Button>
      </div>
      <details
        open={!context.workspace}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('[data-booking-choice]'))
            event.currentTarget.open = false;
        }}
      >
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          Chọn hoặc chuyển tiệc
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Trạng thái tiệc">
            <Button
              size="sm"
              variant={context.phase === 'CONFIRMED' ? 'default' : 'outline'}
              disabled={disabled}
              onClick={() => context.setPhase('CONFIRMED')}
            >
              Đã xác nhận
            </Button>
            <Button
              size="sm"
              variant={context.phase === 'COMPLETED' ? 'default' : 'outline'}
              disabled={disabled}
              onClick={() => context.setPhase('COMPLETED')}
            >
              Đã hoàn thành
            </Button>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void context.loadEvents();
            }}
          >
            <label className="min-w-0 flex-1 text-sm">
              Tìm mã HY hoặc tên tiệc
              <Input
                value={context.eventQuery}
                maxLength={120}
                disabled={disabled}
                onChange={(e) => context.setEventQuery(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={disabled || context.loadingEvents}>
              Tìm tiệc
            </Button>
          </form>
          {context.events.length > 0 ? (
            <ul className="grid gap-2 lg:grid-cols-2">
              {context.events.map((event) => (
                <li key={event.bookingId}>
                  <button
                    type="button"
                    disabled={disabled}
                    data-booking-choice
                    aria-pressed={event.bookingId === context.eventId}
                    onClick={() => context.setBookingId(event.bookingId)}
                    className="flex w-full flex-col gap-1 rounded-lg border border-border p-3 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary disabled:opacity-50"
                  >
                    <strong>
                      {event.bookingCode} · {event.alias ?? event.hallName}
                    </strong>
                    <span className="text-muted-foreground">
                      {eventDate(event.eventDate)} · {event.hallName} ·{' '}
                      {event.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nhấn Tải danh sách tiệc hoặc tìm mã HY. Staff cần được quản lý phân công trước.
            </p>
          )}
          {context.nextEvent && (
            <Button
              variant="outline"
              disabled={context.loadingEvents || disabled}
              onClick={() => void context.loadEvents(true)}
            >
              Tải thêm tiệc
            </Button>
          )}
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              context.setBookingId(lookup.trim());
            }}
          >
            <label className="min-w-0 flex-1 text-sm">
              Mở trực tiếp bằng mã HY
              <Input
                value={lookup}
                disabled={disabled}
                placeholder="HY-…"
                maxLength={32}
                onChange={(e) => setLookup(e.target.value)}
              />
            </label>
            <Button type="submit" variant="outline" disabled={disabled || !lookup.trim()}>
              Chọn mã tiệc
            </Button>
            {context.bookingId && !context.eventId && (
              <Button disabled={disabled} onClick={() => void context.resolveEventId()}>
                Mở tiệc đã chọn
              </Button>
            )}
          </form>
        </div>
      </details>
      {context.loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải thông tin tác nghiệp…
        </p>
      )}
    </section>
  );
}
export function StaffCheckinReadiness({
  context,
  disabled,
}: Readonly<{ context: ReturnType<typeof useStaffEventContext>; disabled: boolean }>) {
  const view = context.workspace;
  if (!view) return null;
  return (
    <section className={cardClass} aria-label="Điều kiện đón khách">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Điều kiện đón khách</h2>
          <p className="text-sm text-muted-foreground">
            {view.settings.checkInMode === 'NONE'
              ? 'Chưa bật check-in theo tên'
              : 'Đã bật check-in theo tên'}{' '}
            · {view.windowOpen ? 'Đang trong giờ đón khách' : 'Ngoài khung giờ check-in'}
          </p>
        </div>
        {view.isManager && (
          <Button
            variant="outline"
            disabled={
              disabled ||
              context.configuring ||
              view.settings.locked ||
              (view.settings.checkInMode === 'NONE' && view.listedGuestCount === 0)
            }
            onClick={() => void context.configure()}
          >
            {view.settings.checkInMode === 'NONE'
              ? 'Bật check-in theo tên'
              : 'Tắt check-in theo tên'}
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        {[
          ['Quy mô dự kiến', view.planningHeadcount],
          ['Khách có tên', view.listedGuestCount],
          ['Đã check-in theo danh sách', view.attendance.checkedInGuestCount ?? 'Chưa ghi nhận'],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Khung giờ do máy chủ xác định: {formatDateTime(view.windowOpensAt)} đến{' '}
        {formatDateTime(view.windowClosesAt)}. Manager luôn cần ghi lý do; chỉ Manager được thao tác
        ngoài khung giờ. Đã có bản ghi check-in thì không thể tắt chế độ.
      </p>
      {view.listedGuestCount === 0 && (
        <p role="status" className="text-sm text-primary">
          Chưa có khách ghi tên. Couple hoặc Manager cần bổ sung danh sách trước khi bật check-in.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Số check-in chỉ là khách có tên trong danh sách, không phải tổng khách thực tế và không dùng
        để tính tiền.
      </p>
    </section>
  );
}
export function StaffTimeline({ view }: Readonly<{ view: StaffWorkspace }>) {
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold">
        Kịch bản đã duyệt · phiên bản {view.timeline.revisionNumber}
      </h2>
      <p className="text-sm text-muted-foreground">
        {eventDate(view.timeline.eventDate)} · {view.timeline.hallName} ·{' '}
        {view.timeline.shiftStartTime}–{view.timeline.shiftEndTime}. Chỉ xem, không chỉnh sửa.
      </p>
      {view.timeline.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Kịch bản đã duyệt chưa có mốc chương trình.</p>
      ) : (
        <ol className="divide-y divide-border">
          {view.timeline.items.map((item) => (
            <li key={item.itemId} className="grid gap-1 py-3 sm:grid-cols-[5rem_1fr]">
              <strong className="tabular-nums">{item.startTime}</strong>
              <div>
                <p className="font-semibold">{item.title}</p>
                {item.description && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
