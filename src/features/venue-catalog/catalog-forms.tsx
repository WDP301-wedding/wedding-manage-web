'use client';

import type React from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ApiClientError } from '../../lib/api/client';
import type {
  CatalogHall,
  ManagerRestaurant,
  ManagerShift,
  VenueCatalogGateway,
} from './catalog-api';

export function RestaurantForm({
  onSubmit,
  pending,
  restaurant,
}: Readonly<{
  onSubmit: (input: Parameters<VenueCatalogGateway['updateRestaurant']>[1]) => Promise<boolean>;
  pending: boolean;
  restaurant: ManagerRestaurant;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit({
      displayName: field(data, 'displayName'),
      description: field(data, 'description'),
      address: field(data, 'address'),
      publicPhone: nullableField(data, 'publicPhone'),
      publicEmail: nullableField(data, 'publicEmail'),
      expectedRevision: restaurant.revision,
    });
  };
  return (
    <form className="catalog-form-grid" onSubmit={submit} key={restaurant.revision}>
      <Field label="Tên hiển thị" name="displayName" defaultValue={restaurant.displayName} />
      <Field label="Địa chỉ" name="address" defaultValue={restaurant.address} />
      <Field
        label="Email công khai"
        name="publicEmail"
        type="email"
        defaultValue={restaurant.publicEmail ?? ''}
      />
      <Field
        label="Điện thoại công khai"
        name="publicPhone"
        defaultValue={restaurant.publicPhone ?? ''}
      />
      <Field
        className="catalog-field-wide"
        label="Mô tả"
        name="description"
        as="textarea"
        defaultValue={restaurant.description}
      />
      <div className="catalog-form-actions catalog-field-wide">
        <button className="catalog-primary-button" type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu hồ sơ nhà hàng'}
        </button>
      </div>
    </form>
  );
}

export function ShiftForm({
  onSubmit,
  pending,
  shift,
}: Readonly<{
  onSubmit: (input: Parameters<VenueCatalogGateway['updateShift']>[1]) => Promise<boolean>;
  pending: boolean;
  shift: ManagerShift;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit({
      code: shift.code,
      startTime: field(data, 'startTime'),
      endTime: field(data, 'endTime'),
      isActive: data.get('isActive') === 'on',
      expectedRevision: shift.revision,
    });
  };
  const prefix = shift.code.toLowerCase();
  return (
    <form className="shift-form" onSubmit={submit} key={shift.revision}>
      <div className="shift-form-title">
        <div>
          <span className="section-kicker">Revision {shift.revision}</span>
          <h3>{shiftLabel(shift.code)}</h3>
        </div>
        <Status lifecycle={shift.isActive ? 'ACTIVE' : 'RETIRED'} />
      </div>
      <Field
        label="Bắt đầu"
        name="startTime"
        type="time"
        defaultValue={shift.startTime}
        id={`${prefix}-start`}
      />
      <Field
        label="Kết thúc"
        name="endTime"
        type="time"
        defaultValue={shift.endTime}
        id={`${prefix}-end`}
      />
      <label className="catalog-checkbox">
        <input name="isActive" type="checkbox" defaultChecked={shift.isActive} />
        Đang nhận tiệc
      </label>
      <button className="catalog-secondary-button" type="submit" disabled={pending}>
        Lưu khung giờ
      </button>
    </form>
  );
}

