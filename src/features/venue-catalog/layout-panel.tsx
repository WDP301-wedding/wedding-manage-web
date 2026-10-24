'use client';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import type {
  CatalogGateway,
  CatalogHall,
  CatalogLayout,
  LayoutCatalogSnapshot,
  LayoutTableWrite,
  LayoutWrite,
} from './catalog-api';
import type { Authorize } from './catalog-types';
import {
  CANVAS_SIZE,
  defaultTable,
  LayoutCanvas,
  LayoutDraftEditor,
  type LayoutVersion,
  TableEditor,
  TableNumber,
  validateLayout,
} from './layout-draft-editor';

export {
  CANVAS_SIZE,
  defaultTable,
  LayoutCanvas,
  LayoutDraftEditor,
  type LayoutVersion,
  TableEditor,
  TableNumber,
  validateLayout,
};

export function LayoutPanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [snapshot, setSnapshot] = useState<LayoutCatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    setLoading(true);
    setError(null);
    try {
      const next = await authorize((token) => gateway.loadLayouts(token));
      if (!background || !hasDirtyCatalogForms()) setSnapshot(next);
    } catch (caught) {
      setError(layoutErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorize, gateway]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useCatalogLiveRefresh(load);

  const run = async (
    successMessage: string,
    operation: (token: string) => Promise<void>,
    options: Readonly<{ reload?: boolean }> = {},
  ) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await authorize(operation);
      setMessage(successMessage);
      if (options.reload !== false) await load();
      return true;
    } catch (caught) {
      setError(layoutErrorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  };

  if (loading && snapshot === null) {
    return (
      <section className="catalog-section" aria-busy="true">
        <p className="catalog-empty">Đang tải mẫu bố trí…</p>
      </section>
    );
  }

  const halls = snapshot?.halls ?? [];
  const layouts = snapshot?.layouts ?? [];
  return (
    <section className="catalog-section layout-section" aria-labelledby="layout-heading">
      <div className="catalog-section-heading">
        <p className="section-kicker">Sức chứa &amp; hình học</p>
        <h2 id="layout-heading">Mẫu bố trí bàn</h2>
        <p>
          Tọa độ chuẩn hóa giúp cùng một sơ đồ hiển thị nhất quán. Giá dịch vụ không được tính theo
          khách tại đây.
        </p>
      </div>
      <PanelMessages error={error} message={message} />
      <CreateLayoutForm
        halls={halls.filter((hall) => hall.lifecycle === 'ACTIVE')}
        pending={pending}
        onSubmit={(input) =>
          run('Đã tạo bản nháp bố trí.', (token) =>
            gateway.createLayout(token, {
              ...input,
              templateId: crypto.randomUUID(),
              versionId: crypto.randomUUID(),
              displayOrder: layouts.length + 1,
            }),
          )
        }
      />
      {layouts.length === 0 ? (
        <p className="catalog-empty">
          Chưa có mẫu bố trí. Tạo mẫu đầu tiên cho một sảnh hoạt động.
        </p>
      ) : (
        <div className="catalog-aggregate-list">
          {layouts.map((layout) => (
            <LayoutAggregate
              key={layout.id}
              gateway={gateway}
              hall={halls.find(({ id }) => id === layout.hallId)}
              layout={layout}
              pending={pending}
              run={run}
              setError={setError}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CreateLayoutForm({
  halls,
  onSubmit,
  pending,
}: Readonly<{
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
    <form className="catalog-editor layout-create" aria-label="Tạo mẫu bố trí" onSubmit={submit}>
      <div className="catalog-editor-heading">
        <span className="section-kicker">Bản nháp mới</span>
        <h3>Khởi tạo bố trí theo sảnh</h3>
      </div>
      <label className="catalog-field">
        <span>Sảnh áp dụng</span>
        <select name="hallId" required defaultValue="">
          <option value="" disabled>
            Chọn sảnh hoạt động
          </option>
          {halls.map((hall) => (
            <option key={hall.id} value={hall.id}>
              {hall.name} · tối đa {hall.maxGuests} khách
            </option>
          ))}
        </select>
      </label>
      <LayoutTextField label="Tên bố trí" name="name" />
      <LayoutTextField label="Mô tả" name="description" />
      <LayoutNumberField label="Khách tối thiểu" name="minGuests" min={1} defaultValue={1} />
      <LayoutNumberField label="Khách tối đa" name="maxGuests" min={1} defaultValue={10} />
      <button
        className="catalog-primary-button"
        type="submit"
        disabled={pending || halls.length === 0}
      >
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
  const label =
    layout.versions.find(({ id }) => id === layout.currentPublishedVersionId)?.name ??
    layout.versions[0]?.name ??
    'Bố trí chưa đặt tên';
  return (
    <article className="catalog-aggregate">
      <header className="catalog-aggregate-header">
        <div>
          <span
            className={`status ${layout.lifecycle === 'ACTIVE' ? 'status-ready' : 'status-retired'}`}
          >
            {layout.lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
          </span>
          <h3>{label}</h3>
          <small>{hall?.name ?? 'Sảnh không còn khả dụng'}</small>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void run(
              layout.lifecycle === 'ACTIVE' ? 'Đã ngừng mẫu bố trí.' : 'Đã khôi phục mẫu bố trí.',
              (token) =>
                gateway.changeLayoutLifecycle(token, {
                  id: layout.id,
                  expectedRevision: layout.revision,
                  transition: layout.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
                }),
            )
          }
        >
          {layout.lifecycle === 'ACTIVE' ? 'Ngừng' : 'Khôi phục'}
        </button>
      </header>
      <div className="catalog-history" role="region" aria-label={`Lịch sử ${label}`}>
        {layout.versions.map((version) =>
          version.state === 'DRAFT' ? (
            <LayoutDraftEditor
              key={version.id}
              gateway={gateway}
              hallMaximum={hall?.maxGuests ?? 0}
              layout={layout}
              pending={pending}
              run={run}
              setError={setError}
              version={version}
            />
          ) : (
            <LayoutVersionSummary
              key={version.id}
              canClone={layout.draftVersionId === null}
              layout={layout}
              pending={pending}
              run={run}
              gateway={gateway}
              version={version}
            />
          ),
        )}
      </div>
    </article>
  );
}

function LayoutVersionSummary({
  canClone,
  gateway,
  layout,
  pending,
  run,
  version,
}: Readonly<{
  canClone: boolean;
  gateway: CatalogGateway;
  layout: CatalogLayout;
  pending: boolean;
  run: (successMessage: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: LayoutVersion;
}>) {
  return (
    <div className="catalog-version-row layout-version-summary">
      <div>
        <span className="catalog-version-state">
          {version.state === 'PUBLISHED' ? 'Đã công bố' : 'Đã thay thế'} · v
          {version.versionNumber ?? '—'}
        </span>
        <strong>{version.name}</strong>
        <small>
          {version.totalSeatCapacity} ghế · {version.tables.length} bàn · chỉ đọc
        </small>
      </div>
      {canClone ? (
        <button
          className="catalog-secondary-button"
          type="button"
          disabled={pending}
          aria-label={`Nhân bản phiên bản ${version.versionNumber ?? ''}`}
          onClick={() =>
            void run('Đã nhân bản bố trí thành bản nháp.', (token) =>
              gateway.cloneLayout(token, {
                templateId: layout.id,
                sourceVersionId: version.id,
                versionId: crypto.randomUUID(),
              }),
            )
          }
        >
          Nhân bản
        </button>
      ) : null}
    </div>
  );
}

function LayoutTextField({
  label,
  name,
  defaultValue = '',
}: Readonly<{ label: string; name: string; defaultValue?: string }>) {
  const id = `layout-${name}-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('vi-VN')}`;
  return (
    <label className="catalog-field" htmlFor={id}>
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
    <label className="catalog-field">
      <span>{label}</span>
      <input name={name} type="number" min={min} step={1} defaultValue={defaultValue} required />
    </label>
  );
}

function PanelMessages({
  error,
  message,
}: Readonly<{ error: string | null; message: string | null }>) {
  return (
    <div className="catalog-panel-messages" aria-live="polite">
      {message === null ? null : (
        <p className="catalog-success" role="status">
          {message}
        </p>
      )}
      {error === null ? null : (
        <p className="catalog-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function integer(data: FormData, name: string): number {
  return Number.parseInt(text(data, name), 10);
}

function layoutErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 409) return 'Bố trí đã thay đổi. Hãy tải lại lịch sử trước khi thử lại.';
    if (error.status === 422)
      return (
        error.details?.map(({ message }) => message).join(' ') || 'Dữ liệu bố trí chưa hợp lệ.'
      );
    if (error.status === 403 || error.status === 404) return 'Máy chủ từ chối thao tác bố trí này.';
  }
  return 'Không thể hoàn tất thao tác bố trí.';
}
