import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { OperationsShell } from '../identity-access/operations-shell';
import type { ManagementSessionSnapshot } from '../identity-access/session';
import { CheckIcon, ChevronRightIcon, CircleAlertIcon, Clock3Icon, PlusIcon } from './icons';
import {
  CancelOrderModal,
  CreateOrderNoticeModal,
  HandoverModal,
  HistoryModal,
} from './print-order-modals';
import type { ManagementPrintOrdersGateway } from './print-orders-api';
import { PrintOrdersDetail } from './print-orders-detail';
import { DEMO_MANAGER_SNAPSHOT } from './print-orders-fixtures';
import { usePrintOrderLifecycleMutations } from './print-orders-lifecycle-mutations';
import { usePrintOrderQuoteMutations } from './print-orders-quote-mutations';
import { PrintOrdersTable } from './print-orders-table';
import { usePrintOrdersData } from './use-print-orders-data';
import { QuoteDrawer } from './quote-drawer';
import { notify } from '../../design-system/notifications';

export interface WorkspaceProps {
  snapshot?: ManagementSessionSnapshot | null;
  actorName?: string;
  actorRole?: 'Manager' | 'Staff';
  gateway: ManagementPrintOrdersGateway;
  authorize: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  isFixtureMode: boolean;
  onLogout: () => void;
}