export function HallForm({
  hall,
  onCancel,
  onSubmit,
  pending,
}: Readonly<{
  hall: CatalogHall | null;
  onCancel: () => void;
  onSubmit: (input: Omit<Parameters<VenueCatalogGateway['createHall']>[1], 'id'>) => Promise<void>;
  pending: boolean;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit({
      name: field(data, 'name'),
      description: field(data, 'description'),
      maxGuests: integerField(data, 'maxGuests'),
      displayOrder: integerField(data, 'displayOrder'),
    });
  };
  return (
    <form className="catalog-drawer" onSubmit={submit}>
      <div className="catalog-drawer-heading">
        <div>
          <span className="section-kicker">
            {hall === null ? 'Bản ghi mới' : `Revision ${hall.revision}`}
          </span>
          <h3>{hall === null ? 'Thêm sảnh' : `Chỉnh sửa ${hall.name}`}</h3>
        </div>
        <button type="button" onClick={onCancel} aria-label="Đóng biểu mẫu sảnh">
          ×
        </button>
      </div>
      <div className="catalog-form-grid">
        <Field label="Tên sảnh" name="name" defaultValue={hall?.name ?? ''} />
        <Field
          label="Sức chứa tối đa"
          name="maxGuests"
          type="number"
          min={1}
          max={10_000}
          defaultValue={hall?.maxGuests ?? 100}
        />
        <Field
          label="Thứ tự hiển thị"
          name="displayOrder"
          type="number"
          min={0}
          defaultValue={hall?.displayOrder ?? 0}
        />
        <Field
          className="catalog-field-wide"
          label="Mô tả sảnh"
          name="description"
          as="textarea"
          defaultValue={hall?.description ?? ''}
        />
      </div>
      <div className="catalog-form-actions">
        <button className="catalog-secondary-button" type="button" onClick={onCancel}>
          Hủy
        </button>
        <button className="catalog-primary-button" type="submit" disabled={pending}>
          {hall === null ? 'Tạo sảnh' : 'Lưu thay đổi sảnh'}
        </button>
      </div>
    </form>
  );
}

export function Field({
  as = 'input',
  className,
  id,
  label,
  name,
  ...props
}: Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input' | 'textarea';
    className?: string;
    label: string;
    name: string;
  }
>) {
  const fieldId = id ?? `catalog-${name}`;
  return (
    <div className={`catalog-field${className === undefined ? '' : ` ${className}`}`}>
      <label htmlFor={fieldId}>{label}</label>
      {as === 'textarea' ? (
        <textarea
          id={fieldId}
          name={name}
          required
          defaultValue={String(props.defaultValue ?? '')}
        />
      ) : (
        <input {...props} id={fieldId} name={name} required />
      )}
    </div>
  );
}

export function SectionHeading({ eyebrow, title }: Readonly<{ eyebrow: string; title: string }>) {
  const id = `${title.toLocaleLowerCase('vi-VN').replaceAll(/[^a-z0-9]+/gu, '-')}-title`;
  return (
    <div className="catalog-section-heading">
      <p className="section-kicker">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
    </div>
  );
}

export function Status({ lifecycle }: Readonly<{ lifecycle: 'ACTIVE' | 'RETIRED' }>) {
  return (
    <span className={`status ${lifecycle === 'ACTIVE' ? 'status-ready' : 'status-retired'}`}>
      {lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
    </span>
  );
}

export function CatalogStatus({ label }: Readonly<{ label: string }>) {
  return (
    <main id="catalog-content" className="catalog-loading" role="status" aria-busy="true">
      <span className="catalog-loading-mark" aria-hidden="true">
        W
      </span>
      <p>{label}</p>
    </main>
  );
}

export function CatalogAccessPanel({
  children,
  title,
}: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <main id="catalog-content" className="permission-page">
      <section className="permission-panel">
        <span className="preview-label">Wedding Estate · Catalog</span>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}

export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function nullableField(data: FormData, name: string): string | null {
  return field(data, name) || null;
}

export function integerField(data: FormData, name: string): number {
  return Number.parseInt(field(data, name), 10);
}

export function shiftLabel(code: ManagerShift['code']): string {
  return code === 'LUNCH' ? 'Ca trưa' : 'Ca tối';
}

export function catalogErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ từ chối thao tác. Quyền hiển thị không thay đổi quyền thực tế.';
    }
    if (error.code === 'CATALOG_HALL_CAPACITY_CONFLICT') {
      return 'Sức chứa mới thấp hơn bố cục đang được công bố. Hãy điều chỉnh bố cục trước.';
    }
    if (error.status === 409) {
      return 'Dữ liệu đã thay đổi ở phiên khác. Hãy tải lại rồi thử lại.';
    }
    if (error.status === 422 && error.details !== undefined) {
      return error.details.map(({ message }) => message).join(' ');
    }
  }
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
}
