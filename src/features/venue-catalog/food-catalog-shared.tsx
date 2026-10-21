'use client';

import type React from 'react';
import { ApiClientError } from '../../lib/api/client';
import { formatVnd } from '../../lib/formatters';
import type { CatalogDish, CatalogMenu } from './catalog-api';

export type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
export type DishVersion = CatalogDish['versions'][number];
export type MenuVersion = CatalogMenu['versions'][number];

export function VersionSummary({
  price,
  version,
}: Readonly<{ price: number | null; version: DishVersion | MenuVersion }>) {
  const state =
    version.state === 'PUBLISHED'
      ? `Đã công bố · v${version.versionNumber ?? '—'}`
      : version.state === 'SUPERSEDED'
        ? `Đã thay thế · v${version.versionNumber ?? '—'}`
        : 'Bản nháp';
  return (
    <div>
      <span className="catalog-version-state">{state}</span>
      <strong>{version.name}</strong>
      <small>{price === null ? 'Không niêm yết giá' : formatVnd(price)}</small>
    </div>
  );
}

export function AggregateHeader({
  label,
  lifecycle,
  onLifecycle,
}: Readonly<{
  label: string;
  lifecycle: 'ACTIVE' | 'RETIRED';
  onLifecycle: () => Promise<boolean>;
}>) {
  return (
    <header className="catalog-aggregate-header">
      <div>
        <span className={`status ${lifecycle === 'ACTIVE' ? 'status-ready' : 'status-retired'}`}>
          {lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
        </span>
        <h4>{label}</h4>
      </div>
      <button type="button" onClick={() => void onLifecycle()}>
        {lifecycle === 'ACTIVE' ? 'Ngừng' : 'Khôi phục'}
      </button>
    </header>
  );
}

export function LabeledInput({
  as = 'input',
  label,
  name,
  ...props
}: Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input' | 'textarea';
    label: string;
    name: string;
  }
>) {
  const id = `food-${name}-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('vi-VN')}`;
  return (
    <div className="catalog-field">
      <label htmlFor={id}>{label}</label>
      {as === 'textarea' ? (
        <textarea id={id} name={name} required defaultValue={String(props.defaultValue ?? '')} />
      ) : (
        <input {...props} id={id} name={name} required />
      )}
    </div>
  );
}

export function EditorHeading({ eyebrow, title }: Readonly<{ eyebrow: string; title: string }>) {
  return (
    <div className="catalog-editor-heading">
      <span className="section-kicker">{eyebrow}</span>
      <h3>{title}</h3>
    </div>
  );
}

export function PanelMessages({
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

export function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function integer(data: FormData, name: string): number {
  return Number.parseInt(text(data, name), 10);
}

export function optionalInteger(data: FormData, name: string): number | null {
  const value = text(data, name);
  return value === '' ? null : Number.parseInt(value, 10);
}

export function move(items: readonly string[], from: number, to: number): string[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export { formatVnd };

export function foodErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ từ chối thao tác. Vai trò hiển thị không cấp thêm quyền.';
    }
    if (error.status === 409) {
      return 'Phiên bản đã thay đổi. Hãy tải lại dữ liệu và áp dụng chỉnh sửa lần nữa.';
    }
    if (error.status === 422) {
      return error.details?.map(({ message }) => message).join(' ') || 'Dữ liệu chưa hợp lệ.';
    }
  }
  return 'Không thể hoàn tất thao tác món ăn hoặc thực đơn.';
}
