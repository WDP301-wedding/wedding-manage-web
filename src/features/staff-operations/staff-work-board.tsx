import { HySelect } from '../../components/ui/select-field';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { notify } from '../../design-system/notifications';
import { staffWorkspaceService as api } from '../../services/staff-workspace.service';
import {
  type StaffWorkspace,
  type WorkItem,
  type WorkCreate,
  type WorkUpdate,
} from '../../services/staff-workspace.contracts';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { staffCommand } from './staff-command-intents';
import { formatDateTime } from '../booking-lifecycle/booking-helpers';
import { cardClass, labelClass } from './staff-classes';
const titles = { TASK: 'Công việc', INCIDENT: 'Sự cố', HANDOVER: 'Bàn giao ca' } as const;
const statuses = { OPEN: 'Mới ghi nhận', IN_PROGRESS: 'Đang xử lý', DONE: 'Hoàn tất' } as const;
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
type History = Awaited<ReturnType<typeof api.history>>;
export function StaffWorkBoard({
  view,
  accountId,
}: Readonly<{ view: StaffWorkspace; accountId: string }>) {
  const [kind, setKind] = useState<WorkItem['kind']>('TASK');
  const [page, setPage] = useState<{
    kind: WorkItem['kind'];
    items: WorkItem[];
    nextAfterId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const current = useRef(kind);
  useEffect(() => {
    current.current = kind;
  }, [kind]);
  const loadVersion = useRef(0);
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [history, setHistory] = useState<{ item: WorkItem; page: History } | null>(null);
  const historyEpoch = useRef(0);
  const priority = (item: WorkItem) => {
    if (item.status === 'DONE') return 3;
    if (!view.isManager && item.assignedAccountId === accountId) return 0;
    if (view.isManager && (item.kind === 'INCIDENT' || item.assignedAccountId === null)) return 0;
    return item.priority === 'URGENT' ? 1 : 2;
  };
  const rows =
    page?.kind === kind
      ? [...page.items].sort((left, right) => priority(left) - priority(right))
      : [];
  const members = new Map(view.members.map((m) => [m.accountId, m.label]));
  const load = async (more = false) => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const result = await api.work(
        view.bookingId,
        kind,
        more ? (page?.nextAfterId ?? undefined) : undefined,
      );
      if (version !== loadVersion.current || current.current !== kind) return;
      setPage((previous) => ({
        kind,
        items:
          more && previous?.kind === kind
            ? [...new Map([...previous.items, ...result.items].map((i) => [i.id, i])).values()]
            : result.items,
        nextAfterId: result.nextAfterId,
      }));
    } catch (err) {
      if (version === loadVersion.current) notify.error(err);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };
  useLiveRefresh(
    async (isCurrent) => {
      const version = ++loadVersion.current;
      setLoading(true);
      try {
        const result = await api.work(view.bookingId, kind);
        if (isCurrent() && version === loadVersion.current) setPage({ kind, ...result });
      } catch (err) {
        if (isCurrent()) notify.error(err);
      } finally {
        if (isCurrent() && version === loadVersion.current) setLoading(false);
      }
    },
    {
      scope: `staff-work:${view.bookingId}:${kind}`,
      bookingId: view.bookingId,
      initial: true,
      blocked: pending || editing !== null || history !== null,
      invalidateOnBlock: true,
      types: ['staff.updated'],
    },
  );
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget,
      values = new FormData(form);
    const body: WorkCreate = {
      kind,
      title: String(values.get('title') ?? '').trim(),
      description: String(values.get('description') ?? '').trim(),
      priority: values.get('priority') === 'URGENT' ? 'URGENT' : 'NORMAL',
      assignedAccountId: String(values.get('assignee') ?? '') || null,
    };
    lock.current = true;
    setPending(true);
    try {
      await staffCommand(`${accountId}:${view.bookingId}:work-create:${kind}`, body, (key) =>
        api.create(view.bookingId, body, key),
      );
      notify.success('Đã ghi nhận và lưu nhật ký.');
      form.reset();
      await load();
    } catch (err) {
      notify.error(err, {
        fallbackMessage:
          err instanceof Error ? err.message : 'Chưa hoàn tất yêu cầu. Giữ nội dung để thử lại.',
      });
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || lock.current) return;
    const values = new FormData(event.currentTarget);
    const status = String(values.get('status'));
    if (status !== 'OPEN' && status !== 'IN_PROGRESS' && status !== 'DONE') return;
    const body: WorkUpdate = {
      expectedRevision: editing.revision,
      status,
      note: String(values.get('note') ?? '').trim(),
      ...(view.isManager && editing.kind !== 'HANDOVER'
        ? { assignedAccountId: String(values.get('assignee') ?? '') || null }
        : {}),
    };
    lock.current = true;
    setPending(true);
    try {
      await staffCommand(
        `${accountId}:${view.bookingId}:work-update:${editing.id}:${editing.revision}`,
        body,
        (key) => api.update(view.bookingId, editing.id, body, key),
      );
      notify.success('Đã cập nhật và lưu lịch sử.');
      setEditing(null);
      await load();
    } catch (err) {
      notify.error(err, {
        fallbackMessage:
          err instanceof Error
            ? err.message
            : 'Không cập nhật được. Giữ nội dung và kiểm tra phiên bản hiện tại.',
      });
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const openHistory = async (item: WorkItem, more = false) => {
    const version = ++historyEpoch.current;
    try {
      const result = await api.history(
        view.bookingId,
        item.id,
        more ? (history?.page.nextAfterRevision ?? 0) : 0,
      );
      if (version !== historyEpoch.current || current.current !== kind) return;
      setHistory((previous) => ({
        item,
        page: {
          ...result,
          items:
            more && previous?.item.id === item.id
              ? [...previous.page.items, ...result.items]
              : result.items,
        },
      }));
    } catch (err) {
      notify.error(err);
    }
  };
  const assigneeField = (selected: string | null) => (
    <label className={labelClass}>
      Người phụ trách / nhận bàn giao
      <HySelect
        name="assignee"
        defaultValue={selected ?? ''}
        className={selectClass}
        disabled={pending}
      >
        <option value="">Manager tiếp nhận / chưa phân công</option>
        {view.members
          .filter((m) => kind !== 'HANDOVER' || m.accountId !== accountId)
          .map((m) => (
            <option key={m.accountId} value={m.accountId}>
              {m.label}
            </option>
          ))}
      </HySelect>
    </label>
  );
  const canCreate = view.isManager || kind !== 'TASK';
  const editor = editing && (
    <form
      key={`${editing.id}:${editing.revision}`}
      onSubmit={(e) => void update(e)}
      className="grid gap-3 rounded-lg border border-primary p-4"
      aria-label="Xác nhận cập nhật tác nghiệp"
    >
      <h3 className="font-semibold">
        {editing.title} · phiên bản {editing.revision}
      </h3>
      {rows.some((i) => i.id === editing.id && i.revision !== editing.revision) && (
        <p role="alert" className="text-sm text-primary">
          Dữ liệu đã thay đổi. Đóng phần sửa và mở lại phiên bản hiện tại; nội dung đang nhập chưa
          được gửi.
        </p>
      )}
      <label className={labelClass}>
        Trạng thái
        <HySelect
          name="status"
          defaultValue={editing.kind === 'HANDOVER' ? 'DONE' : editing.status}
          disabled={pending}
          className={selectClass}
        >
          {(editing.kind === 'HANDOVER'
            ? (['DONE'] as const)
            : (['OPEN', 'IN_PROGRESS', 'DONE'] as const)
          ).map((s) => (
            <option key={s} value={s}>
              {editing.kind === 'HANDOVER' ? 'Đã nhận bàn giao' : statuses[s]}
            </option>
          ))}
        </HySelect>
      </label>
      {view.isManager && editing.kind !== 'HANDOVER' && assigneeField(editing.assignedAccountId)}
      <label className={labelClass}>
        Ghi chú xác nhận
        <Textarea name="note" required maxLength={2000} disabled={pending} />
      </label>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={
            pending || rows.some((i) => i.id === editing.id && i.revision !== editing.revision)
          }
        >
          Lưu thay đổi
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(null)}>
          Đóng
        </Button>
      </div>
    </form>
  );
  const historyPanel = history && (
    <section className="rounded-lg bg-muted p-4" aria-label="Lịch sử tác nghiệp">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold">Lịch sử: {history.item.title}</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            historyEpoch.current++;
            setHistory(null);
          }}
        >
          Đóng lịch sử
        </Button>
      </div>
      <ol className="mt-3 space-y-3">
        {history.page.items.map((h) => (
          <li key={h.revision} className="text-sm">
            <strong>Phiên bản {h.revision}</strong> · {formatDateTime(h.createdAt)}
            <p className="whitespace-pre-wrap text-muted-foreground">
              {typeof h.snapshot.note === 'string'
                ? h.snapshot.note === 'CREATED'
                  ? 'Đã tạo ghi nhận'
                  : h.snapshot.note
                : 'Đã cập nhật'}{' '}
              · {members.get(h.actorAccountId) ?? 'Người thao tác được lưu trong nhật ký'}
            </p>
          </li>
        ))}
      </ol>
      {history.page.nextAfterRevision && (
        <Button size="sm" variant="outline" onClick={() => void openHistory(history.item, true)}>
          Tải thêm lịch sử
        </Button>
      )}
    </section>
  );
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
