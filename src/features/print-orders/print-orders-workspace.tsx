import { useCallback, useRef, useState } from 'react';
import { Clock3, Plus, RefreshCw } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { OperationsShell } from '../identity-access/operations-shell';
import type { ManagementSessionSnapshot } from '../identity-access/session';
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

// Dưới 1536px chi tiết đơn nằm dưới bảng: cuộn tới đó để người dùng thấy đơn vừa chọn.
function revealDetailBelowTable() {
  if (window.matchMedia?.('(min-width: 1536px)').matches) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() =>
    document
      .getElementById('print-order-detail')
      ?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
  );
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
      <main
        id="print-orders-main-area"
        data-ui-v3
        className="flex min-h-screen flex-col gap-6 bg-background p-[clamp(1rem,3vw,3.25rem)]"
      >
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Hàng đợi đơn in</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {isFixtureMode ? <Badge variant="info">Dữ liệu mẫu</Badge> : null}
              <span>Cập nhật lúc {lastRefreshed}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void handleManualRefresh();
                }}
                disabled={loading || isSubmitting}
                title="Làm mới dữ liệu từ máy chủ"
              >
                <RefreshCw
                  aria-hidden
                  className={cn('size-3.5', loading && 'motion-safe:animate-spin')}
                />
                {loading ? 'Đang tải…' : 'Làm mới'}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setHistoryModalOpen(true)}>
              <Clock3 aria-hidden className="size-4" />
              Xem lịch sử
            </Button>
            <Button onClick={() => setCreateOrderNoticeOpen(true)}>
              <Plus aria-hidden className="size-4" />
              Tạo đơn in
            </Button>
          </div>
        </header>

        <div
          className={cn(
            'grid items-start gap-6',
            selectedOrder && '2xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]',
          )}
        >
          <PrintOrdersTable
            orders={orders}
            filteredOrders={filteredOrders}
            selectedOrder={selectedOrder}
            onSelectOrder={(order) => {
              if (isSubmittingRef.current) return;
              setSelectedOrder(order);
              revealDetailBelowTable();
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