export function PrintOrdersWorkspace({
  snapshot,
  actorName,
  actorRole,
  gateway,
  authorize,
  isFixtureMode,
  onLogout,
}: WorkspaceProps) {
  const effectiveSnapshot: ManagementSessionSnapshot =
    snapshot ??
    (isFixtureMode
      ? DEMO_MANAGER_SNAPSHOT
      : {
          status: 'authenticated',
          actor: {
            accountId: 'test-account',
            displayEmail: actorName ?? 'operations@example.com',
            roles: actorRole === 'Staff' ? (['STAFF'] as const) : (['MANAGER'] as const),
            sessionId: 'test-session',
          },
          presentation: actorRole === 'Staff' ? 'staff' : 'manager',
          denial: null,
        });

  // Operation submitting guards (synchronous ref + React state)
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals & Drawers
  const [quoteDrawerOpen, setQuoteDrawerOpen] = useState(false);
  const [isReplacementProposal, setIsReplacementProposal] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [createOrderNoticeOpen, setCreateOrderNoticeOpen] = useState(false);

  // Notifications
  const showToast = useCallback((msg: string) => {
    notify.success(msg);
  }, []);

  const showError = useCallback((msg: string) => {
    notify.error(msg);
  }, []);

  const {
    orders,
    setOrders,
    loading,
    loadError,
    lastRefreshed,
    currentCursor,
    nextCursor,
    cursorHistory,
    query,
    setQuery,
    statusFilter,
    selectedOrder,
    setSelectedOrder,
    requestEpochRef,
    fetchOrders,
    resetDataState,
    handleManualRefresh,
    handleNextPage,
    handlePrevPage,
    handleFilterChange,
    filteredOrders,
    countAll,
    countApproved,
    countInProduction,
    countReady,
    countBlockedProposal,
    countExpired,
  } = usePrintOrdersData({
    gateway,
    authorize,
    showError,
    showToast,
    isSubmittingRef,
  });

  const handleLogout = useCallback(() => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    resetDataState();
    onLogout();
  }, [onLogout, resetDataState]);

  const { handleStartProduction, handleMarkReady, handleConfirmHandover, handleConfirmCancel } =
    usePrintOrderLifecycleMutations({
      selectedOrder,
      setSelectedOrder,
      setOrders,
      isSubmittingRef,
      setIsSubmitting,
      requestEpochRef,
      authorize,
      gateway,
      showToast,
      showError,
      currentCursor,
      fetchOrders,
      setHandoverModalOpen,
      setCancelModalOpen,
    });

  const { handleSubmitQuote } = usePrintOrderQuoteMutations({
    selectedOrder,
    setSelectedOrder,
    setOrders,
    isSubmittingRef,
    setIsSubmitting,
    requestEpochRef,
    authorize,
    gateway,
    showToast,
    showError,
    currentCursor,
    fetchOrders,
    setQuoteDrawerOpen,
    isReplacementProposal,
  });

  return (
    <OperationsShell
      activePage="print-orders"
      contentId="print-orders-main-area"
      snapshot={effectiveSnapshot}
      onLogout={handleLogout}
      pending={isSubmitting}
    >
      <main id="print-orders-main-area" className="v0-main-area admin-main">
        {/* Topbar */}
        <header className="v0-topbar">
          <div className="v0-breadcrumb">
            <span>Vận hành</span>
            <ChevronRightIcon />
            <strong>Thiệp cưới &amp; In ấn</strong>
          </div>
          <div className="v0-top-actions">
            <button
              className="v0-button v0-button-secondary"
              type="button"
              onClick={() => {
                void handleManualRefresh();
              }}
              disabled={loading || isSubmitting}
              title="Làm mới dữ liệu từ máy chủ"
            >
              {loading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="v0-content">
          {/* Header Title Strip */}
          <div className="v0-page-heading">
            <div>
              <span className="v0-heading-kicker">Hàng đợi in ấn tiệc cưới</span>
              <h1>Hàng đợi đơn in</h1>
            </div>
            <div className="v0-heading-actions">
              <button
                className="v0-button v0-button-secondary"
                type="button"
                onClick={() => setHistoryModalOpen(true)}
              >
                <Clock3Icon width={16} height={16} />
                <span>Xem lịch sử</span>
              </button>
              <button
                className="v0-button v0-button-primary"
                type="button"
                onClick={() => setCreateOrderNoticeOpen(true)}
              >
                <PlusIcon width={16} height={16} />
                <span>Tạo đơn in</span>
              </button>
            </div>
          </div>

          {/* Context Strip */}
          <div className="v0-context-strip">
            <div className="v0-context-info">
              <span className="v0-context-source">
                {isFixtureMode
                  ? 'Bản xem trước có nhãn (Fixtures Giả lập Quản lý)'
                  : 'Dữ liệu vận hành thực tế'}
              </span>
              <span className="v0-context-time">· Đồng bộ: {lastRefreshed}</span>
            </div>
          </div>

          {/* Metric Summary, Filters, Table and Pagination */}
          <PrintOrdersTable
            orders={orders}
            filteredOrders={filteredOrders}
            selectedOrder={selectedOrder}
            onSelectOrder={(order) => {
              if (isSubmittingRef.current) return;
              setSelectedOrder(order);
            }}
            loading={loading}
            loadError={loadError}
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onFilterChange={handleFilterChange}
            onManualRefresh={() => {
              void handleManualRefresh();
            }}
            countAll={countAll}
            countApproved={countApproved}
            countInProduction={countInProduction}
            countReady={countReady}
            countBlockedProposal={countBlockedProposal}
            countExpired={countExpired}
            cursorHistory={cursorHistory}
            nextCursor={nextCursor}
            onPrevPage={() => {
              void handlePrevPage();
            }}
            onNextPage={() => {
              void handleNextPage();
            }}
            isSubmitting={isSubmitting}
          />

          {/* Details Section for Selected Order */}
          {selectedOrder ? (
            <PrintOrdersDetail
              selectedOrder={selectedOrder}
              isSubmitting={isSubmitting}
              onStartProduction={() => {
                void handleStartProduction();
              }}
              onMarkReady={() => {
                void handleMarkReady();
              }}
              onOpenHandoverModal={() => setHandoverModalOpen(true)}
              onOpenQuoteDrawer={(replacement) => {
                setIsReplacementProposal(replacement);
                setQuoteDrawerOpen(true);
              }}
              onOpenCancelModal={() => setCancelModalOpen(true)}
            />
          ) : null}
        </div>
      </main>

      {/* Quote Drawer Keyed on orderId and revision */}
      {quoteDrawerOpen && selectedOrder ? (
        <QuoteDrawer
          key={`${selectedOrder.orderId}-rev${selectedOrder.revision}`}
          order={selectedOrder}
          isReplacementProposal={isReplacementProposal}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (isSubmittingRef.current) return;
            setQuoteDrawerOpen(false);
          }}
          onSubmit={(body) => {
            void handleSubmitQuote(body);
          }}
        />
      ) : null}

      {/* Handover Modal */}
      {handoverModalOpen && selectedOrder ? (
        <HandoverModal
          order={selectedOrder}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (isSubmittingRef.current) return;
            setHandoverModalOpen(false);
          }}
          onConfirm={(evidence) => {
            void handleConfirmHandover(evidence);
          }}
        />
      ) : null}

      {/* Cancellation Modal */}
      {cancelModalOpen && selectedOrder ? (
        <CancelOrderModal
          order={selectedOrder}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (isSubmittingRef.current) return;
            setCancelModalOpen(false);
          }}
          onConfirm={(reason) => {
            void handleConfirmCancel(reason);
          }}
        />
      ) : null}

      {/* Create Order Notice Modal */}
      {createOrderNoticeOpen ? (
        <CreateOrderNoticeModal onClose={() => setCreateOrderNoticeOpen(false)} />
      ) : null}

      {/* History Modal */}
      {historyModalOpen ? (
        <HistoryModal order={selectedOrder} onClose={() => setHistoryModalOpen(false)} />
      ) : null}
    </OperationsShell>
  );
}
