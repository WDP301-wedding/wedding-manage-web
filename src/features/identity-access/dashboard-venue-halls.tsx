'use client';
import { HySelect } from '../../components/ui/select-field';

import Link from 'next/link';
import { cn } from 'cn';
import type { PublicHall } from '../../services/catalog.service';
import { Badge } from '../../components/ui/badge';
import {
  emptyClass,
  filterSelectClass,
  rowClass,
  sectionClass,
  sectionHeaderClass,
  sectionTitleClass,
  tableClass,
  tableWrapClass,
  tdClass,
  theadClass,
  thClass,
  toolbarClass,
} from './dashboard-classes';
import { SearchField, SortHeader, TablePagination } from './table-controls';
import { useDashboardHalls } from './use-dashboard-halls';

export type { HallSortField, SortOrder } from './use-dashboard-halls';

export function DashboardVenueHalls({
  halls,
  isManager = false,
}: Readonly<{
  halls: readonly PublicHall[];
  isManager?: boolean;
}>) {
  const view = useDashboardHalls(halls);

  return (
    <section className={sectionClass} id="available-halls">
      <div className={sectionHeaderClass}>
        <h2 className={sectionTitleClass}>Danh mục sảnh cưới khả dụng ({halls.length})</h2>
        {isManager ? (
          <Link
            className="text-xs font-semibold text-primary hover:underline"
            href="/catalog"
            prefetch={false}
          >
            Quản lý danh mục
          </Link>
        ) : null}
      </div>

      {halls.length === 0 ? (
        <p className={emptyClass}>Không có sảnh cưới nào đang mở trong hệ thống.</p>
      ) : (
        <>
          <div className={toolbarClass}>
            <SearchField
              label="Tìm kiếm sảnh cưới"
              placeholder="Tìm sảnh tiệc, mô tả…"
              value={view.searchQuery}
              onChange={view.setSearchQuery}
            />
            <HySelect
              value={`${view.sortField}-${view.sortOrder}`}
              onChange={(e) => view.handleQuickSortChange(e.target.value)}
              aria-label="Sắp xếp danh mục sảnh"
              className={filterSelectClass}
            >
              <option value="name-asc">Tên sảnh: A → Z</option>
              <option value="name-desc">Tên sảnh: Z → A</option>
              <option value="maxGuests-desc">Sức chứa: Nhiều nhất trước</option>
              <option value="maxGuests-asc">Sức chứa: Ít nhất trước</option>
            </HySelect>
          </div>

          {view.sortedHalls.length === 0 ? (
            <p className={emptyClass}>Không tìm thấy sảnh cưới nào phù hợp với từ khóa tìm kiếm.</p>
          ) : (
            <>
              <div className={tableWrapClass}>
                <table aria-label="Danh mục sảnh tiệc" className={cn(tableClass, 'min-w-[640px]')}>
                  <thead className={theadClass}>
                    <tr>
                      <SortHeader
                        label="Tên sảnh"
                        title="Sắp xếp theo tên sảnh"
                        active={view.sortField === 'name'}
                        order={view.sortOrder}
                        onSort={() => view.handleSortChange('name')}
                      />
                      <SortHeader
                        label="Sức chứa tối đa"
                        title="Sắp xếp theo sức chứa"
                        active={view.sortField === 'maxGuests'}
                        order={view.sortOrder}
                        onSort={() => view.handleSortChange('maxGuests')}
                      />
                      <th scope="col" className={thClass}>
                        Trạng thái hoạt động
                      </th>
                      <th scope="col" className={thClass}>
                        Mô tả
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.paginatedHalls.map((h) => (
                      <tr key={h.id} className={rowClass}>
                        <td className={cn(tdClass, 'font-semibold')}>{h.name}</td>
                        <td className={cn(tdClass, 'tabular-nums')}>{h.maxGuests} khách</td>
                        <td className={tdClass}>
                          <Badge variant="success">Đang hoạt động</Badge>
                        </td>
                        <td className={cn(tdClass, 'max-w-[300px] text-muted-foreground')}>
                          {h.description || 'Chưa có mô tả'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                info={
                  <span>
                    Hiển thị <strong>{view.startIndex + 1}</strong> –{' '}
                    <strong>{view.endIndex}</strong> / <strong>{view.sortedHalls.length}</strong>{' '}
                    sảnh tiệc
                  </span>
                }
                pageSize={view.pageSize}
                pageSizes={[5, 10, 20]}
                onPageSize={view.setPageSize}
                page={view.safeCurrentPage}
                totalPages={view.totalPages}
                onPage={view.setCurrentPage}
                navLabel="Phân trang sảnh cưới"
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
