'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Files, Power } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { cx } from './catalog-classes';

export type TemplateVersion = Readonly<{
  id: string;
  name: string;
  description: string;
  revision: number;
  versionNumber: number | null;
  state: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  publishedAt: string | null;
}>;

type TemplateRecord<V extends TemplateVersion> = Readonly<{
  lifecycle: 'ACTIVE' | 'RETIRED';
  currentPublishedVersionId: string | null;
  draftVersionId: string | null;
  versions: readonly V[];
}>;

export function displayedTemplateVersion<V extends TemplateVersion>(record: TemplateRecord<V>) {
  return (
    record.versions.find(({ id }) => id === record.currentPublishedVersionId) ??
    record.versions.find(({ id }) => id === record.draftVersionId) ??
    record.versions[0]
  );
}

export function TemplateRecordTable({
  label,
  informationHeading,
  children,
}: Readonly<{
  label: string;
  informationHeading: string;
  children: ReactNode;
}>) {
  return (
    <div className="p-4 sm:p-6">
      <div className={cx.tableScroll} role="region" aria-label={label} tabIndex={0}>
        <table className={cx.table}>
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              <th scope="col">Tên</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Phiên bản công bố</th>
              <th scope="col">{informationHeading}</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function TemplateRecordRow<V extends TemplateVersion>({
  record,
  pending,
  information,
  renderVersion,
  editor,
  onLifecycle,
}: Readonly<{
  record: TemplateRecord<V>;
  pending: boolean;
  information: (version: V) => ReactNode;
  renderVersion: (version: V) => ReactNode;
  editor: (version: V, close: () => void) => ReactNode;
  onLifecycle: () => Promise<boolean>;
}>) {
  const [view, setView] = useState<'details' | 'edit' | null>(null);
  const [editingVersion, setEditingVersion] = useState<V | null>(null);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const dismiss = useCallback(() => {
    if (!pendingRef.current) setView(null);
  }, []);
  const closeEditor = useCallback(() => setView(null), []);
  const current = record.versions.find(({ id }) => id === record.currentPublishedVersionId);
  const draft = record.versions.find(({ id }) => id === record.draftVersionId);
  const displayed = displayedTemplateVersion(record);
  if (!displayed) return null;
  const editLabel = draft ? 'Tiếp tục bản nháp' : 'Tạo phiên bản mới';
  return (
    <tr aria-label={displayed.name}>
      <td className="min-w-48 max-w-80 break-words font-semibold">{displayed.name}</td>
      <td>
        <div className="flex flex-col items-start gap-2">
          <Badge variant={record.lifecycle === 'ACTIVE' && current ? 'success' : 'neutral'}>
            {record.lifecycle === 'RETIRED'
              ? 'Đã ngừng'
              : current
                ? 'Đang hoạt động'
                : 'Chưa công bố'}
          </Badge>
          {draft && current && <Badge variant="neutral">Có bản nháp</Badge>}
        </div>
      </td>
      <td>{current ? `v${current.versionNumber}` : 'Chưa công bố'}</td>
      <td className="min-w-40 text-sm">
        {information(displayed)}
        {!current && draft && (
          <p className="mt-1 text-xs text-muted-foreground">Thông tin bản nháp</p>
        )}
      </td>
      <td>
        <div className="flex w-max flex-wrap gap-2 [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs">
          <button type="button" className={cx.secondaryButton} onClick={() => setView('details')}>
            <Eye aria-hidden />
            Chi tiết
          </button>
          <button
            type="button"
            className={cx.secondaryButton}
            disabled={pending || record.lifecycle !== 'ACTIVE'}
            onClick={() => {
              setEditingVersion(draft ?? current ?? displayed);
              setView('edit');
            }}
          >
            <Files aria-hidden />
            {editLabel}
          </button>
          <button
            type="button"
            className={cx.secondaryButton}
            disabled={pending}
            onClick={() => void onLifecycle()}
          >
            <Power aria-hidden />
            {record.lifecycle === 'ACTIVE' ? 'Ngừng' : 'Khôi phục'}
          </button>
        </div>
        {view && (
          <PrintOrderDialog
            label={view === 'details' ? `Chi tiết ${displayed.name}` : editLabel}
            size="wide"
            title={view === 'details' ? `Chi tiết ${displayed.name}` : editLabel}
            onClose={dismiss}
          >
            {view === 'details' ? (
              <TemplateRecordDetails record={record} renderVersion={renderVersion} />
            ) : (
              editingVersion && editor(editingVersion, closeEditor)
            )}
          </PrintOrderDialog>
        )}
      </td>
    </tr>
  );
}

function TemplateRecordDetails<V extends TemplateVersion>({
  record,
  renderVersion,
}: Readonly<{
  record: TemplateRecord<V>;
  renderVersion: (version: V) => ReactNode;
}>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = record.versions.find(({ id }) => id === record.currentPublishedVersionId);
  const draft = record.versions.find(({ id }) => id === record.draftVersionId);
  const history = record.versions
    .filter(({ state }) => state === 'SUPERSEDED')
    .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
  const selected = history.find(({ id }) => id === selectedId);
  const content = (version: V) => (
    <div className="flex min-w-0 flex-col gap-4 text-sm break-words">
      <p className="font-semibold">{version.name}</p>
      <p>{version.description || 'Chưa có mô tả.'}</p>
      {version.publishedAt && (
        <p className="text-xs text-muted-foreground">
          Công bố:{' '}
          {new Date(version.publishedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
        </p>
      )}
      {renderVersion(version)}
    </div>
  );
  return (
    <>
      <p className="text-sm">
        Trạng thái:{' '}
        {record.lifecycle === 'RETIRED' ? 'Đã ngừng' : current ? 'Đang hoạt động' : 'Chưa công bố'}
      </p>
      <section aria-label="Bản đang công bố" className="flex flex-col gap-3">
        <h3 className="font-semibold">
          {current
            ? `${record.lifecycle === 'RETIRED' ? 'Bản công bố gần nhất' : 'Bản đang công bố'} · v${current.versionNumber}`
            : 'Chưa có bản công bố'}
        </h3>
        {current && content(current)}
      </section>
      {draft && (
        <section
          aria-label="Bản nháp"
          className="flex flex-col gap-3 rounded-lg border border-border p-4"
        >
          <h3 className="font-semibold">Bản nháp · chưa công bố</h3>
          {content(draft)}
        </section>
      )}
      <section
        aria-label="Lịch sử phiên bản"
        className="flex flex-col gap-3 border-t border-border pt-4"
      >
        <h3 className="font-semibold">Lịch sử phiên bản ({history.length})</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có phiên bản trước đây.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="text-sm">
                  v{version.versionNumber} · {version.name}
                </span>
                <button
                  type="button"
                  className={cx.secondaryButton}
                  aria-label={`Chi tiết phiên bản ${version.versionNumber}`}
                  aria-expanded={selectedId === version.id}
                  onClick={() => setSelectedId(selectedId === version.id ? null : version.id)}
                >
                  Chi tiết
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <section
            aria-label={`Chi tiết phiên bản ${selected.versionNumber}`}
            className="rounded-lg border border-border p-4"
          >
            <h3 className="mb-3 font-semibold">Phiên bản {selected.versionNumber} · đã thay thế</h3>
            {content(selected)}
          </section>
        )}
      </section>
    </>
  );
}
