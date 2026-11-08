'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { HySelect } from '../../components/ui/select-field';
import { formatVndNullable } from '../../lib/formatters';
import { completedEventsQuerySchema } from '../../services/completed-events.schemas';
import type { CompletedEventsFilters } from '../../services/completed-events.service';
import { useCompletedEvents, currentVietnamMonth } from './use-completed-events';
import { CompletedRankings } from './completed-rankings';
import { CompletedEventsTable } from './completed-events-table';
import { TablePagination } from './table-controls';
import { filterSelectClass, sectionClass, sectionTitleClass } from './dashboard-classes';

export function CompletedEventsDashboard() {
  const [dates, setDates] = useState(currentVietnamMonth);
  const [query, setQuery] = useState<CompletedEventsFilters>(() => ({
    ...currentVietnamMonth(),
    page: 1,
    pageSize: 10,
    paymentStatus: 'ALL',
  }));
  const [validationError, setValidationError] = useState<string | null>(null);
  const view = useCompletedEvents(query);
  const { data } = view;
  const applyDates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const candidate = {
      ...query,
      dateFrom: String(form.get('dateFrom')),
      dateTo: String(form.get('dateTo')),
      page: 1,
    };
    if (!completedEventsQuerySchema.safeParse(candidate).success) {
      setValidationError('Chọn khoảng ngày hợp lệ, tối đa 366 ngày.');
      return;
    }
    setValidationError(null);
    setDates({ dateFrom: candidate.dateFrom, dateTo: candidate.dateTo });
    setQuery(candidate);
  };
  return (
    <section
      className={sectionClass}
      aria-labelledby="completed-events-title"
      aria-busy={view.loading}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="completed-events-title" className={sectionTitleClass}>
            Hiệu quả tiệc đã hoàn tất
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo ngày tổ chức. Doanh thu là giá trị hóa đơn đã chốt, bao gồm điều chỉnh đã duyệt.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void view.refresh()}
          disabled={view.loading}
        >
          Làm mới báo cáo
        </Button>
      </div>
      <form onSubmit={applyDates} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          Từ ngày tiệc
          <input
            name="dateFrom"
            aria-label="Từ ngày tiệc"
            type="date"
            required
            defaultValue={dates.dateFrom}
            className={filterSelectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Đến ngày tiệc
          <input
            name="dateTo"
            aria-label="Đến ngày tiệc"
            type="date"
            required
            defaultValue={dates.dateTo}
            className={filterSelectClass}
          />
        </label>
        <Button type="submit" variant="outline">
          Xem thống kê
        </Button>
      </form>
      {validationError && (
        <p role="alert" className="text-sm text-hy-error">
          {validationError}
        </p>
      )}
      {view.error && (
        <div role="alert" className="rounded-lg border border-border p-4 text-sm text-hy-error">
          Không thể tải báo cáo. {view.error}{' '}
          <Button variant="outline" size="sm" onClick={() => void view.refresh()}>
            Thử lại
          </Button>
        </div>
      )}
      {view.loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang cập nhật báo cáo tiệc hoàn tất…
        </p>
      )}
      {data && (
        <>
          {data.meta.status === 'SOURCE_NOT_READY' && (
            <p role="status" className="text-sm text-hy-error">
              Một số tiệc chưa đủ dữ liệu tài chính. Các khoản chưa xác định được hiển thị bằng dấu
              —.
            </p>
          )}
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                'Tiệc hoàn tất',
                String(data.summary.completedCount),
                `${data.summary.finalizedCount} đã chốt hóa đơn · ${data.summary.provisionalCount} chưa chốt`,
              ],
              [
                'Doanh thu đã chốt',
                formatVndNullable(data.summary.revenueVnd),
                'Giá trị hóa đơn của tiệc hoàn tất',
              ],
              [
                'Đã thu ròng',
                formatVndNullable(data.summary.netPaidVnd),
                'Thanh toán đã xác nhận trừ hoàn tiền',
              ],
              [
                'Còn phải thu',
                formatVndNullable(data.summary.outstandingVnd),
                'Bao gồm khoản tạm tính của tiệc chưa chốt hóa đơn',
              ],
            ].map(([label, value, detail]) => (
              <div key={label} className="min-w-0 bg-card p-5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums [overflow-wrap:anywhere]">
                  {value}
                </dd>
                <dd className="mt-1 text-xs text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
          {data.summary.provisionalCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Giá trị tạm tính chưa vào doanh thu:{' '}
              {formatVndNullable(data.summary.provisionalTotalVnd)}.
            </p>
          )}
          <CompletedRankings data={data} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Công nợ từng tiệc</h3>
              <p className="text-sm text-muted-foreground">
                Bộ lọc thanh toán chỉ áp dụng cho bảng này; tổng quan và xếp hạng giữ nguyên kỳ báo
                cáo.
              </p>
            </div>
            <HySelect
              aria-label="Lọc công nợ tiệc hoàn tất"
              value={query.paymentStatus ?? 'ALL'}
              onChange={(e) => {
                const paymentStatus = completedEventsQuerySchema.shape.paymentStatus.parse(
                  e.target.value,
                );
                setQuery({ ...query, paymentStatus, page: 1 });
              }}
              className={filterSelectClass}
            >
              <option value="ALL">Tất cả thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="DEBT">Còn nợ</option>
            </HySelect>
          </div>
          <CompletedEventsTable items={data.items} />
          <TablePagination
            info={`${data.total} tiệc phù hợp`}
            pageSize={query.pageSize ?? 10}
            pageSizes={[10, 20, 50]}
            onPageSize={(pageSize) => setQuery({ ...query, pageSize, page: 1 })}
            page={data.page}
            totalPages={data.totalPages}
            onPage={(page) => setQuery({ ...query, page })}
            navLabel="Phân trang công nợ tiệc hoàn tất"
          />
          <p className="text-xs text-muted-foreground">
            Cập nhật{' '}
            {new Date(data.meta.generatedAt).toLocaleString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
            })}{' '}
            · Múi giờ Việt Nam.
          </p>
        </>
      )}
    </section>
  );
}
