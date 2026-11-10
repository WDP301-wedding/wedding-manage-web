import type { useStaffEventContext } from './use-staff-event-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cardClass } from './staff-classes';
import type { StaffWorkspace } from '../../services/staff-workspace.contracts';
import { formatDate } from '../booking-lifecycle/booking-helpers';
import { formatUnitLabel } from '../../lib/formatters';
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
        {context.workspace && (
          <Button
            variant="outline"
            disabled={disabled || context.loading}
            onClick={() => void context.refreshWorkspace()}
          >
            Cập nhật thông tin tiệc
          </Button>
        )}
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
              {context.loadingEvents
                ? 'Đang tải danh sách tiệc…'
                : isManager
                  ? 'Không có tiệc phù hợp. Thử đổi trạng thái hoặc từ khóa.'
                  : 'Bạn chưa có tiệc được phân công trong bộ lọc này. Liên hệ Manager nếu cần điều chỉnh.'}
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
export function StaffEventOverview({ view }: Readonly<{ view: StaffWorkspace }>) {
  const info = view.operations;
  return (
    <section className={cardClass} aria-label="Thông tin tiệc được phân công">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Thông tin tiệc · {view.bookingCode}</h2>
          <p className="text-sm text-muted-foreground">
            {info.phase === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã xác nhận'} ·{' '}
            {eventDate(view.timeline.eventDate)} · {view.timeline.hallName}
          </p>
        </div>
        <p className="text-sm font-semibold">
          {view.timeline.shiftStartTime}–{view.timeline.shiftEndTime}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
        {[
          ['Cô dâu', info.brideName ?? 'Chưa bổ sung'],
          ['Chú rể', info.groomName ?? 'Chưa bổ sung'],
          ['Số khách dự kiến', `${view.planningHeadcount} khách`],
          ['Số bàn đã chốt', `${info.tableCount} bàn`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        {(['MENU', 'SERVICE'] as const).map((category) => (
          <section key={category} className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">
              {category === 'MENU' ? 'Thực đơn phục vụ' : 'Dịch vụ đã chốt'}
            </h3>
            {info.offerings.filter((item) => item.category === category).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có thông tin.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {info.offerings
                  .filter((item) => item.category === category)
                  .map((item, index) => (
                    <li key={`${category}:${index}`} className="text-sm">
                      <strong>{item.name}</strong> · {item.quantity} {formatUnitLabel(item.unit)}
                      {item.description && (
                        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Đội ngũ được phân công:{' '}
        {view.members.length
          ? view.members.map((member) => member.label).join(', ')
          : 'Chưa có nhân viên được phân công.'}
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
