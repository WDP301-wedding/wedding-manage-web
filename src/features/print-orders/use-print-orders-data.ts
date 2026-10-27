import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ManagementPrintOrdersGateway } from './print-orders-api';
import {
  formatVietnameseDateTime,
  isCommercialRevisionExpired,
  type PrintOrderView,
} from './print-orders-types';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { useRefreshQueue } from '../realtime/refresh-queue';

export interface UsePrintOrdersDataOptions {
  gateway: ManagementPrintOrdersGateway;
  authorize: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  showError: (msg: string) => void;
  showToast: (msg: string) => void;
  isSubmittingRef: React.MutableRefObject<boolean>;
}

export function usePrintOrdersData({
  gateway,
  authorize,
  showError,
  showToast,
  isSubmittingRef,
}: UsePrintOrdersDataOptions) {
  const [orders, setOrders] = useState<readonly PrintOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initiallyLoaded = useRef(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  // Real cursor pagination state
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  // Search & Filter state
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tất cả');
  const [selectedOrder, setSelectedOrder] = useState<PrintOrderView | null>(null);

  // Request race condition & invalidation epoch guard
  const requestEpochRef = useRef(0);

  // Fetch orders with cursor pagination and epoch protection
  const fetchOrders = useCallback(
    async (cursor?: string, silent = false): Promise<boolean> => {
      const epoch = ++requestEpochRef.current;
      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const queryParams = cursor !== undefined ? { cursor, limit: 10 } : { limit: 10 };
        const res = await authorize((token) => gateway.list(token, queryParams));
        if (epoch !== requestEpochRef.current) return false;
        setOrders(res.items);
        setNextCursor(res.nextCursor);
        setLastRefreshed(formatVietnameseDateTime(new Date().toISOString()));
        if (res.items.length > 0) {
          setSelectedOrder((prev) => {
            if (!prev) return res.items[0] ?? null;
            return res.items.find((item) => item.orderId === prev.orderId) ?? res.items[0] ?? null;
          });
        } else {
          setSelectedOrder(null);
        }
        return true;
      } catch (err) {
        if (epoch !== requestEpochRef.current) return false;
        const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách đơn in.';
        setLoadError(msg);
        showError(msg);
        return false;
      } finally {
        if (epoch === requestEpochRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [authorize, gateway, showError],
  );

  const refresh = useRefreshQueue(async () => {
    await fetchOrders(currentCursor, initiallyLoaded.current);
    initiallyLoaded.current = true;
  }, fetchOrders);

  useEffect(() => {
    void refresh.run();
    return () => {
      requestEpochRef.current++;
    };
  }, [refresh]);

  useRealtimeSubscription({
    onEvent: (event) => {
      if (event.type.startsWith('print.') || event.scope.entityType === 'print_order') {
        refresh.schedule();
      }
    },
    onResync: () => {
      refresh.schedule();
    },
  });

  const resetDataState = useCallback(() => {
    requestEpochRef.current++;
    setOrders([]);
    setSelectedOrder(null);
    setCursorHistory([]);
    setNextCursor(null);
    setCurrentCursor(undefined);
  }, []);

  const handleManualRefresh = async () => {
    const success = await fetchOrders(currentCursor);
    if (success) {
      showToast('Đã làm mới dữ liệu từ máy chủ.');
    }
  };

  const handleNextPage = async () => {
    if (!nextCursor || isSubmittingRef.current || loading) return;
    const prevCursor = currentCursor;
    const success = await fetchOrders(nextCursor);
    if (success) {
      setCursorHistory((prev) => [...prev, prevCursor ?? '']);
      setCurrentCursor(nextCursor);
    }
  };

  const handlePrevPage = async () => {
    if (cursorHistory.length === 0 || isSubmittingRef.current || loading) return;
    const history = [...cursorHistory];
    const prevCursor = history.pop();
    const targetCursor = prevCursor === '' ? undefined : prevCursor;
    const success = await fetchOrders(targetCursor);
    if (success) {
      setCursorHistory(history);
      setCurrentCursor(targetCursor);
    }
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    if (currentCursor !== undefined) {
      setCurrentCursor(undefined);
      setCursorHistory([]);
      void fetchOrders(undefined);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesQuery =
        !query ||
        `${order.orderId} ${order.bookingId} ${order.displayCouple ?? ''} ${order.displayHall ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'Chờ sản xuất') {
        matchesStatus = order.status === 'APPROVED' && order.pendingReplacementProposal === null;
      } else if (statusFilter === 'Đang sản xuất') {
        matchesStatus = order.status === 'IN_PRODUCTION';
      } else if (statusFilter === 'Sẵn sàng') {
        matchesStatus = order.status === 'READY_FOR_HANDOVER';
      }

      return matchesQuery && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  const countAll = orders.length;
  const countApproved = orders.filter(
    (o) => o.status === 'APPROVED' && o.pendingReplacementProposal === null,
  ).length;
  const countInProduction = orders.filter((o) => o.status === 'IN_PRODUCTION').length;
  const countReady = orders.filter((o) => o.status === 'READY_FOR_HANDOVER').length;
  const countBlockedProposal = orders.filter(
    (o) => o.status === 'APPROVED' && o.pendingReplacementProposal !== null,
  ).length;
  const countExpired = orders.filter(
    (o) => o.status === 'QUOTED' && isCommercialRevisionExpired(o.currentCommercialRevision),
  ).length;

  return {
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
  };
}
