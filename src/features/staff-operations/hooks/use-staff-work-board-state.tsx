'use client';
import { HySelect } from '@/src/components/ui/select-field';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { notify } from '@/src/design-system/notifications/index';
import { staffWorkspaceService as api } from '@/src/services/staff/staff-workspace.service';
import {
  type StaffWorkspace,
  type WorkItem,
  type WorkCreate,
  type WorkUpdate,
} from '@/src/services/staff/staff-workspace.contracts';
import { useLiveRefresh } from '@/src/features/realtime/hooks/use-live-refresh';
import { staffCommand } from '@/src/features/staff-operations/state/staff-command-intents';
import { formatDateTime } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { labelClass } from '@/src/features/staff-operations/styles/staff-classes';
export const titles = { TASK: 'Công việc', INCIDENT: 'Sự cố', HANDOVER: 'Bàn giao ca' } as const;

export const statuses = {
  OPEN: 'Mới ghi nhận',
  IN_PROGRESS: 'Đang xử lý',
  DONE: 'Hoàn tất',
} as const;

export const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export type History = Awaited<ReturnType<typeof api.history>>;
export type StaffWorkBoardProps = Readonly<{ view: StaffWorkspace; accountId: string }>;
export function useStaffWorkBoardState({ view, accountId }: StaffWorkBoardProps) {
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
  return {
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
  };
}
