import { useCallback, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { OperationsShell } from '../identity-access/operations-shell';
import type { ManagementSessionSnapshot } from '../identity-access/session';
import { PrintQueueDialog } from './print-queue-dialog';
import { CancelOrderModal, HandoverModal, HistoryModal } from './print-order-modals';
import type { ManagementPrintOrdersGateway } from './print-orders-api';
import { PrintOrdersDetail } from './print-orders-detail';
import { DEMO_MANAGER_SNAPSHOT } from './print-orders-fixtures';
import { usePrintOrderLifecycleMutations } from './print-orders-lifecycle-mutations';
import { usePrintOrderQuoteMutations } from './print-orders-quote-mutations';
import { PrintOrdersTable } from './print-orders-table';
import { formatVietnameseDateTime } from './print-orders-types';
import { PrintPurchasePreview } from './print-purchase-preview';
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

type OrderAction = 'quote' | 'replacement' | 'handover' | 'cancel' | 'history';

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

  const [orderAction, setOrderAction] = useState<OrderAction | null>(null);
  const dismissOrderAction = useCallback(() => setOrderAction(null), []);
  const closeOrderAction = useCallback(() => {
    if (!isSubmittingRef.current) setOrderAction(null);
  }, []);
  const isReplacementProposal = orderAction === 'replacement';

  // Notifications
  const showToast = useCallback((msg: string) => {
    notify.success(msg);
  }, []);

  const showError = useCallback((msg: unknown) => {
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

  const {
    handleApprovePurchase,
    handleStartProduction,
    handleMarkReady,
    handleConfirmHandover,
    handleConfirmCancel,
  } = usePrintOrderLifecycleMutations({
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
    setHandoverModalOpen: dismissOrderAction,
    setCancelModalOpen: dismissOrderAction,
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
    setQuoteDrawerOpen: dismissOrderAction,
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
            <p className="max-w-2xl text-sm text-muted-foreground">
              Theo dõi các mẫu in và tiến độ bàn giao. Đơn in mới chỉ xuất hiện sau khi phụ lục được
              cả hai bên duyệt; mọi điều chỉnh chi phí được thực hiện tại phụ lục.
            </p>
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
        </header>

        <PrintOrdersTable
          orders={orders}
          filteredOrders={filteredOrders}
          onOpenDetails={(order) => {
            if (isSubmittingRef.current) return;
            setOrderAction(null);
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
      </main>

      {selectedOrder ? (
        <PrintQueueDialog
          label="Chi tiết đơn in"
          title="Chi tiết đơn in"
          description={
            <>
              <p className="[overflow-wrap:anywhere]">{selectedOrder.orderId}</p>
              <p>
                Phiên bản {selectedOrder.revision} · Cập nhật{' '}
                {formatVietnameseDateTime(selectedOrder.updatedAt)}
              </p>
            </>
          }
          closeLabel="Đóng chi tiết đơn in"
          size="wide"
          onClose={() => {
            if (!isSubmittingRef.current) setSelectedOrder(null);
          }}
        >
          <PrintOrdersDetail
            selectedOrder={selectedOrder}
            purchasePreview={
              <PrintPurchasePreview
                key={selectedOrder.orderId}
                order={selectedOrder}
                authorize={authorize}
              />
            }
            isSubmitting={isSubmitting}
            onApprovePurchase={() => void handleApprovePurchase()}
            onStartProduction={() => {
              void handleStartProduction();
            }}
            onMarkReady={() => {
              void handleMarkReady();
            }}
            onOpenHandoverModal={() => setOrderAction('handover')}
            onOpenQuoteDrawer={(replacement) =>
              setOrderAction(replacement ? 'replacement' : 'quote')
            }
            onOpenCancelModal={() => setOrderAction('cancel')}
            onOpenHistory={() => setOrderAction('history')}
          />

          {orderAction === 'quote' || isReplacementProposal ? (
            <QuoteDrawer
              key={`${selectedOrder.orderId}-rev${selectedOrder.revision}`}
              order={selectedOrder}
              isReplacementProposal={isReplacementProposal}
              isSubmitting={isSubmitting}
              onClose={closeOrderAction}
              onSubmit={(body) => {
                void handleSubmitQuote(body);
              }}
            />
          ) : null}

          {orderAction === 'handover' ? (
            <HandoverModal
              order={selectedOrder}
              isSubmitting={isSubmitting}
              onClose={closeOrderAction}
              onConfirm={(evidence) => {
                void handleConfirmHandover(evidence);
              }}
            />
          ) : null}

          {orderAction === 'cancel' ? (
            <CancelOrderModal
              order={selectedOrder}
              isSubmitting={isSubmitting}
              onClose={closeOrderAction}
              onConfirm={(reason) => {
                void handleConfirmCancel(reason);
              }}
            />
          ) : null}

          {orderAction === 'history' ? (
            <HistoryModal order={selectedOrder} onClose={closeOrderAction} />
          ) : null}
        </PrintQueueDialog>
      ) : null}
    </OperationsShell>
  );
}
