'use client';
import { HySelect } from '@/src/components/ui/select-field';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { type WorkItem } from '@/src/services/staff/staff-workspace.contracts';
import { cardClass, labelClass } from '@/src/features/staff-operations/styles/staff-classes';
import {
  useStaffWorkBoardState,
  type StaffWorkBoardProps,
} from '@/src/features/staff-operations/hooks/use-staff-work-board-state';

export function StaffWorkBoard(props: StaffWorkBoardProps) {
  const model = useStaffWorkBoardState(props);
  const {
    view,
    accountId,
    kind,
    setKind,
    page,
    loading,
    pending,
    current,
    editing,
    setEditing,
    history,
    setHistory,
    historyEpoch,
    priority,
    rows,
    members,
    load,
    create,
    openHistory,
    assigneeField,
    canCreate,
    editor,
    historyPanel,
    titles,
    statuses,
    selectClass,
  } = model;
  return (
    <section className={cardClass} aria-label="Công việc, sự cố và bàn giao">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Công việc và bàn giao vận hành</h2>
        <Button
          variant="outline"
          disabled={loading || pending || editing !== null || history !== null}
          onClick={() => void load()}
        >
          Cập nhật danh sách
        </Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Loại tác nghiệp">
        {(Object.keys(titles) as WorkItem['kind'][]).map((k) => (
          <Button
            key={k}
            aria-pressed={kind === k}
            variant={kind === k ? 'default' : 'outline'}
            disabled={pending}
            onClick={() => {
              setKind(k);
              setEditing(null);
              setHistory(null);
              historyEpoch.current++;
            }}
          >
            {titles[k]}
          </Button>
        ))}
      </div>
      {canCreate && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            {kind === 'TASK'
              ? 'Giao công việc'
              : kind === 'INCIDENT'
                ? 'Báo sự cố'
                : 'Ghi bàn giao ca'}
          </summary>
          <form
            onSubmit={(e) => void create(e)}
            className="mt-3 grid gap-3 rounded-lg border border-border p-4"
          >
            <label className={labelClass}>
              Tiêu đề
              <Input name="title" required maxLength={160} disabled={pending} />
            </label>
            <label className={labelClass}>
              Nội dung cụ thể
              <Textarea name="description" required maxLength={4000} disabled={pending} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Mức ưu tiên
                <HySelect name="priority" className={selectClass} disabled={pending}>
                  <option value="NORMAL">Bình thường</option>
                  <option value="URGENT">Cần xử lý ngay</option>
                </HySelect>
              </label>
              {(view.isManager || kind === 'HANDOVER') && assigneeField(null)}
            </div>
            <Button type="submit" disabled={pending} className="justify-self-start">
              {pending ? 'Đang gửi…' : 'Xác nhận ghi nhận'}
            </Button>
          </form>
        </details>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang cập nhật…
        </p>
      )}
      {rows.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          Chưa có {titles[kind].toLowerCase()} trong danh sách.
        </p>
      )}
      <ul className="grid gap-3">
        {rows.map((item) => {
          const canChange = view.isManager
            ? item.kind !== 'HANDOVER' ||
              (item.status !== 'DONE' &&
                item.createdByAccountId !== accountId &&
                (item.assignedAccountId === accountId || item.assignedAccountId === null))
            : item.assignedAccountId === accountId &&
              item.kind !== 'INCIDENT' &&
              item.status !== 'DONE' &&
              (item.kind !== 'HANDOVER' || item.createdByAccountId !== accountId);
          return (
            <li key={item.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{item.title}</h3>
                <span className="text-sm text-primary">
                  {item.kind === 'HANDOVER' && item.status === 'DONE'
                    ? 'Đã nhận bàn giao'
                    : statuses[item.status]}
                  {item.priority === 'URGENT' ? ' · Khẩn' : ''}
                  {!view.isManager && item.assignedAccountId === accountId && item.status !== 'DONE'
                    ? item.kind === 'HANDOVER'
                      ? ' · Chờ bạn nhận'
                      : ' · Việc của bạn'
                    : ''}
                  {view.isManager && item.assignedAccountId === null && item.status !== 'DONE'
                    ? ' · Chưa phân công'
                    : ''}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                Phụ trách:{' '}
                {item.assignedAccountId
                  ? (members.get(item.assignedAccountId) ?? 'Phân công cũ — Manager cần rà soát')
                  : 'Manager tiếp nhận / chưa phân công'}{' '}
                · Phiên bản {item.revision}
              </p>
              <div className="flex flex-wrap gap-2">
                {canChange && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setHistory(null);
                      historyEpoch.current++;
                      setEditing({ ...item });
                    }}
                  >
                    {item.kind === 'HANDOVER'
                      ? 'Xác nhận nhận bàn giao'
                      : item.kind === 'INCIDENT'
                        ? 'Tiếp nhận / xử lý sự cố'
                        : 'Cập nhật công việc'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setEditing(null);
                    void openHistory(item);
                  }}
                >
                  Xem lịch sử
                </Button>
              </div>
              {editing?.id === item.id && editor}
              {history?.item.id === item.id && historyPanel}
            </li>
          );
        })}
      </ul>
      {page?.kind === kind && page.nextAfterId && (
        <Button variant="outline" disabled={loading || pending} onClick={() => void load(true)}>
          Tải thêm
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Bàn giao chỉ hoàn tất khi người nhận khác người gửi xác nhận. Mọi thay đổi được lưu lịch sử;
        các mục này không tự tạo phí hoặc thay đổi thanh toán.
      </p>
    </section>
  );
}
