'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import type { Authorize } from './catalog-tabs';
import {
  emptyOffering,
  offeringCatalogs,
  type OfferingDraft,
  type OfferingItem,
  type OfferingKind,
} from './offering-catalog-api';
import { OfferingCatalogForm } from './offering-catalog-form';
import { OfferingCatalogList } from './offering-catalog-list';
import { useOfferingCatalog } from './use-offering-catalog';

export function OfferingCatalog({ kind, authorize }: { kind: OfferingKind; authorize: Authorize }) {
  const catalog = useOfferingCatalog(kind, authorize);
  const config = offeringCatalogs[kind];
  const [filter, setFilter] = useState('ACTIVE');
  const [editing, setEditing] = useState<OfferingItem | null>(null);
  const [draft, setDraft] = useState<OfferingDraft>(emptyOffering);
  const [confirmation, setConfirmation] = useState<OfferingItem | null>(null);
  const section = useRef<HTMLElement>(null);
  const confirmationPanel = useRef<HTMLDivElement>(null);
  const toggleButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (confirmation) confirmationPanel.current?.focus();
  }, [confirmation]);
  const closeConfirmation = () => {
    setConfirmation(null);
    if (toggleButton.current?.isConnected) toggleButton.current.focus();
    else section.current?.querySelector('select')?.focus();
  };
  const reset = () => {
    setEditing(null);
    setDraft(emptyOffering);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await catalog.save(draft, editing, editing?.active ?? true)) reset();
  };
  const toggle = async () => {
    if (!confirmation) return;
    const saved = await catalog.save(confirmation, confirmation, !confirmation.active);
    if (saved) {
      if (editing?.id === saved.id) setEditing(saved);
      closeConfirmation();
    }
  };
  const filtered = catalog.items.filter(
    (item) => filter === 'ALL' || (filter === 'ACTIVE' ? item.active : !item.active),
  );
  return (
    <section
      ref={section}
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 text-sm sm:p-6"
      aria-label={config.title}
    >
      <h2 className="text-xl leading-snug font-semibold">{config.title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{config.description}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{config.hint}</p>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium">
          Trạng thái
          <select
            aria-label={config.filterLabel}
            value={filter}
            disabled={catalog.pending}
            onChange={(event) => {
              setFilter(event.target.value);
              setConfirmation(null);
            }}
            className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <option value="ACTIVE">Đang sử dụng</option>
            <option value="INACTIVE">Đã ngừng</option>
            <option value="ALL">Tất cả</option>
          </select>
        </label>
        {catalog.loaded ? (
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {catalog.items.length}{' '}
            {kind === 'incidentals' ? 'hạng mục' : 'dịch vụ'}
          </span>
        ) : null}
      </div>
      {catalog.error ? (
        <div
          role="alert"
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-hy-error-bg p-3 text-sm text-hy-error"
        >
          <p className="min-w-0 [overflow-wrap:anywhere]">{catalog.error}</p>
          <Button
            size="sm"
            variant="outline"
            disabled={catalog.pending}
            onClick={() => {
              setConfirmation(null);
              void catalog.load();
            }}
          >
            Tải lại
          </Button>
        </div>
      ) : null}
      {confirmation ? (
        <div
          ref={confirmationPanel}
          tabIndex={-1}
          role="group"
          aria-label="Xác nhận thay đổi trạng thái"
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted p-4"
        >
          <p className="leading-relaxed [overflow-wrap:anywhere]">
            {confirmation.active ? 'Ngừng sử dụng' : 'Khôi phục'}{' '}
            <strong>{confirmation.name}</strong>{' '}
            {kind === 'incidentals' ? 'cho booking mới?' : 'cho lựa chọn dịch vụ mới?'}{' '}
            {kind === 'incidentals'
              ? 'Booking đã có vẫn giữ nguyên bảng giá.'
              : 'Hợp đồng và phụ lục đã chốt giữ nguyên.'}
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button size="sm" disabled={catalog.pending} onClick={() => void toggle()}>
              {catalog.pending
                ? 'Đang lưu…'
                : confirmation.active
                  ? 'Xác nhận ngừng'
                  : 'Xác nhận khôi phục'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={catalog.pending}
              onClick={closeConfirmation}
            >
              Hủy
            </Button>
          </div>
        </div>
      ) : null}
      {!catalog.loaded ? (
        !catalog.error ? (
          <p role="status" className="py-4 text-muted-foreground">
            Đang tải danh mục…
          </p>
        ) : null
      ) : (
        <OfferingCatalogList
          kind={kind}
          items={filtered}
          pending={catalog.pending}
          onToggle={(item) => {
            toggleButton.current =
              document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
            setConfirmation(item);
          }}
          onEdit={(item) => {
            setEditing(item);
            setDraft(item);
            setConfirmation(null);
            const input = section.current?.querySelector<HTMLInputElement>('form input');
            input?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
            input?.focus({ preventScroll: true });
          }}
        />
      )}
      <OfferingCatalogForm
        kind={kind}
        editing={editing}
        draft={draft}
        setDraft={setDraft}
        pending={catalog.pending}
        disabled={!catalog.loaded}
        onSubmit={(event) => void submit(event)}
        onCancel={reset}
      />
    </section>
  );
}
