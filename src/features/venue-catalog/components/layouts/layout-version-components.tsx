'use client';

import { HySelect } from '@/src/components/ui/select-field';
import { type FormEvent, useRef } from 'react';
import type {
  CatalogGateway,
  CatalogHall,
  CatalogLayout,
  LayoutWrite,
} from '@/src/features/venue-catalog/types/catalog-types';
import {
  defaultTable,
  LayoutCanvas,
  LayoutDraftEditor,
  type LayoutVersion,
} from './layout-draft-editor';
import { cx } from '@/src/features/venue-catalog/styles/catalog-classes';
import { text } from '@/src/features/venue-catalog/utils/layout-helpers';
import { TemplateRecordRow } from '@/src/features/venue-catalog/components/timeline/template-record-table';
import { useTemplateDraft } from '@/src/features/venue-catalog/hooks/use-template-draft';
import { cn } from 'cn';

export function CreateLayoutForm({
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

export function LayoutAggregate({
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

export function LayoutVersionEditor({
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

export function LayoutVersionContent({
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

export function LayoutTextField({
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
