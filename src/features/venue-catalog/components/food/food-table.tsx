'use client';

import { cx } from '@/src/features/venue-catalog/styles/catalog-classes';

export function FoodTable({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className={cx.tableScroll} role="region" aria-label={label} tabIndex={0}>
      <table className={cx.table}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {['Tên', 'Trạng thái', 'Phiên bản công bố', 'Giá', 'Thao tác'].map((title) => (
              <th key={title} scope="col">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
