'use client';
import { HySelect } from '../../components/ui/select-field';
import { Skeleton } from '../../components/ui/skeleton';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  Authorize,
  CatalogGateway,
  CatalogHall,
  CatalogLayout,
  LayoutCatalogSnapshot,
  LayoutWrite,
} from './catalog-types';
import { notify } from '../../design-system/notifications';
import {
  defaultTable,
  LayoutCanvas,
  LayoutDraftEditor,
  type LayoutVersion,
} from './layout-draft-editor';

import { cx } from './catalog-classes';
import { layoutErrorMessage, text } from './layout-helpers';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { TablePagination } from '../identity-access/table-controls';
import { useCatalogPagination } from './use-catalog-pagination';
import { TemplateRecordRow, TemplateRecordTable } from './template-record-table';
import { useTemplateDraft } from './use-template-draft';
import { cn } from 'cn';

const layoutFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'unpublished', label: 'Chưa công bố' },
] as const;

type LayoutFilter = (typeof layoutFilters)[number]['value'];
type NewLayoutDraft = Readonly<{ layout: CatalogLayout; version: LayoutVersion }>;

export function LayoutPanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [snapshot, setSnapshot] = useState<LayoutCatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const reportValidationError = useCallback((message: string | null) => {
    if (message) notify.error(message);
  }, []);

  const [filter, setFilter] = useState<LayoutFilter>('all');
  const [dialog, setDialog] = useState<'create' | NewLayoutDraft | null>(null);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const dismiss = useCallback(() => {
    if (!pendingRef.current) setDialog(null);
  }, []);

  const load = useCallback(
    async (background = false, openDraftId?: string) => {
      setLoading(true);
      try {
        const next = await authorize((token) => gateway.loadLayouts(token));
        if (!background || !hasDirtyCatalogForms()) setSnapshot(next);
        if (openDraftId) {
          const layout = next.layouts.find(({ id }) => id === openDraftId);
          const version = layout?.versions.find(({ id }) => id === layout.draftVersionId);
          if (layout && version) setDialog({ layout, version });
        }
      } catch (caught) {
        notify.error(caught, { fallbackMessage: layoutErrorMessage(caught) });
      } finally {
        setLoading(false);
      }
    },
    [authorize, gateway],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  useCatalogLiveRefresh(load);

  const run = async (
    successMessage: string,
    operation: (token: string) => Promise<void>,
    openDraftId?: string,
  ) => {
    setPending(true);
    try {
      await authorize(operation);
      notify.success(successMessage);
      await load(false, openDraftId);
      return true;
    } catch (caught) {
      const msg = layoutErrorMessage(caught);
      notify.error(caught, { fallbackMessage: msg });
      return false;
    } finally {
      setPending(false);
    }
  };

  const halls = snapshot?.halls ?? [];
  const layouts = snapshot?.layouts ?? [];
  const visibleLayouts = useMemo(() => {
    return layouts.filter((layout) => {
      if (filter === 'all') return true;
      if (layout.lifecycle !== 'ACTIVE') return false;
      const published = layout.currentPublishedVersionId !== null;
      return filter === 'active' ? published : !published;
    });
  }, [layouts, filter]);

  const layoutPagination = useCatalogPagination(visibleLayouts, 10, [5, 10, 20]);

  useEffect(() => {
    layoutPagination.resetPage();
  }, [filter, layoutPagination.resetPage]);

  if (loading && snapshot === null) {
    return (
      <section className={cx.section} aria-busy="true" aria-label="Đang tải mẫu bố trí">
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={cn(cx.section, cx.layoutSection)} aria-labelledby="layout-heading">
      <div className={cx.sectionHeading}>
        <h2 id="layout-heading">Mẫu bố trí bàn</h2>
        <p>Theo dõi bản đang công bố, quản lý bản nháp và xem lịch sử bố cục theo sảnh.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6">
        <button className={cx.primaryButton} type="button" onClick={() => setDialog('create')}>
          Thêm bố cục bàn
        </button>
        <div role="group" aria-label="Lọc bố cục theo trạng thái" className="flex flex-wrap gap-2">
          {layoutFilters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={cn(
                cx.secondaryButton,
                'aria-pressed:border-primary aria-pressed:bg-accent',
              )}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {dialog === 'create' && (
        <PrintOrderDialog label="Thêm bố cục bàn" title="Thêm bố cục bàn" onClose={dismiss}>
          <CreateLayoutForm
            halls={halls.filter((hall) => hall.lifecycle === 'ACTIVE')}
            pending={pending}
            onCancel={dismiss}
            onSubmit={async (input) => {
              const templateId = crypto.randomUUID();
              const versionId = crypto.randomUUID();
              const ok = await run(
                'Đã tạo bản nháp bố trí.',
                (token) =>
                  gateway.createLayout(token, {
                    ...input,
                    templateId,
                    versionId,
                    displayOrder: layouts.length + 1,
                  }),
                templateId,
              );
              if (ok) setDialog((current) => (current === 'create' ? null : current));
            }}
          />
        </PrintOrderDialog>
      )}
      {dialog && dialog !== 'create' && (
        <PrintOrderDialog
          label="Tiếp tục bản nháp"
          title="Tiếp tục bản nháp"
          size="wide"
          onClose={dismiss}
        >
          <LayoutVersionEditor
            version={dialog.version}
            layout={dialog.layout}
            gateway={gateway}
            hallMaximum={halls.find(({ id }) => id === dialog.layout.hallId)?.maxGuests ?? 0}
            pending={pending}
            run={run}
            close={() => setDialog(null)}
            setError={reportValidationError}
          />
        </PrintOrderDialog>
      )}
      {visibleLayouts.length === 0 ? (
        <p className={cx.empty}>
          {layouts.length === 0
            ? 'Chưa có mẫu bố trí. Tạo mẫu đầu tiên cho một sảnh hoạt động.'
            : 'Không có bố cục phù hợp với bộ lọc.'}
        </p>
      ) : (
        <>
          <TemplateRecordTable label="Danh sách bố cục bàn" informationHeading="Sảnh & sức chứa">
            {layoutPagination.paginatedItems.map((layout) => (
              <LayoutAggregate
                key={layout.id}
                gateway={gateway}
                hall={halls.find(({ id }) => id === layout.hallId)}
                layout={layout}
                pending={pending}
                run={run}
                setError={reportValidationError}
              />
            ))}
          </TemplateRecordTable>
          <div className="px-4 pb-6 sm:px-6">
            <TablePagination
              info={
                <span>
                  Hiển thị{' '}
                  <strong>
                    {layoutPagination.totalItems === 0 ? 0 : layoutPagination.startIndex + 1}
                  </strong>{' '}
                  – <strong>{layoutPagination.endIndex}</strong> /{' '}
                  <strong>{layoutPagination.totalItems}</strong> bố cục bàn
                </span>
              }
              pageSize={layoutPagination.pageSize}
              pageSizes={layoutPagination.pageSizes}
              onPageSize={layoutPagination.setPageSize}
              page={layoutPagination.page}
              totalPages={layoutPagination.totalPages}
              onPage={layoutPagination.setPage}
              navLabel="Phân trang bố cục bàn"
            />
          </div>
        </>
      )}
    </section>
  );
}

function CreateLayoutForm({
  onCancel,
  halls,
  onSubmit,
  pending,
}: Readonly<{
  onCancel: () => void;
  halls: readonly CatalogHall[];
  onSubmit: (input: LayoutWrite & Readonly<{ hallId: string }>) => Promise<void>;
  pending: boolean;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const hallId = text(data, 'hallId');
    const hall = halls.find(({ id }) => id === hallId);
    if (!hall) return;
    const table = defaultTable(crypto.randomUUID());
    const maxGuests = Math.min(table.seatCapacity, hall.maxGuests);
    void onSubmit({
      hallId,
      name: text(data, 'name'),
      description: text(data, 'description'),
      minGuests: 1,
      maxGuests,
      tables: [{ ...table, seatCapacity: maxGuests }],
    });
  };
  return (
    <form className={cn(cx.editor, cx.layoutCreate)} aria-label="Tạo mẫu bố trí" onSubmit={submit}>
      <label className={cx.field}>
        <span>Sảnh áp dụng</span>
        <HySelect name="hallId" required defaultValue="">
          <option value="" disabled>
            Chọn sảnh hoạt động
          </option>
          {halls.map((hall) => (
            <option key={hall.id} value={hall.id}>
              {hall.name} · tối đa {hall.maxGuests} khách
            </option>
          ))}
        </HySelect>
      </label>
      <LayoutTextField label="Tên bố trí" name="name" />
      <LayoutTextField label="Mô tả" name="description" className={cx.fieldWide} />
      <button className={cx.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
        Hủy
      </button>
      <button className={cx.primaryButton} type="submit" disabled={pending || halls.length === 0}>
        Tạo bản nháp
      </button>
    </form>
  );
}

function LayoutAggregate({
  gateway,
  hall,
  layout,
  pending,
  run,
  setError,
}: Readonly<{
  gateway: CatalogGateway;
  hall: CatalogHall | undefined;
  layout: CatalogLayout;
  pending: boolean;
  run: (successMessage: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  setError: (error: string | null) => void;
}>) {
  return (
    <TemplateRecordRow
      record={layout}
      pending={pending}
      information={(version) => (
        <>
          <p>{hall?.name ?? 'Sảnh không còn khả dụng'}</p>
          <p className="mt-1 text-muted-foreground">
            {version.tables.length} bàn · {version.totalSeatCapacity} ghế
          </p>
        </>
      )}
      renderVersion={(version) => <LayoutVersionContent hall={hall} version={version} />}
      editor={(version, close) => (
        <LayoutVersionEditor
          key={version.id}
          version={version}
          layout={layout}
          gateway={gateway}
          hallMaximum={hall?.maxGuests ?? 0}
          pending={pending}
          run={run}
          close={close}
          setError={setError}
        />
      )}
      onLifecycle={() =>
        run('Đã cập nhật trạng thái bố cục bàn.', (token) =>
          gateway.changeLayoutLifecycle(token, {
            id: layout.id,
            expectedRevision: layout.revision,
            transition: layout.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
          }),
        )
      }
    />
  );
}

function LayoutVersionEditor({
  version,
  layout,
  gateway,
  hallMaximum,
  pending,
  run,
  close,
  setError,
}: Readonly<{
  version: LayoutVersion;
  layout: CatalogLayout;
  gateway: CatalogGateway;
  hallMaximum: number;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  close: () => void;
  setError: (error: string | null) => void;
}>) {
  const checkpoint = useTemplateDraft(version);
  const keys = useRef(new Map<string, string>());
  const commandKey = (command: string) => {
    let key = keys.current.get(command);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(command, key);
    }
    return key;
  };
  return (
    <LayoutDraftEditor
      version={version}
      hallMaximum={hallMaximum}
      pending={pending}
      onCancel={close}
      setError={setError}
      onSave={(input, retirements, publish) =>
        run(publish ? 'Đã công bố bố cục bàn.' : 'Đã lưu bố trí nháp.', async (token) => {
          const draft = await checkpoint.prepare((intent) =>
            gateway.cloneLayout(token, { templateId: layout.id, ...intent }),
          );
          for (const table of input.tables) {
            if (!layout.tables.some(({ id }) => id === table.tableId)) {
              await gateway.registerLayoutTable(token, {
                templateId: layout.id,
                tableId: table.tableId,
                idempotencyKey: commandKey(`register:${table.tableId}`),
              });
            }
          }
          await gateway.updateLayoutDraft(token, {
            ...input,
            versionId: draft.id,
            expectedRevision: draft.revision,
          });
          checkpoint.saved();
          for (const tableId of retirements) {
            if (layout.tables.some((table) => table.id === tableId && table.retiredAt === null)) {
              await gateway.retireLayoutTable(token, {
                templateId: layout.id,
                tableId,
                idempotencyKey: commandKey(`retire:${tableId}`),
              });
            }
          }
          if (publish)
            await gateway.publishLayout(token, {
              versionId: draft.id,
              expectedRevision: draft.revision + 1,
            });
        }).then((ok) => {
          if (ok) close();
          return ok;
        })
      }
    />
  );
}

function LayoutVersionContent({
  hall,
  version,
}: Readonly<{ hall: CatalogHall | undefined; version: LayoutVersion }>) {
  return (
    <>
      <p>
        {hall?.name ?? 'Sảnh không còn khả dụng'} · {version.tables.length} bàn ·{' '}
        {version.totalSeatCapacity} ghế
      </p>
      <p>
        Khoảng khách {version.minGuests}–{version.maxGuests}
      </p>
      <LayoutCanvas tables={version.tables} />
      <ul className="divide-y divide-border" aria-label="Danh sách bàn">
        {[...version.tables]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((table) => (
            <li key={table.tableId} className="py-3">
              <p className="font-semibold">
                {table.label} · {table.seatCapacity} ghế
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {table.shape === 'ROUND' ? 'Bàn tròn' : 'Bàn chữ nhật'} · Tọa độ ({table.x},{' '}
                {table.y}) · {table.width} × {table.height} · Góc {table.rotationDegrees}°
              </p>
            </li>
          ))}
      </ul>
    </>
  );
}

function LayoutTextField({
  label,
  name,
  className,
}: Readonly<{ label: string; name: string; className?: string }>) {
  const id = `layout-${name}-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('vi-VN')}`;
  return (
    <label className={cn(cx.field, className)} htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={name} required={name === 'name'} />
    </label>
  );
}
