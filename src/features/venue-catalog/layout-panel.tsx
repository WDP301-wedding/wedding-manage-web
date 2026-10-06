'use client';

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

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
type LayoutVersion = CatalogLayout['versions'][number];

const CANVAS_SIZE = 10_000;

export function LayoutPanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [snapshot, setSnapshot] = useState<LayoutCatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await authorize((token) => gateway.loadLayouts(token)));
    } catch (caught) {
      setError(layoutErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorize, gateway]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

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
          Tọa độ chuẩn hóa giúp cùng một sơ đồ hiển thị nhất quán. Giá dịch vụ không được tính
          theo khách tại đây.
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
        <p className="catalog-empty">Chưa có mẫu bố trí. Tạo mẫu đầu tiên cho một sảnh hoạt động.</p>
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
      <button className="catalog-primary-button" type="submit" disabled={pending || halls.length === 0}>
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
          <span className={`status ${layout.lifecycle === 'ACTIVE' ? 'status-ready' : 'status-retired'}`}>
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

function LayoutDraftEditor({
  gateway,
  hallMaximum,
  layout,
  pending,
  run,
  setError,
  version,
}: Readonly<{
  gateway: CatalogGateway;
  hallMaximum: number;
  layout: CatalogLayout;
  pending: boolean;
  run: (
    successMessage: string,
    operation: (token: string) => Promise<void>,
    options?: Readonly<{ reload?: boolean }>,
  ) => Promise<boolean>;
  setError: (error: string | null) => void;
  version: LayoutVersion;
}>) {
  const [tables, setTables] = useState<LayoutTableWrite[]>(() =>
    version.tables.map((table) => ({ ...table })),
  );
  const [retirements, setRetirements] = useState<string[]>([]);
  const totalSeats = useMemo(
    () => tables.reduce((total, table) => total + table.seatCapacity, 0),
    [tables],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const normalized = tables.map((table, index) => ({ ...table, displayOrder: index + 1 }));
    const validation = validateLayout(normalized, hallMaximum, {
      minGuests: integer(data, 'minGuests'),
      maxGuests: integer(data, 'maxGuests'),
    });
    if (validation !== null) {
      setError(validation);
      return;
    }
    void run('Đã lưu bố trí và danh tính bàn ổn định.', async (token) => {
      await gateway.updateLayoutDraft(token, {
        versionId: version.id,
        expectedRevision: version.revision,
        name: text(data, 'name'),
        description: text(data, 'description'),
        minGuests: integer(data, 'minGuests'),
        maxGuests: integer(data, 'maxGuests'),
        tables: normalized,
      });
      await Promise.all(
        retirements.map((tableId) =>
          gateway.retireLayoutTable(token, { templateId: layout.id, tableId }),
        ),
      );
    });
  };

  const addTable = () => {
    const tableId = crypto.randomUUID();
    void run(
      'Đã đăng ký UUID bàn mới. Hãy lưu bố trí để hoàn tất.',
      async (token) => {
        await gateway.registerLayoutTable(token, { templateId: layout.id, tableId });
        setTables((current) => [...current, defaultTable(tableId, current.length + 1)]);
      },
      { reload: false },
    );
  };

  return (
    <form className="catalog-draft-form layout-draft" aria-label={`Bản nháp ${version.name}`} onSubmit={submit}>
      <div className="layout-draft-heading">
        <div>
          <span className="catalog-version-state">Bản nháp · revision {version.revision}</span>
          <h4>Biên tập hình học bằng số</h4>
        </div>
        <div className="layout-metrics" aria-label="Ràng buộc bố trí">
          <span>Canvas 10.000 × 10.000</span>
          <span>{totalSeats.toLocaleString('vi-VN')} / {hallMaximum.toLocaleString('vi-VN')} ghế</span>
          <span>Khoảng khách {version.minGuests}–{version.maxGuests}</span>
        </div>
      </div>
      <div className="layout-meta-grid">
        <LayoutTextField label="Tên bố trí bản nháp" name="name" defaultValue={version.name} />
        <LayoutTextField label="Mô tả bản nháp" name="description" defaultValue={version.description} />
        <LayoutNumberField label="Khách tối thiểu" name="minGuests" min={1} defaultValue={version.minGuests} />
        <LayoutNumberField label="Khách tối đa" name="maxGuests" min={1} defaultValue={version.maxGuests} />
      </div>
      <LayoutCanvas tables={tables} />
      <div className="layout-table-list">
        {tables.map((table, index) => (
          <TableEditor
            key={table.tableId}
            table={table}
            onChange={(next) =>
              setTables((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))
            }
            onRemove={() => {
              if (tables.length === 1) {
                setError('Mỗi bố trí cần ít nhất một bàn.');
                return;
              }
              setRetirements((current) => [...current, table.tableId]);
              setTables((current) => current.filter(({ tableId }) => tableId !== table.tableId));
            }}
          />
        ))}
      </div>
      <div className="catalog-form-actions">
        <button className="catalog-secondary-button" type="button" disabled={pending} onClick={addTable}>
          Thêm bàn với UUID mới
        </button>
        <button className="catalog-secondary-button" type="submit" disabled={pending}>
          Lưu bố trí nháp
        </button>
        <button
          className="catalog-primary-button"
          type="button"
          disabled={pending}
          onClick={() =>
            void run('Đã công bố mẫu bố trí.', (token) =>
              gateway.publishLayout(token, {
                versionId: version.id,
                expectedRevision: version.revision,
              }),
            )
          }
        >
          Công bố bố trí
        </button>
      </div>
    </form>
  );
}

function TableEditor({
  onChange,
  onRemove,
  table,
}: Readonly<{
  onChange: (table: LayoutTableWrite) => void;
  onRemove: () => void;
  table: LayoutTableWrite;
}>) {
  const number = (key: keyof LayoutTableWrite, value: string) =>
    onChange({ ...table, [key]: Number.parseInt(value, 10) || 0 });
  return (
    <fieldset className="layout-table-editor">
      <legend>{table.label}</legend>
      <code title="Danh tính bàn ổn định">{table.tableId}</code>
      <label>
        <span>Nhãn bàn</span>
        <input value={table.label} onChange={(event) => onChange({ ...table, label: event.currentTarget.value })} />
      </label>
      <label>
        <span>Hình dạng</span>
        <select value={table.shape} onChange={(event) => onChange({ ...table, shape: event.currentTarget.value as LayoutTableWrite['shape'] })}>
          <option value="ROUND">Tròn</option>
          <option value="RECTANGLE">Chữ nhật</option>
        </select>
      </label>
      <TableNumber label={`Số ghế ${table.label}`} value={table.seatCapacity} min={1} max={100} onChange={(value) => number('seatCapacity', value)} />
      <TableNumber label={`Tọa độ X ${table.label}`} value={table.x} min={0} max={CANVAS_SIZE} onChange={(value) => number('x', value)} />
      <TableNumber label={`Tọa độ Y ${table.label}`} value={table.y} min={0} max={CANVAS_SIZE} onChange={(value) => number('y', value)} />
      <TableNumber label={`Chiều rộng ${table.label}`} value={table.width} min={1} max={CANVAS_SIZE} onChange={(value) => number('width', value)} />
      <TableNumber label={`Chiều cao ${table.label}`} value={table.height} min={1} max={CANVAS_SIZE} onChange={(value) => number('height', value)} />
      <TableNumber label={`Góc xoay ${table.label}`} value={table.rotationDegrees} min={0} max={359} onChange={(value) => number('rotationDegrees', value)} />
      <button type="button" className="catalog-danger-button" onClick={onRemove} aria-label={`Bỏ và ngừng vĩnh viễn ${table.label}`}>
        Bỏ &amp; ngừng UUID
      </button>
    </fieldset>
  );
}

function LayoutCanvas({ tables }: Readonly<{ tables: readonly LayoutTableWrite[] }>) {
  return (
    <div className="layout-canvas" role="img" aria-label="Xem trước bố trí bàn theo tỷ lệ canvas">
      {tables.map((table) => (
        <span
          key={table.tableId}
          className={`layout-canvas-table ${table.shape === 'ROUND' ? 'is-round' : ''}`}
          style={{
            left: `${(table.x / CANVAS_SIZE) * 100}%`,
            top: `${(table.y / CANVAS_SIZE) * 100}%`,
            width: `${Math.max((table.width / CANVAS_SIZE) * 100, 3)}%`,
            height: `${Math.max((table.height / CANVAS_SIZE) * 100, 3)}%`,
            transform: `rotate(${table.rotationDegrees}deg)`,
          }}
          title={`${table.label}: ${table.seatCapacity} ghế`}
        >
          {table.label}
        </span>
      ))}
    </div>
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
          {version.state === 'PUBLISHED' ? 'Đã công bố' : 'Đã thay thế'} · v{version.versionNumber ?? '—'}
        </span>
        <strong>{version.name}</strong>
        <small>{version.totalSeatCapacity} ghế · {version.tables.length} bàn · chỉ đọc</small>
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

function LayoutTextField({ label, name, defaultValue = '' }: Readonly<{ label: string; name: string; defaultValue?: string }>) {
  const id = `layout-${name}-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('vi-VN')}`;
  return (
    <label className="catalog-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={name} defaultValue={defaultValue} required={name === 'name'} />
    </label>
  );
}

function LayoutNumberField({ label, name, min, defaultValue }: Readonly<{ label: string; name: string; min: number; defaultValue: number }>) {
  return (
    <label className="catalog-field">
      <span>{label}</span>
      <input name={name} type="number" min={min} step={1} defaultValue={defaultValue} required />
    </label>
  );
}

function TableNumber({ label, max, min, onChange, value }: Readonly<{ label: string; max: number; min: number; onChange: (value: string) => void; value: number }>) {
  return (
    <label>
      <span>{label}</span>
      <input aria-label={label} type="number" min={min} max={max} step={1} value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function PanelMessages({ error, message }: Readonly<{ error: string | null; message: string | null }>) {
  return (
    <div className="catalog-panel-messages" aria-live="polite">
      {message === null ? null : <p className="catalog-success" role="status">{message}</p>}
      {error === null ? null : <p className="catalog-error" role="alert">{error}</p>}
    </div>
  );
}

function validateLayout(
  tables: readonly LayoutTableWrite[],
  hallMaximum: number,
  range: Readonly<{ minGuests: number; maxGuests: number }>,
): string | null {
  if (tables.length === 0) return 'Mỗi bố trí cần ít nhất một bàn.';
  if (tables.some(({ x, y, width, height }) => x < 0 || y < 0 || width < 1 || height < 1 || x + width > CANVAS_SIZE || y + height > CANVAS_SIZE)) {
    return 'Một bàn vượt biên canvas 10.000 × 10.000. Hãy chỉnh tọa độ hoặc kích thước.';
  }
  const seats = tables.reduce((total, table) => total + table.seatCapacity, 0);
  if (seats > hallMaximum) return 'Tổng số ghế vượt sức chứa sảnh.';
  if (range.minGuests < 1 || range.maxGuests < range.minGuests || range.maxGuests > seats) {
    return 'Khoảng khách phải tăng dần và không vượt tổng số ghế.';
  }
  return null;
}

function defaultTable(tableId: string, order = 1): LayoutTableWrite {
  return {
    tableId,
    label: `Bàn ${String(order).padStart(2, '0')}`,
    shape: 'ROUND',
    seatCapacity: 10,
    x: 500 + ((order - 1) % 5) * 1500,
    y: 500 + Math.floor((order - 1) / 5) * 1500,
    width: 1000,
    height: 1000,
    rotationDegrees: 0,
    displayOrder: order,
  };
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
    if (error.status === 422) return error.details?.map(({ message }) => message).join(' ') || 'Dữ liệu bố trí chưa hợp lệ.';
    if (error.status === 403 || error.status === 404) return 'Máy chủ từ chối thao tác bố trí này.';
  }
  return 'Không thể hoàn tất thao tác bố trí.';
}
