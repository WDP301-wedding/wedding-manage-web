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

import { X } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';
import { cx } from './catalog-classes';

export function RestaurantForm({
  onSubmit,
  pending,
  restaurant,
}: Readonly<{
  onSubmit: (input: Parameters<VenueCatalogGateway['updateRestaurant']>[1]) => Promise<boolean>;
  pending: boolean;
  restaurant: ManagerRestaurant;
}>) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const depositPct = Math.min(
      100,
      Math.max(10, parseInt(String(data.get('depositPercentage') || savedDepositPct), 10) || 30),
    );
    await onSubmit({
      displayName: field(data, 'displayName'),
      description: field(data, 'description'),
      address: field(data, 'address'),
      publicPhone: nullableField(data, 'publicPhone'),
      publicEmail: nullableField(data, 'publicEmail'),
      depositPercentage: depositPct,
      expectedRevision: restaurant.revision,
    });
  };
  const savedDepositPct = readDepositPercentage(restaurant);

  return (
    <form className={cx.formGrid} onSubmit={submit} key={restaurant.revision}>
      <Field label="Tên hiển thị" name="displayName" defaultValue={restaurant.displayName} />
      <Field label="Địa chỉ" name="address" defaultValue={restaurant.address} />
      <Field
        label="Email công khai"
        name="publicEmail"
        type="email"
        required={false}
        defaultValue={restaurant.publicEmail ?? ''}
      />
      <Field
        label="Điện thoại công khai"
        name="publicPhone"
        required={false}
        defaultValue={restaurant.publicPhone ?? ''}
      />
      <Field
        label="Tỷ lệ đặt cọc yêu cầu (%)"
        name="depositPercentage"
        type="number"
        min={10}
        max={100}
        step={1}
        defaultValue={savedDepositPct}
      />
      <p className="col-span-full -mt-2 text-xs text-muted-foreground">
        Tỷ lệ cọc do Quản lý thiết lập để cam kết giữ sảnh khi tạo hợp đồng mới (mặc định 30%, cho phép từ 10% đến 100%). Các hợp đồng đã ký trước đó giữ nguyên tỷ lệ theo điều khoản lúc lập.
      </p>
      <Field
        className={cx.fieldWide}
        label="Mô tả"
        name="description"
        as="textarea"
        defaultValue={restaurant.description}
      />
      <div className={cn(cx.formActions, cx.fieldWide)}>
        <button className={cx.primaryButton} type="submit" disabled={pending}>
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
    <form className={cx.shiftForm} onSubmit={submit} key={shift.revision}>
      <div className={cx.shiftFormTitle}>
        <div>
          <h3>{shiftLabel(shift.code)}</h3>
          <span className={cx.help}>Phiên bản {shift.revision}</span>
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
      <label className={cx.checkbox}>
        <input name="isActive" type="checkbox" defaultChecked={shift.isActive} />
        Đang nhận tiệc
      </label>
      <button className={cx.secondaryButton} type="submit" disabled={pending}>
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
    <form className={cx.drawer} onSubmit={submit}>
      <div className={cx.drawerHeading}>
        <div>
          <h3>{hall === null ? 'Thêm sảnh' : `Chỉnh sửa ${hall.name}`}</h3>
          <span className={cx.help}>
            {hall === null ? 'Bản ghi mới' : `Phiên bản ${hall.revision}`}
          </span>
        </div>
        <button type="button" onClick={onCancel} aria-label="Đóng biểu mẫu sảnh">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className={cx.formGrid}>
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
          className={cx.fieldWide}
          label="Mô tả sảnh"
          name="description"
          as="textarea"
          defaultValue={hall?.description ?? ''}
        />
      </div>
      <div className={cx.formActions}>
        <button className={cx.secondaryButton} type="button" onClick={onCancel}>
          Hủy
        </button>
        <button className={cx.primaryButton} type="submit" disabled={pending}>
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
  required = true,
  ...props
}: Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input' | 'textarea';
    className?: string;
    label: string;
    name: string;
    required?: boolean;
  }
>) {
  const fieldId = id ?? `catalog-${name}`;
  return (
    <div className={cn(cx.field, className)}>
      <label htmlFor={fieldId}>{label}</label>
      {as === 'textarea' ? (
        <textarea
          id={fieldId}
          name={name}
          required={required}
          defaultValue={String(props.defaultValue ?? '')}
        />
      ) : (
        <input {...props} id={fieldId} name={name} required={required} />
      )}
    </div>
  );
}

export function SectionHeading({ meta, title }: Readonly<{ meta?: string; title: string }>) {
  const id = `${title.toLocaleLowerCase('vi-VN').replaceAll(/[^a-z0-9]+/gu, '-')}-title`;
  return (
    <div className={cx.sectionHeading}>
      <h2 id={id}>{title}</h2>
      {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
    </div>
  );
}

export function Status({ lifecycle }: Readonly<{ lifecycle: 'ACTIVE' | 'RETIRED' }>) {
  return (
    <Badge variant={lifecycle === 'ACTIVE' ? 'success' : 'neutral'}>
      {lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
    </Badge>
  );
}

export function CatalogStatus({ label }: Readonly<{ label: string }>) {
  return (
    <main id="catalog-content" data-ui-v3 className={cx.loading} role="status" aria-busy="true">
      <span className={cx.loadingMark} aria-hidden="true" />
      <p>{label}</p>
    </main>
  );
}

export function CatalogAccessPanel({
  children,
  title,
}: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <main id="catalog-content" data-ui-v3 className={cx.permissionPage}>
      <section className={cx.permissionPanel}>
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

/**
 * Đọc tỷ lệ đặt cọc (%) từ nguồn ưu tiên:
 * 1. Trường `depositPercentage` trên object restaurant (khi BE bổ sung)
 * 2. Fallback localStorage (tạm thời trong phiên FE)
 * 3. Mặc định 30%
 */
export function readDepositPercentage(restaurant?: unknown): string {
  // Đọc trực tiếp trường depositPercentage từ dữ liệu máy chủ
  const fromApi =
    restaurant && typeof restaurant === 'object' && 'depositPercentage' in restaurant
      ? (restaurant as { depositPercentage?: unknown }).depositPercentage
      : undefined;
  if (typeof fromApi === 'number' && fromApi >= 10 && fromApi <= 100) {
    return String(fromApi);
  }
  // Mặc định
  return '30';
}
