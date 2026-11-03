'use client';

import { useEffect } from 'react';

import { HySelect } from '../../components/ui/select-field';

import Link from 'next/link';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { DashboardConsultationsTable } from './dashboard-consultations-table';
import {
  emptyClass,
  filterSelectClass,
  sectionClass,
  sectionHeaderClass,
  sectionTitleClass,
  toolbarClass,
} from './dashboard-classes';
import { SearchField, TablePagination } from './table-controls';
import type { DashboardState } from './use-dashboard-data';
import { useDashboardConsultations } from './use-dashboard-consultations';

export interface DashboardConsultationsSectionProps {
  isManager: boolean;
  state: DashboardState;
  consultations: readonly ConsultationRequestItem[];
  onTotalsChange?: (counts: { total: number; pending: number }) => void;
}

export function DashboardConsultationsSection({
  isManager,
  consultations,
  onTotalsChange,
}: Readonly<DashboardConsultationsSectionProps>) {
  const view = useDashboardConsultations(consultations, isManager);
  useEffect(() => {
    if (view.counts) onTotalsChange?.(view.counts);
  }, [onTotalsChange, view.counts]);

  return (
    <section className={sectionClass} id="upcoming-events">
      <div className={sectionHeaderClass}>
        <h2 className={sectionTitleClass}>Yêu cầu tư vấn gần đây</h2>
        {isManager ? (
          <Link
            className="text-xs font-semibold text-primary hover:underline"
            href="/consultation-requests"
            prefetch={false}
          >
            Xem toàn bộ ({view.loading ? '…' : view.total})
          </Link>
        ) : null}
      </div>

      {view.loading ? (
        <p className={emptyClass}>Đang đồng bộ danh sách yêu cầu tư vấn từ máy chủ…</p>
      ) : view.total === 0 && !view.error && !view.searchQuery && view.statusFilter === 'ALL' ? (
        <div className={emptyClass}>
          <strong className="text-base font-semibold text-foreground">
            Chưa có yêu cầu tư vấn nào được ghi nhận
          </strong>
          <p>Khách hàng đăng ký tư vấn qua website sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <>
          <div className={toolbarClass}>
            <SearchField
              label="Tìm kiếm yêu cầu tư vấn"
              placeholder="Tìm theo tên, email, sđt…"
              value={view.searchQuery}
              onChange={(value) => {
                view.setSearchQuery(value);
                view.setCurrentPage(1);
              }}
            />
            <HySelect
              value={view.statusFilter}
              onChange={(e) => {
                view.setStatusFilter(e.target.value);
                view.setCurrentPage(1);
              }}
              aria-label="Lọc theo trạng thái yêu cầu"
              className={filterSelectClass}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Chờ xử lý</option>
              <option value="CONVERTED">Đã chuyển đổi</option>
              <option value="CLOSED">Đã đóng</option>
            </HySelect>
            <HySelect
              value={`${view.sortField}-${view.sortOrder}`}
              onChange={(e) => view.handleQuickSortChange(e.target.value)}
              aria-label="Sắp xếp yêu cầu tư vấn"
              className={filterSelectClass}
            >
              <option value="createdAt-desc">Ngày đăng ký: Mới nhất</option>
              <option value="createdAt-asc">Ngày đăng ký: Cũ nhất</option>
              <option value="displayName-asc">Khách hàng: A → Z</option>
              <option value="displayName-desc">Khách hàng: Z → A</option>
              <option value="preferredDate-asc">Ngày dự kiến: Gần nhất</option>
              <option value="status-asc">Trạng thái: A → Z</option>
            </HySelect>
          </div>

          {view.error ? (
            <p role="alert" className={emptyClass}>
              {view.error}
              <button type="button" onClick={() => void view.retry()}>
                Thử lại
              </button>
            </p>
          ) : view.total === 0 ? (
            <p className={emptyClass}>Không tìm thấy yêu cầu tư vấn phù hợp với điều kiện lọc.</p>
          ) : (
            <>
              <DashboardConsultationsTable
                items={view.paginatedConsultations}
                sortField={view.sortField}
                sortOrder={view.sortOrder}
                onSortChange={view.handleSortChange}
              />
              <TablePagination
                info={
                  <span>
                    Hiển thị <strong>{view.total === 0 ? 0 : view.startIndex + 1}</strong> –{' '}
                    <strong>{view.endIndex}</strong> / <strong>{view.total}</strong> yêu cầu tư vấn
                  </span>
                }
                pageSize={view.pageSize}
                pageSizes={[5, 10, 20]}
                onPageSize={(size) => {
                  view.setPageSize(size);
                  view.setCurrentPage(1);
                }}
                page={view.safeCurrentPage}
                totalPages={view.totalPages}
                onPage={view.setCurrentPage}
                navLabel="Phân trang yêu cầu tư vấn"
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
