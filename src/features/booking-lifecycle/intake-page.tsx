'use client';

import Link from 'next/link';
import { cn } from 'cn';
import { OperationsShell } from '../identity-access/operations-shell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  useConsultationRequests,
  type SortOption,
  type StatusFilter,
} from './use-consultation-requests';
import { ConsultationKpiBar } from './consultation-kpi-bar';
import { ConsultationRequestsList } from './consultation-requests-list';

export function ConsultationRequestsPage() {
  const {
    snapshot,
    access,
    queue,
    pending,
    error,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    load,
    act,
    logout,
    stats,
    filteredItems,
  } = useConsultationRequests();

  const resetFilters = () => {
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const tabs: readonly {
    filter: StatusFilter;
    label: string;
    count: number;
    countClass: string;
  }[] = [
    { filter: 'ALL', label: 'Tất cả', count: stats.total, countClass: 'bg-secondary' },
    {
      filter: 'NEW',
      label: 'Chờ tiếp nhận',
      count: stats.newCount,
      countClass: 'bg-accent text-accent-foreground',
    },
    {
      filter: 'CONVERTED',
      label: 'Đã mở tư vấn',
      count: stats.convertedCount,
      countClass: 'bg-hy-success-bg text-hy-success',
    },
    {
      filter: 'CLOSED',
      label: 'Đã kết thúc',
      count: stats.closedCount,
      countClass: 'bg-card text-muted-foreground',
    },
  ];

  return (
    <OperationsShell
      activePage="consultations"
      contentId="consultation-main"
      snapshot={snapshot}
      onLogout={logout}
      pending={pending}
    >
      <main
        data-ui-v3=""
        className="flex flex-col gap-6 px-4 pt-8 pb-14 sm:px-10"
        id="consultation-main"
      >
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-[640px] flex-col gap-1">
            <h1 className="text-2xl font-bold">Yêu cầu tư vấn</h1>
            <p className="text-muted-foreground">
              Tiếp nhận lời nhắn và mở hồ sơ để cùng khách hàng chuẩn bị buổi tiệc.
            </p>
          </div>
          {access === 'manager' && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={pending}
              onClick={() => void load()}
            >
              Tải lại
            </Button>
          )}
        </header>

        {error && !queue && access === 'manager' && (
          <div className="rounded-xl bg-hy-error-bg px-5 py-4">
            <p className="font-semibold text-hy-error">{error}</p>
          </div>
        )}

        {access === 'loading' && (
          <p className="text-muted-foreground" role="status">
            Đang xác minh quyền quản lý…
          </p>
        )}
        {access === 'denied' && (
          <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Cần tài khoản Quản lý</h2>
            <Link className="font-semibold text-primary hover:underline" href="/">
              Đăng nhập để tiếp tục
            </Link>
          </section>
        )}

        {access === 'manager' && (
          <>
            {pending && (
              <p className="text-xs text-muted-foreground" role="status">
                Đang xử lý…
              </p>
            )}
            {queue?.data.length === 0 && (
              <section className="flex flex-col gap-1 rounded-xl border border-dashed border-border bg-muted px-6 py-10 text-center">
                <h2 className="text-lg font-semibold">Chưa có yêu cầu tư vấn</h2>
                <p className="text-muted-foreground">
                  Yêu cầu được gửi từ trang công khai sẽ xuất hiện tại đây.
                </p>
              </section>
            )}

            {queue && queue.data.length > 0 && (
              <>
                <ConsultationKpiBar
                  statusFilter={statusFilter}
                  onFilterChange={setStatusFilter}
                  stats={stats}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
                    {tabs.map((tab) => (
                      <button
                        key={tab.filter}
                        type="button"
                        aria-pressed={statusFilter === tab.filter}
                        onClick={() => setStatusFilter(tab.filter)}
                        className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-hy-1"
                      >
                        {tab.label}
                        <span
                          className={cn(
                            'min-w-5 rounded-full px-1.5 text-2xs leading-5 tabular-nums',
                            tab.countClass,
                          )}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex min-w-0 flex-[1_1_260px] flex-wrap items-center gap-2">
                    <Input
                      className="min-w-0 flex-[1_1_220px]"
                      type="search"
                      maxLength={120}
                      aria-label="Tìm yêu cầu trong toàn bộ danh sách"
                      placeholder="Tìm theo tên, email, sđt…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <select
                      className="h-11 rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      aria-label="Sắp xếp danh sách"
                    >
                      <option value="newest">Mới nhận nhất</option>
                      <option value="oldest">Cũ nhất</option>
                      <option value="date-asc">Ngày tiệc gần nhất</option>
                      <option value="guests-desc">Số khách nhiều nhất</option>
                      <option value="name-asc">Tên khách (A-Z)</option>
                    </select>

                    {(statusFilter !== 'ALL' || searchQuery.trim()) && (
                      <Button variant="link" size="sm" type="button" onClick={resetFilters}>
                        Đặt lại
                      </Button>
                    )}
                  </div>
                </div>
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted px-4 py-10 text-center text-muted-foreground">
                    <p className="font-semibold">
                      {pending
                        ? 'Đang tải kết quả mới…'
                        : 'Không tìm thấy yêu cầu tư vấn nào phù hợp với bộ lọc hiện tại.'}
                    </p>
                    <Button variant="outline" size="sm" type="button" onClick={resetFilters}>
                      Xóa bộ lọc
                    </Button>
                  </div>
                ) : (
                  <ConsultationRequestsList
                    items={filteredItems}
                    pending={pending}
                    onAction={act}
                    nextCursor={queue.nextCursor}
                    onLoadMore={load}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </OperationsShell>
  );
}
