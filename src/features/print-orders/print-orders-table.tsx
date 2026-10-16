import type React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CircleAlertIcon, SearchIcon } from './icons';
import { printOrderStyles } from './print-orders.styles';
import {
  deriveCommercialStatus,
  deriveProductionStatus,
  formatVietnameseDateTime,
  type PrintOrderView,
} from './print-orders-types';

export interface PrintOrdersTableProps {
  orders: readonly PrintOrderView[];
  filteredOrders: readonly PrintOrderView[];
  selectedOrder: PrintOrderView | null;
  onSelectOrder: (order: PrintOrderView) => void;
  loading: boolean;
  loadError: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: string;
  onFilterChange: (status: string) => void;
  onManualRefresh: () => void;
  countAll: number;
  countApproved: number;
  countInProduction: number;
  countReady: number;
  countBlockedProposal: number;
  countExpired: number;
  cursorHistory: string[];
  nextCursor: string | null;
  onPrevPage: () => void;
  onNextPage: () => void;
  isSubmitting: boolean;
}

export function PrintOrdersTable({
  orders,
  filteredOrders,
  selectedOrder,
  onSelectOrder,
  loading,
  loadError,
  query,
  onQueryChange,
  statusFilter,
  onFilterChange,
  onManualRefresh,
  countAll,
  countApproved,
  countInProduction,
  countReady,
  countBlockedProposal,
  countExpired,
  cursorHistory,
  nextCursor,
  onPrevPage,
  onNextPage,
  isSubmitting,
}: PrintOrdersTableProps) {
  return (
    <>
      {/* Metric Summary Cards */}
      <section className="v0-queue-summary" aria-label="Tóm tắt trạng thái hàng đợi">
        <div className="v0-summary-item">
          <div className="v0-summary-num">{countAll}</div>
          <div className="v0-summary-label">Tổng đơn đang theo dõi</div>
        </div>
        <div className="v0-summary-divider" aria-hidden="true" />
        <div className="v0-summary-item">
          <div className="v0-summary-num text-amber">{countApproved}</div>
          <div className="v0-summary-label">Chờ bắt đầu sản xuất</div>
        </div>
        {countBlockedProposal > 0 ? (
          <>
            <div className="v0-summary-divider" aria-hidden="true" />
            <div className="v0-summary-item">
              <div className="v0-summary-num v0-summary-blocked">{countBlockedProposal}</div>
              <div className="v0-summary-label">Đang chờ duyệt đề xuất (Chặn sản xuất)</div>
            </div>
          </>
        ) : null}
        <div className="v0-summary-divider" aria-hidden="true" />
        <div className="v0-summary-item">
          <div className="v0-summary-num">{countInProduction}</div>
          <div className="v0-summary-label">Đang sản xuất</div>
        </div>
        <div className="v0-summary-divider" aria-hidden="true" />
        <div className="v0-summary-item">
          <div className="v0-summary-num">{countReady}</div>
          <div className="v0-summary-label">Sẵn sàng bàn giao</div>
        </div>
        {countExpired > 0 ? (
          <>
            <div className="v0-summary-divider" aria-hidden="true" />
            <div className="v0-summary-item v0-summary-fresh">
              <div className="v0-summary-num text-danger">{countExpired}</div>
              <div className="v0-summary-label">Báo giá hết hạn 7 ngày</div>
            </div>
          </>
        ) : null}
      </section>

      {/* Controls Bar */}
      <div className="v0-controls-bar">
        {/* Tabs */}
        <div className="v0-tabs" aria-label="Lọc trạng thái đơn">
          <button
            className={`v0-tab ${statusFilter === 'Tất cả' ? 'tab-active' : ''}`}
            aria-pressed={statusFilter === 'Tất cả'}
            onClick={() => onFilterChange('Tất cả')}
            type="button"
          >
            Tất cả <span className="v0-tab-count">{countAll}</span>
          </button>
          <button
            className={`v0-tab ${statusFilter === 'Chờ sản xuất' ? 'tab-active' : ''}`}
            aria-pressed={statusFilter === 'Chờ sản xuất'}
            onClick={() => onFilterChange('Chờ sản xuất')}
            type="button"
          >
            Chờ sản xuất <span className="v0-tab-count">{countApproved}</span>
          </button>
          <button
            className={`v0-tab ${statusFilter === 'Đang sản xuất' ? 'tab-active' : ''}`}
            aria-pressed={statusFilter === 'Đang sản xuất'}
            onClick={() => onFilterChange('Đang sản xuất')}
            type="button"
          >
            Đang sản xuất <span className="v0-tab-count">{countInProduction}</span>
          </button>
          <button
            className={`v0-tab ${statusFilter === 'Sẵn sàng' ? 'tab-active' : ''}`}
            aria-pressed={statusFilter === 'Sẵn sàng'}
            onClick={() => onFilterChange('Sẵn sàng')}
            type="button"
          >
            Sẵn sàng <span className="v0-tab-count">{countReady}</span>
          </button>
        </div>

        {/* Search */}
        <div className="v0-search-box">
          <SearchIcon width={16} height={16} />
          <input
            type="search"
            placeholder="Tìm mã đơn, tên cặp đôi, sảnh tiệc…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Tìm kiếm đơn in"
          />
        </div>
      </div>

      {/* Filter notice */}
      {query ? (
        <p className="v0-filter-note">
          Hiển thị {filteredOrders.length} / {orders.length} đơn trên trang hiện tại khớp từ khóa
          &quot;{query}&quot;.
        </p>
      ) : null}

      {/* Error Banner if load failed */}
      {loadError ? (
        <div className="v0-error-banner" role="alert">
          <CircleAlertIcon width={18} height={18} />
          <div>
            <strong>Lỗi kết nối máy chủ</strong>
            <p>{loadError}</p>
            <button
              type="button"
              className="v0-button v0-button-secondary"
              style={printOrderStyles.refreshButton}
              onClick={onManualRefresh}
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : null}

      {/* Orders Data Table */}
      <div className="v0-table-card">
        <div className="v0-table-wrap v0-table-container">
          <table className="v0-table">
            <caption className="sr-only">Danh sách các đơn in ấn thiệp cưới</caption>
            <thead>
              <tr>
                <th scope="col">Mã đơn in</th>
                <th scope="col">Cặp đôi &amp; Ngày tiệc</th>
                <th scope="col">Sảnh tiệc</th>
                <th scope="col">Số lượng bản in</th>
                <th scope="col">Thương mại</th>
                <th scope="col">Sản xuất</th>
                <th scope="col">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={printOrderStyles.emptyTableCol}>
                    Đang tải danh sách đơn in từ máy chủ…
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={printOrderStyles.emptyTableCol}>
                    {query
                      ? 'Không tìm thấy đơn in nào phù hợp từ khóa.'
                      : 'Không có đơn in nào trong trạng thái đã chọn.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.orderId === order.orderId;
                  const commStatus = deriveCommercialStatus(order);
                  const prodStatus = deriveProductionStatus(order);
                  const totalCopies = order.lines.reduce((s, l) => s + l.quantity, 0);

                  return (
                    <tr
                      key={order.orderId}
                      className={isSelected ? 'row-selected' : ''}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`Chọn đơn in ${order.orderId}`}
                      onClick={() => onSelectOrder(order)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectOrder(order);
                        }
                      }}
                    >
                      <td>
                        <strong>{order.orderId}</strong>
                        <small className="v0-table-sub">Rev {order.revision}</small>
                      </td>
                      <td>
                        <strong>{order.displayCouple ?? 'Chưa gán thông tin'}</strong>
                        <small className="v0-table-sub">
                          {order.displayEventDate ?? 'Chưa có thông tin ngày tiệc'}
                        </small>
                      </td>
                      <td>
                        <span>{order.displayHall ?? 'Chưa gán thông tin'}</span>
                      </td>
                      <td>
                        <strong>{totalCopies} bản</strong>
                        <small className="v0-table-sub">{order.lines.length} dòng thiết kế</small>
                      </td>
                      <td>
                        <span className={`v0-badge badge-${commStatus.tone}`}>
                          {commStatus.label}
                        </span>
                      </td>
                      <td>
                        <span className={`v0-badge badge-${prodStatus.tone}`}>
                          {prodStatus.label}
                        </span>
                      </td>
                      <td>
                        <time dateTime={order.updatedAt}>
                          {formatVietnameseDateTime(order.updatedAt)}
                        </time>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="v0-pagination-bar">
          <span className="v0-pagination-info">
            Trang hiện tại: {orders.length} đơn in
            {cursorHistory.length > 0 ? ` (Trang ${cursorHistory.length + 1})` : ' (Trang đầu)'}
          </span>
          <div className="v0-pagination-actions">
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onPrevPage}
              disabled={cursorHistory.length === 0 || loading || isSubmitting}
            >
              <ChevronLeftIcon width={16} height={16} />
              <span>Trang trước</span>
            </button>
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onNextPage}
              disabled={!nextCursor || loading || isSubmitting}
            >
              <span>Trang sau</span>
              <ChevronRightIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
