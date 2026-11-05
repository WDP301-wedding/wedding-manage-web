'use client';
import { HySelect } from '../../components/ui/select-field';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

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
import { integer, layoutErrorMessage, text } from './layout-helpers';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { TemplateRecordRow, TemplateRecordTable } from './template-record-table';
import { useTemplateDraft } from './use-template-draft';
import { cn } from 'cn';

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

  const [creating, setCreating] = useState(false);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const closeCreate = useCallback(() => {
    if (!pendingRef.current) setCreating(false);
  }, []);

  const load = useCallback(
    async (background = false) => {
      setLoading(true);
      try {
        const next = await authorize((token) => gateway.loadLayouts(token));
        if (!background || !hasDirtyCatalogForms()) setSnapshot(next);
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
    options: Readonly<{ reload?: boolean }> = {},
  ) => {
    setPending(true);
    try {
      await authorize(operation);
      notify.success(successMessage);
      if (options.reload !== false) await load();
      return true;
    } catch (caught) {
      const msg = layoutErrorMessage(caught);
      notify.error(caught, { fallbackMessage: msg });
      return false;
    } finally {
      setPending(false);
    }
  };

  if (loading && snapshot === null) {
    return (
      <section className={cx.section} aria-busy="true">
        <p className={cx.empty}>Đang tải mẫu bố trí…</p>
      </section>
    );
  }

  const halls = snapshot?.halls ?? [];
  const layouts = snapshot?.layouts ?? [];
  return (
    <section className={cn(cx.section, cx.layoutSection)} aria-labelledby="layout-heading">
      <div className={cx.sectionHeading}>
        <h2 id="layout-heading">Mẫu bố trí bàn</h2>
        <p>Theo dõi bản đang công bố, quản lý bản nháp và xem lịch sử bố cục theo sảnh.</p>
      </div>
      <div className="flex flex-wrap gap-3 border-b border-border p-4 sm:px-6">
        <button className={cx.primaryButton} type="button" onClick={() => setCreating(true)}>
          Thêm bố cục bàn
        </button>
      </div>
      {creating && (
        <PrintOrderDialog label="Thêm bố cục bàn" title="Thêm bố cục bàn" onClose={closeCreate}>
          <CreateLayoutForm
            halls={halls.filter((hall) => hall.lifecycle === 'ACTIVE')}
            pending={pending}
            onCancel={closeCreate}
            onSubmit={(input) =>
              run('Đã tạo bản nháp bố trí.', (token) =>
                gateway.createLayout(token, {
                  ...input,
                  templateId: crypto.randomUUID(),
                  versionId: crypto.randomUUID(),
                  displayOrder: layouts.length + 1,
                }),
              ).then((ok) => {
                if (ok) setCreating(false);
                return ok;
              })
            }
          />
        </PrintOrderDialog>
      )}
      {layouts.length === 0 ? (
        <p className={cx.empty}>Chưa có mẫu bố trí. Tạo mẫu đầu tiên cho một sảnh hoạt động.</p>
      ) : (
        <TemplateRecordTable label="Danh sách bố cục bàn" informationHeading="Sảnh & sức chứa">
          {layouts.map((layout) => (
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
  onSubmit: (input: LayoutWrite & Readonly<{ hallId: string }>) => Promise<boolean>;
  pending: boolean;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const hallId = text(data, 'hallId');
    if (hallId === '') return;
    void onSubmit({
      hallId,
      name: text(data, 'name'),
      description: text(data, 'description'),
      minGuests: integer(data, 'minGuests'),
      maxGuests: integer(data, 'maxGuests'),
      tables: [defaultTable(crypto.randomUUID())],
    }).then((success) => {
      if (success) form.reset();
    });
  };
  return (
    <form className={cn(cx.editor, cx.layoutCreate)} aria-label="Tạo mẫu bố trí" onSubmit={submit}>
      <div className={cx.editorHeading}>
        <h3>Khởi tạo bố trí theo sảnh</h3>
      </div>
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
      <LayoutTextField label="Mô tả" name="description" />
      <LayoutNumberField label="Khách tối thiểu" name="minGuests" min={1} defaultValue={1} />
      <LayoutNumberField label="Khách tối đa" name="maxGuests" min={1} defaultValue={10} />
      <button className={cx.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
        Hủy
      </button>
      <button className={cx.primaryButton} type="submit" disabled={pending || halls.length === 0}>
        Tạo với một bàn mẫu
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
  run: (
    successMessage: string,
    operation: (token: string) => Promise<void>,
    options?: Readonly<{ reload?: boolean }>,
  ) => Promise<boolean>;
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
  defaultValue = '',
}: Readonly<{ label: string; name: string; defaultValue?: string }>) {
  const id = `layout-${name}-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('vi-VN')}`;
  return (
    <label className={cx.field} htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={name} defaultValue={defaultValue} required={name === 'name'} />
    </label>
  );
}

function LayoutNumberField({
  label,
  name,
  min,
  defaultValue,
}: Readonly<{ label: string; name: string; min: number; defaultValue: number }>) {
  return (
    <label className={cx.field}>
      <span>{label}</span>
      <input name={name} type="number" min={min} step={1} defaultValue={defaultValue} required />
    </label>
  );
}
