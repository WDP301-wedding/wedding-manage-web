'use client';
import { HySelect } from '../../components/ui/select-field';

import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Search,
} from 'lucide-react';
import { cn } from 'cn';
import { filterSelectClass, thClass } from './dashboard-classes';

/** Tiêu đề cột bấm để sắp xếp; mũi tên cho biết chiều đang sắp. */
export function SortHeader({
  label,
  title,
  active,
  order,
  onSort,
}: Readonly<{
  label: string;
  title: string;
  active: boolean;
  order: 'asc' | 'desc';
  onSort: () => void;
}>) {
  const Icon = !active ? ChevronsUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={thClass}
      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        onClick={onSort}
        title={title}
        className={cn(
          'inline-flex items-center gap-1 rounded-md font-semibold hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon aria-hidden className={cn('size-3.5', !active && 'opacity-60')} />
      </button>
    </th>
  );
}

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: Readonly<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="flex h-11 min-w-0 flex-[1_1_260px] items-center gap-2 rounded-lg border border-input bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
      <Search aria-hidden className="size-4 shrink-0" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

const navButtonClass =
  'inline-flex size-9 items-center justify-center rounded-lg border border-input bg-card text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40';

function pageNumbers(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | 'gap')[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 2) pages.push(n);
    else if (n === 2 || n === totalPages - 1) pages.push('gap');
  }
  return pages;
}

/** Dòng "Hiển thị …", chọn số dòng mỗi trang và nút chuyển trang dùng chung cho các bảng. */
export function TablePagination({
  info,
  pageSize,
  pageSizes,
  onPageSize,
  page,
  totalPages,
  onPage,
  navLabel,
}: Readonly<{
  info: ReactNode;
  pageSize: number;
  pageSizes: readonly number[];
  onPageSize: (size: number) => void;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  navLabel: string;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        {info}
        <label className="inline-flex items-center gap-2">
          Hiển thị:
          <HySelect
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            aria-label="Số dòng hiển thị mỗi trang"
            className={cn(filterSelectClass, 'h-9 text-xs')}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} / trang
              </option>
            ))}
          </HySelect>
        </label>
      </div>
      {totalPages >= 1 ? (
        <div role="navigation" aria-label={navLabel} className="flex items-center gap-1">
          <button
            type="button"
            className={navButtonClass}
            disabled={page === 1}
            onClick={() => onPage(1)}
            title="Trang đầu"
            aria-label="Trang đầu"
          >
            <ChevronsLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className={navButtonClass}
            disabled={page === 1}
            onClick={() => onPage(Math.max(1, page - 1))}
            title="Trang trước"
            aria-label="Trang trước"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          {pageNumbers(page, totalPages).map((n, index) =>
            n === 'gap' ? (
              <span key={`gap-${index}`} className="px-1">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPage(n)}
                aria-current={n === page ? 'page' : undefined}
                className={cn(
                  navButtonClass,
                  'w-auto min-w-9 px-2 text-xs font-semibold tabular-nums',
                  n === page &&
                    'border-primary bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            className={navButtonClass}
            disabled={page === totalPages}
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className={navButtonClass}
            disabled={page === totalPages}
            onClick={() => onPage(totalPages)}
            title="Trang cuối"
            aria-label="Trang cuối"
          >
            <ChevronsRight aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
