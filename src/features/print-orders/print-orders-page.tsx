'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  createIdentityApi,
  ManagementIdentitySession,
  type ManagementSessionSnapshot,
} from '../identity-access/session';
import { useFocusTrap } from './focus-trap';
import {
  ArchiveIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  Clock3Icon,
  FileTextIcon,
  PackageCheckIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from './icons';
import {
  createManagementPrintOrdersGateway,
  type ManagementPrintOrdersGateway,
} from './print-orders-api';
import { createFixturePrintOrdersGateway, DEMO_PRINT_ORDERS } from './print-orders-fixtures';
import {
  canCancelOrder,
  canMarkHandedOver,
  canMarkReady,
  canProposeReplacement,
  canQuoteOrder,
  canStartProduction,
  computeQuotedLineTotal,
  deriveCommercialStatus,
  deriveProductionStatus,
  formatVietnameseDate,
  formatVietnameseDateTime,
  formatVnd,
  generateIdempotencyKey,
  isCommercialRevisionExpired,
  isOrderApprovedOrBeyond,
  isValidFutureHandoverDate,
  MAX_LINE_UNIT_PRICE_VND,
  MIN_LINE_UNIT_PRICE_VND,
  toVietnamBusinessIsoString,
  type CancelOrderBody,
  type PrintOrderView,
  type QuotePrintOrderBody,
} from './print-orders-types';
import '../../../app/print-orders/print-orders.css';

const defaultIdentity = new ManagementIdentitySession(createIdentityApi());
const defaultGateway = createManagementPrintOrdersGateway();

export const DEMO_MANAGER_SNAPSHOT: ManagementSessionSnapshot = {
  status: 'authenticated',
  actor: {
    accountId: 'demo-manager-account',
    displayEmail: 'quanly.demo@wedding-estate.vn',
    roles: ['MANAGER'],
    sessionId: 'demo-manager-session',
  },
  presentation: 'manager',
  denial: null,
};

export interface ManagementPrintOrdersPageProps {
  session?: ManagementIdentitySession;
  gateway?: ManagementPrintOrdersGateway;
  initialOrders?: readonly PrintOrderView[];
  useFixtures?: boolean;
}

export function ManagementPrintOrdersPage({
  session = defaultIdentity,
  gateway = defaultGateway,
  initialOrders,
  useFixtures = false,
}: ManagementPrintOrdersPageProps) {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(
    useFixtures ? DEMO_MANAGER_SNAPSHOT : null,
  );

  useEffect(() => {
    if (useFixtures) {
      return;
    }
    let active = true;
    void session.restore().then((res) => {
      if (active) setSnapshot(res);
    });
    return () => {
      active = false;
    };
  }, [session, useFixtures]);

  const resolvedGateway = useMemo(() => {
    if (useFixtures || initialOrders !== undefined) {
      return createFixturePrintOrdersGateway(initialOrders ?? DEMO_PRINT_ORDERS);
    }
    return gateway;
  }, [useFixtures, initialOrders, gateway]);

  const handleAuthorize = useCallback(
    async <T,>(op: (token: string) => Promise<T>): Promise<T> => {
      if (useFixtures) {
        return op('demo-mock-token');
      }
      try {
        return await session.authorize(op);
      } catch (err) {
        setSnapshot(session.snapshot());
        throw err;
      }
    },
    [session, useFixtures],
  );

  const handleLogout = useCallback(async () => {
    try {
      if (!useFixtures) {
        await session.logout();
      }
    } finally {
      setSnapshot({ status: 'anonymous', denial: null });
    }
  }, [session, useFixtures]);

  if (snapshot === null && !useFixtures) {
    return (
      <div className="v0-shell">
        <main className="v0-content" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p role="status">Đang xác thực quyền truy cập quản lý…</p>
        </main>
      </div>
    );
  }

  // Auth gate 1: Anonymous users
  if (!useFixtures && snapshot?.status === 'anonymous') {
    return (
      <div className="v0-shell">
        <main className="v0-content" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <h1>Yêu cầu đăng nhập</h1>
          <p role="alert">
            Bạn cần đăng nhập bằng tài khoản Quản lý (Manager) để truy cập phân hệ in ấn thiệp cưới.
          </p>
          <Link href="/" className="v0-button v0-button-primary" style={{ marginTop: '16px' }}>
            Đăng nhập ngay
          </Link>
        </main>
      </div>
    );
  }

  // Auth gate 2: Non-manager authenticated users (Staff, Couple, etc.)
  const isManager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';
  if (!useFixtures && snapshot?.status === 'authenticated' && !isManager) {
    const roleLabel =
      snapshot.presentation === 'staff' ? 'Nhân viên vận hành (Staff)' : 'không được phân quyền';
    return (
      <div className="v0-shell">
        <main className="v0-content" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <h1>Truy cập bị từ chối</h1>
          <p role="alert">
            Tài khoản {snapshot.actor.displayEmail} thuộc vai trò {roleLabel}. Phân hệ Quản lý Đơn
            in ấn yêu cầu quyền Quản lý (Manager).
          </p>
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            <Link href="/" className="v0-button v0-button-secondary">
              Về trang chủ
            </Link>
            <button
              type="button"
              className="v0-button v0-button-primary"
              onClick={() => {
                void handleLogout();
              }}
            >
              Đăng xuất
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PrintOrdersWorkspace
      snapshot={snapshot}
      gateway={resolvedGateway}
      authorize={handleAuthorize}
      isFixtureMode={useFixtures || initialOrders !== undefined}
      onLogout={() => {
        void handleLogout();
      }}
    />
  );
}

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

  const [orders, setOrders] = useState<readonly PrintOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  // Real cursor pagination state
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  // Search & Filter state
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tất cả');
  const [selectedOrder, setSelectedOrder] = useState<PrintOrderView | null>(null);

  // Operation submitting guards (synchronous ref + React state)
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request race condition & invalidation epoch guard
  const requestEpochRef = useRef(0);

  // Modals & Drawers
  const [quoteDrawerOpen, setQuoteDrawerOpen] = useState(false);
  const [isReplacementProposal, setIsReplacementProposal] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [createOrderNoticeOpen, setCreateOrderNoticeOpen] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage((cur) => (cur === msg ? null : cur));
    }, 4500);
  }, []);

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

  // Initial load
  useEffect(() => {
    let active = true;
    const epoch = ++requestEpochRef.current;
    void authorize((token) => gateway.list(token, { limit: 10 }))
      .then((res) => {
        if (!active || epoch !== requestEpochRef.current) return;
        setOrders(res.items);
        setNextCursor(res.nextCursor);
        setLastRefreshed(formatVietnameseDateTime(new Date().toISOString()));
        if (res.items.length > 0) {
          setSelectedOrder((prev) => prev ?? res.items[0] ?? null);
        } else {
          setSelectedOrder(null);
        }
      })
      .catch((err: unknown) => {
        if (!active || epoch !== requestEpochRef.current) return;
        const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách đơn in.';
        setLoadError(msg);
      })
      .finally(() => {
        if (active && epoch === requestEpochRef.current) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authorize, gateway]);

  // Clean state immediately when logging out with epoch invalidation
  const handleLogout = useCallback(() => {
    requestEpochRef.current++;
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setOrders([]);
    setSelectedOrder(null);
    setCursorHistory([]);
    setNextCursor(null);
    setCurrentCursor(undefined);
    onLogout();
  }, [onLogout]);

  // Refresh action with explicit await before toast
  const handleManualRefresh = async () => {
    const success = await fetchOrders(currentCursor);
    if (success) {
      showToast('Đã làm mới dữ liệu từ máy chủ.');
    }
  };

  // Cursor Pagination Handlers
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

  // Reset pagination when status filter changes
  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    if (currentCursor !== undefined) {
      setCurrentCursor(undefined);
      setCursorHistory([]);
      void fetchOrders(undefined);
    }
  };

  // Client-side filtering of current page items
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

  // Accurate Counter Metrics
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

  // Mutation 1: Start Production
  const handleStartProduction = async () => {
    if (!selectedOrder || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const expectedRev = selectedOrder.revision;
    const orderId = selectedOrder.orderId;
    const epoch = requestEpochRef.current;

    try {
      const fresh = await authorize((token) => gateway.get(token, orderId));
      if (epoch !== requestEpochRef.current) return;

      if (fresh.revision !== expectedRev) {
        showError(
          `Phiên bản đơn in đã thay đổi trên máy chủ (từ Rev ${expectedRev} sang Rev ${fresh.revision}). Vui lòng xem lại nội dung trước khi thực hiện.`,
        );
        setSelectedOrder(fresh);
        setOrders((prev) => prev.map((o) => (o.orderId === fresh.orderId ? fresh : o)));
        return;
      }

      if (!canStartProduction(fresh)) {
        showError('Đơn in không đủ điều kiện bắt đầu sản xuất.');
        setSelectedOrder(fresh);
        return;
      }

      const idempotencyKey = generateIdempotencyKey('start-prod', fresh.orderId, fresh.revision);
      const updated = await authorize((token) =>
        gateway.startProduction(
          token,
          fresh.orderId,
          { expectedRevision: fresh.revision },
          idempotencyKey,
        ),
      );
      if (epoch !== requestEpochRef.current) return;

      showToast(`Đã chuyển đơn ${updated.orderId} sang trạng thái Đang sản xuất`);
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setSelectedOrder(updated);
    } catch (err) {
      if (epoch !== requestEpochRef.current) return;
      if (err instanceof ApiClientError && err.status === 409) {
        showError('Dữ liệu đã thay đổi trên máy chủ (409 conflict)');
        void fetchOrders(currentCursor, true);
      } else if (
        err instanceof ApiClientError &&
        (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR')
      ) {
        showError(
          'Kết quả thao tác chưa xác định do gián đoạn mạng. Đang đối soát lại trạng thái đơn in…',
        );
        try {
          const reconciled = await authorize((token) => gateway.get(token, orderId));
          if (epoch !== requestEpochRef.current) return;
          setSelectedOrder(reconciled);
          setOrders((prev) => prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)));
          if (reconciled.status === 'IN_PRODUCTION') {
            showToast(
              `Đã đối soát thành công: đơn ${reconciled.orderId} đã ở trạng thái Đang sản xuất.`,
            );
          } else {
            showError('Thao tác chưa được ghi nhận trên máy chủ. Bạn có thể thử lại an toàn.');
          }
        } catch {
          showError('Không thể đối soát trạng thái với máy chủ. Vui lòng kiểm tra kết nối mạng.');
        }
      } else {
        showError(err instanceof Error ? err.message : 'Lỗi bắt đầu sản xuất.');
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Mutation 2: Mark Ready
  const handleMarkReady = async () => {
    if (!selectedOrder || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const expectedRev = selectedOrder.revision;
    const orderId = selectedOrder.orderId;
    const epoch = requestEpochRef.current;

    try {
      const fresh = await authorize((token) => gateway.get(token, orderId));
      if (epoch !== requestEpochRef.current) return;

      if (fresh.revision !== expectedRev) {
        showError(
          `Phiên bản đơn in đã thay đổi trên máy chủ (từ Rev ${expectedRev} sang Rev ${fresh.revision}). Vui lòng xem lại nội dung trước khi thực hiện.`,
        );
        setSelectedOrder(fresh);
        setOrders((prev) => prev.map((o) => (o.orderId === fresh.orderId ? fresh : o)));
        return;
      }

      if (!canMarkReady(fresh)) {
        showError('Đơn in không ở trạng thái Đang sản xuất.');
        setSelectedOrder(fresh);
        return;
      }

      const idempotencyKey = generateIdempotencyKey('mark-ready', fresh.orderId, fresh.revision);
      const updated = await authorize((token) =>
        gateway.markReady(
          token,
          fresh.orderId,
          { expectedRevision: fresh.revision },
          idempotencyKey,
        ),
      );
      if (epoch !== requestEpochRef.current) return;

      showToast(`Đơn ${updated.orderId} đã sẵn sàng bàn giao`);
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setSelectedOrder(updated);
    } catch (err) {
      if (epoch !== requestEpochRef.current) return;
      if (err instanceof ApiClientError && err.status === 409) {
        showError('Dữ liệu đã thay đổi trên máy chủ (409 conflict)');
        void fetchOrders(currentCursor, true);
      } else if (
        err instanceof ApiClientError &&
        (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR')
      ) {
        showError(
          'Kết quả thao tác chưa xác định do gián đoạn mạng. Đang đối soát lại trạng thái đơn in…',
        );
        try {
          const reconciled = await authorize((token) => gateway.get(token, orderId));
          if (epoch !== requestEpochRef.current) return;
          setSelectedOrder(reconciled);
          setOrders((prev) => prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)));
          if (reconciled.status === 'READY_FOR_HANDOVER') {
            showToast(
              `Đã đối soát thành công: đơn ${reconciled.orderId} đã ở trạng thái Sẵn sàng bàn giao.`,
            );
          } else {
            showError('Thao tác chưa được ghi nhận trên máy chủ. Bạn có thể thử lại an toàn.');
          }
        } catch {
          showError('Không thể đối soát trạng thái với máy chủ. Vui lòng kiểm tra kết nối mạng.');
        }
      } else {
        showError(err instanceof Error ? err.message : 'Lỗi đánh dấu sẵn sàng.');
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Mutation 3: Confirm Handover
  const handleConfirmHandover = async (evidenceReference: string) => {
    if (!selectedOrder || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const expectedRev = selectedOrder.revision;
    const orderId = selectedOrder.orderId;
    const epoch = requestEpochRef.current;

    try {
      const fresh = await authorize((token) => gateway.get(token, orderId));
      if (epoch !== requestEpochRef.current) return;

      if (fresh.revision !== expectedRev) {
        showError(
          `Phiên bản đơn in đã thay đổi trên máy chủ (từ Rev ${expectedRev} sang Rev ${fresh.revision}). Vui lòng xem lại nội dung trước khi bàn giao.`,
        );
        setSelectedOrder(fresh);
        setOrders((prev) => prev.map((o) => (o.orderId === fresh.orderId ? fresh : o)));
        setHandoverModalOpen(false);
        return;
      }

      if (!canMarkHandedOver(fresh)) {
        showError('Đơn in không ở trạng thái Sẵn sàng bàn giao.');
        setSelectedOrder(fresh);
        setHandoverModalOpen(false);
        return;
      }

      const idempotencyKey = generateIdempotencyKey(
        'handover',
        fresh.orderId,
        fresh.revision,
        evidenceReference.trim(),
      );
      const updated = await authorize((token) =>
        gateway.markHandedOver(
          token,
          fresh.orderId,
          {
            expectedRevision: fresh.revision,
            evidenceReference: evidenceReference.trim(),
          },
          idempotencyKey,
        ),
      );
      if (epoch !== requestEpochRef.current) return;

      showToast(`Đã bàn giao đơn ${updated.orderId} thành công`);
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setSelectedOrder(updated);
      setHandoverModalOpen(false);
    } catch (err) {
      if (epoch !== requestEpochRef.current) return;
      if (err instanceof ApiClientError && err.status === 409) {
        showError('Dữ liệu đã thay đổi trên máy chủ (409 conflict)');
        void fetchOrders(currentCursor, true);
        setHandoverModalOpen(false);
      } else if (
        err instanceof ApiClientError &&
        (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR')
      ) {
        showError(
          'Kết quả thao tác chưa xác định do gián đoạn mạng. Đang đối soát lại trạng thái đơn in…',
        );
        try {
          const reconciled = await authorize((token) => gateway.get(token, orderId));
          if (epoch !== requestEpochRef.current) return;
          setSelectedOrder(reconciled);
          setOrders((prev) => prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)));
          if (reconciled.status === 'HANDED_OVER') {
            showToast(`Đã đối soát thành công: đơn ${reconciled.orderId} đã được bàn giao.`);
            setHandoverModalOpen(false);
          } else {
            showError(
              'Thao tác bàn giao chưa được ghi nhận trên máy chủ. Bạn có thể thử lại an toàn.',
            );
          }
        } catch {
          showError('Không thể đối soát trạng thái với máy chủ. Vui lòng kiểm tra kết nối mạng.');
        }
      } else {
        showError(err instanceof Error ? err.message : 'Lỗi bàn giao đơn in.');
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Mutation 4: Cancel Order
  const handleConfirmCancel = async (reason?: string) => {
    if (!selectedOrder || isSubmittingRef.current) return;
    const isApproved = selectedOrder.status === 'APPROVED';
    if (isApproved && (!reason || reason.trim().length === 0)) {
      showError('Lý do hủy là bắt buộc đối với đơn in đã được phê duyệt.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const expectedRev = selectedOrder.revision;
    const orderId = selectedOrder.orderId;
    const epoch = requestEpochRef.current;

    try {
      const fresh = await authorize((token) => gateway.get(token, orderId));
      if (epoch !== requestEpochRef.current) return;

      if (fresh.revision !== expectedRev) {
        showError(
          `Phiên bản đơn in đã thay đổi trên máy chủ (từ Rev ${expectedRev} sang Rev ${fresh.revision}). Vui lòng xem lại nội dung trước khi hủy.`,
        );
        setSelectedOrder(fresh);
        setOrders((prev) => prev.map((o) => (o.orderId === fresh.orderId ? fresh : o)));
        setCancelModalOpen(false);
        return;
      }

      if (!canCancelOrder(fresh)) {
        showError('Đơn in ở trạng thái không thể hủy.');
        setSelectedOrder(fresh);
        setCancelModalOpen(false);
        return;
      }

      const idempotencyKey = generateIdempotencyKey(
        'cancel',
        fresh.orderId,
        fresh.revision,
        reason?.trim() ?? '',
      );
      const cancelBody: CancelOrderBody = reason?.trim()
        ? { expectedRevision: fresh.revision, reason: reason.trim() }
        : { expectedRevision: fresh.revision };

      const updated = await authorize((token) =>
        gateway.cancel(token, fresh.orderId, cancelBody, idempotencyKey),
      );
      if (epoch !== requestEpochRef.current) return;

      showToast(`Đã hủy đơn ${updated.orderId}.`);
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setSelectedOrder(updated);
      setCancelModalOpen(false);
    } catch (err) {
      if (epoch !== requestEpochRef.current) return;
      if (err instanceof ApiClientError && err.code === 'PRINT_CANCELLATION_NOT_ALLOWED') {
        showError(
          'Không thể hủy đơn in: Cặp đôi chưa gửi/xác nhận ý định hủy từ ứng dụng hoặc đơn in đang trong tiến trình sản xuất.',
        );
      } else if (err instanceof ApiClientError && err.status === 409) {
        showError('Dữ liệu đã thay đổi trên máy chủ (409 conflict)');
        void fetchOrders(currentCursor, true);
        setCancelModalOpen(false);
      } else if (
        err instanceof ApiClientError &&
        (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR')
      ) {
        showError('Kết quả hủy đơn chưa xác định do gián đoạn mạng. Đang đối soát lại từ máy chủ…');
        try {
          const reconciled = await authorize((token) => gateway.get(token, orderId));
          if (epoch !== requestEpochRef.current) return;
          setSelectedOrder(reconciled);
          setOrders((prev) => prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)));
          if (reconciled.status === 'CANCELLED') {
            showToast(
              `Đã đối soát thành công: đơn ${reconciled.orderId} đã được hủy trên máy chủ.`,
            );
            setCancelModalOpen(false);
          } else {
            showError('Thao tác hủy chưa được ghi nhận trên máy chủ. Bạn có thể thử lại an toàn.');
          }
        } catch {
          showError('Không thể đối soát trạng thái với máy chủ. Vui lòng kiểm tra kết nối mạng.');
        }
      } else {
        showError(err instanceof Error ? err.message : 'Lỗi hủy đơn in.');
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Mutation 5: Submit Quote or Replacement Proposal
  const handleSubmitQuote = async (body: QuotePrintOrderBody) => {
    if (!selectedOrder || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const expectedRev = body.expectedRevision;
    const orderId = selectedOrder.orderId;
    const epoch = requestEpochRef.current;

    try {
      const fresh = await authorize((token) => gateway.get(token, orderId));
      if (epoch !== requestEpochRef.current) return;

      if (fresh.revision !== expectedRev) {
        setQuoteDrawerOpen(false);
        showError(
          `Phiên bản đơn in đã thay đổi trên máy chủ (từ Rev ${expectedRev} sang Rev ${fresh.revision}). Vui lòng mở lại báo giá để kiểm tra và xác nhận lại.`,
        );
        setSelectedOrder(fresh);
        setOrders((prev) => prev.map((o) => (o.orderId === fresh.orderId ? fresh : o)));
        return;
      }

      let updated: PrintOrderView;
      if (isReplacementProposal) {
        const idempotencyKey = generateIdempotencyKey(
          'prop',
          selectedOrder.orderId,
          body.expectedRevision,
          { lines: body.lines, estimatedHandoverAt: body.estimatedHandoverAt },
        );
        updated = await authorize((token) =>
          gateway.proposeReplacement(token, selectedOrder.orderId, body, idempotencyKey),
        );
        if (epoch !== requestEpochRef.current) return;
        showToast(`Đã gửi đề xuất thay thế cho đơn ${updated.orderId} · Chờ Couple duyệt`);
      } else {
        const idempotencyKey = generateIdempotencyKey(
          'quote',
          selectedOrder.orderId,
          body.expectedRevision,
          { lines: body.lines, estimatedHandoverAt: body.estimatedHandoverAt },
        );
        updated = await authorize((token) =>
          gateway.quote(token, selectedOrder.orderId, body, idempotencyKey),
        );
        if (epoch !== requestEpochRef.current) return;
        const nextRev =
          (selectedOrder.currentCommercialRevision?.revisionNumber ?? selectedOrder.revision) + 1;
        showToast(`Đã tạo báo giá Rev ${nextRev}`);
      }

      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setSelectedOrder(updated);
      setQuoteDrawerOpen(false);
    } catch (err) {
      if (epoch !== requestEpochRef.current) return;
      if (err instanceof ApiClientError && err.status === 409) {
        setQuoteDrawerOpen(false);
        showError(
          'Báo giá thất bại do phiên bản đơn in đã thay đổi trên máy chủ (409 conflict). Hệ thống đã làm mới dữ liệu mới nhất.',
        );
        void fetchOrders(currentCursor, true);
      } else if (
        err instanceof ApiClientError &&
        (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR')
      ) {
        showError(
          'Kết quả gửi báo giá chưa xác định do gián đoạn mạng. Đang đối soát lại từ máy chủ…',
        );
        try {
          const reconciled = await authorize((token) => gateway.get(token, orderId));
          if (epoch !== requestEpochRef.current) return;
          setSelectedOrder(reconciled);
          setOrders((prev) => prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)));
          setQuoteDrawerOpen(false);
          showToast('Đã đối soát xong dữ liệu từ máy chủ.');
        } catch {
          showError('Không thể đối soát trạng thái với máy chủ. Vui lòng kiểm tra kết nối mạng.');
        }
      } else {
        showError(err instanceof Error ? err.message : 'Không thể gửi báo giá.');
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

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

          {/* Toast / Error alerts */}
          {toastMessage ? (
            <div className="v0-toast-banner" role="status">
              <CheckIcon width={16} height={16} />
              <span>{toastMessage}</span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="v0-alert-banner v0-alert-danger" role="alert">
              <CircleAlertIcon width={16} height={16} />
              <span>{errorMessage}</span>
            </div>
          ) : null}

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
                onClick={() => handleFilterChange('Tất cả')}
                type="button"
              >
                Tất cả <span className="v0-tab-count">{countAll}</span>
              </button>
              <button
                className={`v0-tab ${statusFilter === 'Chờ sản xuất' ? 'tab-active' : ''}`}
                aria-pressed={statusFilter === 'Chờ sản xuất'}
                onClick={() => handleFilterChange('Chờ sản xuất')}
                type="button"
              >
                Chờ sản xuất <span className="v0-tab-count">{countApproved}</span>
              </button>
              <button
                className={`v0-tab ${statusFilter === 'Đang sản xuất' ? 'tab-active' : ''}`}
                aria-pressed={statusFilter === 'Đang sản xuất'}
                onClick={() => handleFilterChange('Đang sản xuất')}
                type="button"
              >
                Đang sản xuất <span className="v0-tab-count">{countInProduction}</span>
              </button>
              <button
                className={`v0-tab ${statusFilter === 'Sẵn sàng' ? 'tab-active' : ''}`}
                aria-pressed={statusFilter === 'Sẵn sàng'}
                onClick={() => handleFilterChange('Sẵn sàng')}
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
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Tìm kiếm đơn in"
              />
            </div>
          </div>

          {/* Filter notice */}
          {query ? (
            <p className="v0-filter-note">
              Hiển thị {filteredOrders.length} / {orders.length} đơn trên trang hiện tại khớp từ
              khóa &quot;{query}&quot;.
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
                  style={{ marginTop: '8px' }}
                  onClick={() => {
                    void handleManualRefresh();
                  }}
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
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                        Đang tải danh sách đơn in từ máy chủ…
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
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
                          onClick={() => {
                            if (isSubmittingRef.current) return;
                            setSelectedOrder(order);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (isSubmittingRef.current) return;
                              setSelectedOrder(order);
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
                            <small className="v0-table-sub">
                              {order.lines.length} dòng thiết kế
                            </small>
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
                  onClick={() => {
                    void handlePrevPage();
                  }}
                  disabled={cursorHistory.length === 0 || loading || isSubmitting}
                >
                  <ChevronLeftIcon width={16} height={16} />
                  <span>Trang trước</span>
                </button>
                <button
                  type="button"
                  className="v0-button v0-button-secondary"
                  onClick={() => {
                    void handleNextPage();
                  }}
                  disabled={!nextCursor || loading || isSubmitting}
                >
                  <span>Trang sau</span>
                  <ChevronRightIcon width={16} height={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Details Section for Selected Order */}
          {selectedOrder ? (
            <div className="v0-selected-details" style={{ marginTop: '36px' }}>
              <div className="v0-details-header">
                <div>
                  <span className="v0-heading-kicker">Chi tiết đơn in ấn được chọn</span>
                  <h2>
                    Đơn in: {selectedOrder.orderId}{' '}
                    <span className="v0-sub-id">(Hợp đồng: {selectedOrder.bookingId})</span>
                  </h2>
                </div>
                <div className="v0-details-actions">
                  {canStartProduction(selectedOrder) ? (
                    <button
                      type="button"
                      className="v0-button v0-button-primary"
                      onClick={() => {
                        void handleStartProduction();
                      }}
                      disabled={isSubmitting}
                    >
                      <PackageCheckIcon width={16} height={16} />
                      <span>Bắt đầu sản xuất</span>
                    </button>
                  ) : null}

                  {canMarkReady(selectedOrder) ? (
                    <button
                      type="button"
                      className="v0-button v0-button-primary"
                      onClick={() => {
                        void handleMarkReady();
                      }}
                      disabled={isSubmitting}
                    >
                      <CheckIcon width={16} height={16} />
                      <span>Sẵn sàng bàn giao</span>
                    </button>
                  ) : null}

                  {canMarkHandedOver(selectedOrder) ? (
                    <button
                      type="button"
                      className="v0-button v0-button-primary"
                      onClick={() => setHandoverModalOpen(true)}
                      disabled={isSubmitting}
                    >
                      <ArchiveIcon width={16} height={16} />
                      <span>Bàn giao đơn in</span>
                    </button>
                  ) : null}

                  {canQuoteOrder(selectedOrder) ? (
                    <button
                      type="button"
                      className="v0-button v0-button-secondary"
                      onClick={() => {
                        setIsReplacementProposal(false);
                        setQuoteDrawerOpen(true);
                      }}
                      disabled={isSubmitting}
                    >
                      <span>
                        {selectedOrder.status === 'REQUESTED' ? 'Lập báo giá' : 'Gửi báo giá mới'}
                      </span>
                    </button>
                  ) : null}

                  {canProposeReplacement(selectedOrder) ? (
                    <button
                      type="button"
                      className="v0-button v0-button-secondary"
                      onClick={() => {
                        setIsReplacementProposal(true);
                        setQuoteDrawerOpen(true);
                      }}
                      disabled={isSubmitting}
                    >
                      <span>Đề xuất thay thế</span>
                    </button>
                  ) : null}

                  {canCancelOrder(selectedOrder) ? (
                    <button
                      type="button"
                      className="v0-button v0-button-danger"
                      onClick={() => setCancelModalOpen(true)}
                      disabled={isSubmitting}
                      title="Hủy đơn in"
                    >
                      <Trash2Icon width={16} height={16} />
                      <span>Hủy đơn in</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Three Detail Cards */}
              <div className="v0-detail-grid">
                {/* Card 1: Multi-line Design Specs */}
                <div className="v0-detail-card">
                  <div className="v0-card-head">
                    <FileTextIcon width={18} height={18} />
                    <h3>Dòng thiết kế đã chốt</h3>
                    <span className="v0-badge">{selectedOrder.lines.length} dòng</span>
                  </div>

                  {/* Render All Lines */}
                  <div className="v0-lines-list">
                    {selectedOrder.lines.map((line, idx) => {
                      const quotedLine = selectedOrder.currentCommercialRevision?.lines.find(
                        (ql) => ql.lineId === line.lineId,
                      );
                      return (
                        <div key={line.lineId} className="v0-line-item-box">
                          <div className="v0-line-item-header">
                            <strong>
                              #{idx + 1}: {line.displayVariant ?? `Bản in ${line.designId}`}
                            </strong>
                            <span className="v0-line-qty-badge">{line.quantity} bản in</span>
                          </div>
                          <div className="v0-line-item-meta">
                            <span>
                              Mã thiết kế: <code>{line.designId}</code>
                            </span>
                            <span>
                              Bản in (Rev):{' '}
                              <code>{line.printableRevisionId ?? 'Chưa gán phiên bản in ấn'}</code>
                            </span>
                            {quotedLine ? (
                              <span>
                                Đơn giá: {formatVnd(quotedLine.unitPriceVnd)}/bản (
                                {formatVnd(quotedLine.lineTotalVnd)})
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Neutral Digital Preview Placeholder */}
                  <div className="v0-design-preview-container">
                    <div className="v0-design-preview-frame">
                      <div className="v0-design-preview-icon" aria-hidden="true">
                        <FileTextIcon width={24} height={24} />
                      </div>
                      <div className="v0-design-preview-title">
                        Chưa có bản xem trước kỹ thuật số
                      </div>
                      <div className="v0-design-preview-caption">
                        Mã thiết kế: {selectedOrder.lines[0]?.designId ?? 'Chưa xác định'} · Phiên
                        bản in:{' '}
                        {selectedOrder.lines[0]?.printableRevisionId ?? 'Chưa gán phiên bản in ấn'}
                      </div>
                      <small className="v0-design-preview-note">
                        Bản vẽ in ấn số hóa sẽ được đồng bộ khi studio thiệp cưới xuất bản bản in
                        chính thức.
                      </small>
                    </div>
                  </div>
                </div>

                {/* Card 2: Commercial Terms & Status */}
                <div className="v0-detail-card">
                  <div className="v0-card-head">
                    <Clock3Icon width={18} height={18} />
                    <h3>Tóm tắt thương mại</h3>
                  </div>

                  <dl className="v0-spec-list">
                    <div>
                      <dt>Tổng số lượng</dt>
                      <dd>
                        <strong>
                          {selectedOrder.lines.reduce((s, l) => s + l.quantity, 0)} bản in
                        </strong>
                      </dd>
                    </div>

                    <div>
                      <dt>
                        {isOrderApprovedOrBeyond(selectedOrder.status)
                          ? 'Giá đã chấp thuận'
                          : selectedOrder.status === 'QUOTED'
                            ? 'Giá chào báo giá (Chờ duyệt)'
                            : selectedOrder.status === 'CANCELLED'
                              ? 'Giá thương mại trước khi hủy'
                              : 'Giá thương mại'}
                      </dt>
                      <dd>
                        {selectedOrder.currentCommercialRevision ? (
                          <strong className="v0-price-highlight">
                            {formatVnd(selectedOrder.currentCommercialRevision.orderTotalVnd)}
                          </strong>
                        ) : (
                          <span className="text-muted">Không có dữ liệu thương mại</span>
                        )}
                      </dd>
                    </div>

                    {selectedOrder.currentCommercialRevision ? (
                      <div>
                        <dt>
                          {isOrderApprovedOrBeyond(selectedOrder.status)
                            ? 'Thời hạn báo giá gốc'
                            : 'Hạn chót báo giá (7 ngày)'}
                        </dt>
                        <dd>
                          {formatVietnameseDate(selectedOrder.currentCommercialRevision.expiresAt)}
                          {selectedOrder.status === 'QUOTED' &&
                          isCommercialRevisionExpired(selectedOrder.currentCommercialRevision) ? (
                            <span className="text-danger" style={{ display: 'block' }}>
                              (Báo giá đã hết hạn)
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}

                    {/* Pending Replacement Proposal Banner if present */}
                    {selectedOrder.pendingReplacementProposal ? (
                      <div className="v0-proposal-block">
                        <dt>Đề xuất thay thế đang chờ Couple duyệt</dt>
                        <dd>
                          <strong>
                            {formatVnd(selectedOrder.pendingReplacementProposal.orderTotalVnd)}
                          </strong>
                          <span
                            className="text-amber"
                            style={{ display: 'block', fontSize: '12px' }}
                          >
                            Hạn chót:{' '}
                            {formatVietnameseDate(
                              selectedOrder.pendingReplacementProposal.expiresAt,
                            )}{' '}
                            · Dự kiến bàn giao:{' '}
                            {formatVietnameseDate(
                              selectedOrder.pendingReplacementProposal.estimatedHandoverAt,
                            )}
                          </span>
                          <span
                            className="text-amber"
                            style={{ display: 'block', fontSize: '12px', marginTop: '2px' }}
                          >
                            Chờ Couple phản hồi · Sản xuất đang bị tạm dừng. Quá trình sản xuất bị
                            chặn cho đến khi Couple phê duyệt.
                          </span>
                          <div style={{ marginTop: '8px', fontSize: '11px' }}>
                            {selectedOrder.pendingReplacementProposal.lines.map((pLine, pIdx) => {
                              const acceptedLine =
                                selectedOrder.currentCommercialRevision?.lines.find(
                                  (al) => al.lineId === pLine.lineId,
                                );
                              return (
                                <div
                                  key={pLine.lineId}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '2px 0',
                                  }}
                                >
                                  <span>
                                    #{pIdx + 1}: {formatVnd(acceptedLine?.unitPriceVnd ?? 0)} ➔{' '}
                                    <strong>{formatVnd(pLine.unitPriceVnd)}</strong>
                                  </span>
                                  <span>Tổng: {formatVnd(pLine.lineTotalVnd)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </dd>
                      </div>
                    ) : null}

                    <div>
                      <dt>Cặp đôi</dt>
                      <dd>{selectedOrder.displayCouple ?? 'Chưa gán thông tin'}</dd>
                    </div>

                    <div>
                      <dt>Ngày tiệc</dt>
                      <dd>{selectedOrder.displayEventDate ?? 'Chưa có thông tin ngày tiệc'}</dd>
                    </div>

                    <div>
                      <dt>Sảnh tiệc</dt>
                      <dd>{selectedOrder.displayHall ?? 'Chưa gán thông tin'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Card 3: Authoritative Timeline */}
                <div className="v0-detail-card v0-timeline-card">
                  <div className="v0-card-head">
                    <Clock3Icon width={18} height={18} />
                    <h3>Dòng thời gian đơn in</h3>
                  </div>

                  <ol className="v0-timeline">
                    {/* Step 1: Requested */}
                    <li className="v0-step step-done">
                      <div className="v0-step-marker" />
                      <div className="v0-step-body">
                        <strong>Yêu cầu đặt in</strong>
                        <span className="v0-step-date">
                          {formatVietnameseDateTime(selectedOrder.createdAt)}
                        </span>
                        <p>Couple đã khởi tạo yêu cầu in ấn từ ứng dụng.</p>
                      </div>
                    </li>

                    {/* Step 2: Quotation Issued */}
                    <li
                      className={`v0-step ${
                        selectedOrder.currentCommercialRevision !== null
                          ? 'step-done'
                          : 'step-current'
                      }`}
                    >
                      <div className="v0-step-marker" />
                      <div className="v0-step-body">
                        <strong>Báo giá thương mại</strong>
                        <span className="v0-step-date">
                          {selectedOrder.currentCommercialRevision
                            ? formatVietnameseDateTime(
                                selectedOrder.currentCommercialRevision.createdAt,
                              )
                            : 'Chờ Quản lý gửi báo giá'}
                        </span>
                        <p>
                          {selectedOrder.currentCommercialRevision
                            ? `Revision ${selectedOrder.currentCommercialRevision.revisionNumber} (${formatVnd(selectedOrder.currentCommercialRevision.orderTotalVnd)})`
                            : 'Đang chờ lập báo giá.'}
                        </p>
                      </div>
                    </li>

                    {/* Step 3: Approval or In Production */}
                    <li
                      className={`v0-step ${
                        isOrderApprovedOrBeyond(selectedOrder.status)
                          ? 'step-done'
                          : selectedOrder.status === 'CANCELLED'
                            ? 'step-cancelled'
                            : 'step-pending'
                      }`}
                    >
                      <div className="v0-step-marker" />
                      <div className="v0-step-body">
                        <strong>
                          {selectedOrder.status === 'CANCELLED'
                            ? 'Đơn đã hủy'
                            : 'Couple phê duyệt & Sản xuất'}
                        </strong>
                        <span className="v0-step-date">
                          {selectedOrder.status === 'CANCELLED'
                            ? 'Đã kết thúc'
                            : selectedOrder.status === 'IN_PRODUCTION' ||
                                selectedOrder.status === 'READY_FOR_HANDOVER' ||
                                selectedOrder.status === 'HANDED_OVER'
                              ? 'Đang/đã hoàn tất sản xuất'
                              : isOrderApprovedOrBeyond(selectedOrder.status)
                                ? 'Đã duyệt · Chờ bắt đầu sản xuất'
                                : 'Chưa diễn ra'}
                        </span>
                        <p>
                          {selectedOrder.status === 'CANCELLED'
                            ? 'Đơn in đã hủy, không thể tiếp tục sản xuất.'
                            : isOrderApprovedOrBeyond(selectedOrder.status)
                              ? 'Couple đã chấp thuận điều khoản thương mại.'
                              : 'Chờ Couple xem xét báo giá trên ứng dụng.'}
                        </p>
                      </div>
                    </li>

                    {/* Step 4: Handover */}
                    <li
                      className={`v0-step ${
                        selectedOrder.status === 'HANDED_OVER'
                          ? 'step-done'
                          : selectedOrder.status === 'READY_FOR_HANDOVER'
                            ? 'step-current'
                            : 'step-pending'
                      }`}
                    >
                      <div className="v0-step-marker" />
                      <div className="v0-step-body">
                        <strong>Bàn giao tại nhà hàng</strong>
                        <span className="v0-step-date">
                          {selectedOrder.handedOverAt
                            ? formatVietnameseDateTime(selectedOrder.handedOverAt)
                            : selectedOrder.status === 'READY_FOR_HANDOVER'
                              ? 'Sẵn sàng giao nhận'
                              : 'Chưa khả dụng'}
                        </span>
                        <p>
                          {selectedOrder.handedOverAt
                            ? `Đã bàn giao · Mã chứng từ: ${selectedOrder.evidenceReference ?? 'N/A'}`
                            : selectedOrder.status === 'READY_FOR_HANDOVER'
                              ? 'Ấn phẩm đã xong, chờ xác nhận bàn giao tại kho.'
                              : 'Chỉ khả dụng sau khi hoàn thành sản xuất.'}
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
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

// -----------------------------------------------------------------------------
// Component: Quote Drawer with strict price validation and focus trap
// -----------------------------------------------------------------------------
interface QuoteDrawerProps {
  order: PrintOrderView;
  isReplacementProposal: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (body: QuotePrintOrderBody) => void;
}

function QuoteDrawer({
  order,
  isReplacementProposal,
  isSubmitting,
  onClose,
  onSubmit,
}: QuoteDrawerProps) {
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    order.lines.forEach((l) => {
      const existing = order.currentCommercialRevision?.lines.find((ql) => ql.lineId === l.lineId);
      map[l.lineId] = existing?.unitPriceVnd ?? 85000;
    });
    return map;
  });

  const [rawInputs, setRawInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    order.lines.forEach((l) => {
      const existing = order.currentCommercialRevision?.lines.find((ql) => ql.lineId === l.lineId);
      map[l.lineId] = String(existing?.unitPriceVnd ?? 85000);
    });
    return map;
  });

  const [handoverDate, setHandoverDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0] ?? '';
  });

  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [dateError, setDateError] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  const handlePriceChange = (lineId: string, valStr: string) => {
    setRawInputs((prev) => ({ ...prev, [lineId]: valStr }));

    // Reject negative numbers or decimals
    if (valStr.includes('-')) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Đơn giá không được là số âm.',
      }));
      return;
    }
    if (valStr.includes('.') || valStr.includes(',')) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Đơn giá phải là số nguyên dương VND, không chứa phần thập phân.',
      }));
      return;
    }

    const trimmed = valStr.trim();
    if (trimmed === '') {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Vui lòng nhập đơn giá.',
      }));
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Đơn giá chỉ được chứa các chữ số.',
      }));
      return;
    }

    const num = parseInt(trimmed, 10);
    if (Number.isNaN(num) || num < MIN_LINE_UNIT_PRICE_VND) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: `Đơn giá tối thiểu là ${MIN_LINE_UNIT_PRICE_VND} ₫.`,
      }));
    } else if (num > MAX_LINE_UNIT_PRICE_VND) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: `Đơn giá không được vượt quá ${formatVnd(MAX_LINE_UNIT_PRICE_VND)}.`,
      }));
    } else {
      setPriceErrors((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      setUnitPrices((prev) => ({ ...prev, [lineId]: num }));
    }
  };

  const handleDateChange = (valStr: string) => {
    setHandoverDate(valStr);
    if (!isValidFutureHandoverDate(valStr)) {
      setDateError('Ngày dự kiến bàn giao phải là ngày trong tương lai (tối thiểu từ ngày mai).');
    } else {
      setDateError(null);
    }
  };

  const calculatedTotal = useMemo(() => {
    return order.lines.reduce((sum, l) => {
      const price = unitPrices[l.lineId] ?? 0;
      return sum + computeQuotedLineTotal(l.quantity, price);
    }, 0);
  }, [order.lines, unitPrices]);

  const hasErrors =
    Object.keys(priceErrors).length > 0 ||
    dateError !== null ||
    order.lines.some((l) => (unitPrices[l.lineId] ?? 0) < MIN_LINE_UNIT_PRICE_VND);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors || isSubmitting) return;

    if (!isValidFutureHandoverDate(handoverDate)) {
      setDateError('Ngày dự kiến bàn giao phải là ngày trong tương lai (tối thiểu từ ngày mai).');
      return;
    }

    const payload: QuotePrintOrderBody = {
      expectedRevision: order.revision,
      lines: order.lines.map((l) => ({
        lineId: l.lineId,
        unitPriceVnd: unitPrices[l.lineId] ?? 85000,
      })),
      estimatedHandoverAt: toVietnamBusinessIsoString(handoverDate, 17, 0),
    };
    onSubmit(payload);
  };

  return (
    <>
      <div className="v0-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        className="v0-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={
          isReplacementProposal
            ? 'Đề xuất thay thế đơn in'
            : order.status === 'REQUESTED'
              ? 'Lập báo giá thương mại'
              : 'Gửi báo giá mới'
        }
        tabIndex={-1}
      >
        <div className="v0-drawer-head">
          <div>
            <h2>
              {isReplacementProposal
                ? `Đề xuất thay thế · ${order.orderId}`
                : order.status === 'REQUESTED'
                  ? `Báo giá thương mại · ${order.orderId}`
                  : `Gửi báo giá mới · ${order.orderId}`}
            </h2>
            <p>
              {isReplacementProposal
                ? 'Đề xuất mức giá mới cho đơn in đã duyệt. Sản xuất sẽ tạm dừng cho đến khi Couple duyệt lại.'
                : 'Nhập đơn giá cho từng dòng in ấn. Báo giá có hiệu lực trong 7 ngày.'}
            </p>
            {order.currentCommercialRevision &&
            isCommercialRevisionExpired(order.currentCommercialRevision) ? (
              <div style={{ marginTop: '8px' }}>
                <span className="v0-badge v0-badge-warning">Báo giá cũ đã hết hạn</span>
              </div>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng bảng báo giá"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="v0-drawer-body">
          <div className="v0-form-group">
            <label className="v0-label">Phiên bản đơn in dự kiến (Expected revision)</label>
            <input
              type="text"
              readOnly
              value={`Revision hiện tại: ${order.revision}`}
              className="v0-input v0-input-readonly"
            />
          </div>

          <div className="v0-lines-edit-list">
            <label className="v0-label">Đơn giá từng dòng in (VND/bản)</label>
            {order.lines.map((line, idx) => {
              const currentPrice = unitPrices[line.lineId] ?? 0;
              const rawVal = rawInputs[line.lineId] ?? '';
              const lineError = priceErrors[line.lineId];
              return (
                <div key={line.lineId} className="v0-line-edit-item">
                  <div className="v0-line-edit-title">
                    <strong>
                      #{idx + 1}: {line.displayVariant ?? line.designId}
                    </strong>
                    <span>{line.quantity} bản</span>
                  </div>
                  <div className="v0-line-edit-input-row">
                    <input
                      type="text"
                      className={`v0-input ${lineError ? 'v0-input-error' : ''}`}
                      value={rawVal}
                      onChange={(e) => handlePriceChange(line.lineId, e.target.value)}
                      placeholder="Nhập đơn giá (VND)…"
                      aria-label={`Đơn giá dòng ${idx + 1}`}
                      required
                    />
                    <span className="v0-line-subtotal">
                      = {formatVnd(computeQuotedLineTotal(line.quantity, currentPrice))}
                    </span>
                  </div>
                  {lineError ? <span className="v0-input-error-msg">{lineError}</span> : null}
                </div>
              );
            })}
          </div>

          <div className="v0-form-group">
            <label className="v0-label" htmlFor="handover-date-input">
              Ngày dự kiến bàn giao (giờ kinh doanh 17:00 VN)
            </label>
            <input
              id="handover-date-input"
              type="date"
              className={`v0-input ${dateError ? 'v0-input-error' : ''}`}
              value={handoverDate}
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
            {dateError ? <span className="v0-input-error-msg">{dateError}</span> : null}
          </div>

          <div className="v0-drawer-summary-card">
            <span>Tổng giá trị báo giá (Xem trước client):</span>
            <strong>{formatVnd(calculatedTotal)}</strong>
            <small>Số liệu chính thức do máy chủ tính toán và lưu vết bất biến.</small>
          </div>

          <div className="v0-drawer-actions">
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="v0-button v0-button-primary"
              disabled={hasErrors || isSubmitting}
            >
              {isSubmitting
                ? 'Đang gửi…'
                : isReplacementProposal
                  ? 'Gửi đề xuất thay thế'
                  : `Tạo revision ${(order.currentCommercialRevision?.revisionNumber ?? order.revision) + 1}`}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

// -----------------------------------------------------------------------------
// Component: Handover Confirmation Modal
// -----------------------------------------------------------------------------
interface HandoverModalProps {
  order: PrintOrderView;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (evidenceReference: string) => void;
}

function HandoverModal({ order, isSubmitting, onClose, onConfirm }: HandoverModalProps) {
  const [evidence, setEvidence] = useState(`BBBG-${order.orderId}`);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
    onClose,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidence.trim() || isSubmitting) return;
    onConfirm(evidence.trim());
  };

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận bàn giao"
      >
        <div className="v0-modal-head">
          <h3>Bàn giao đơn in · {order.orderId}</h3>
          <button
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="v0-modal-body">
          <p>
            Vui lòng nhập mã biên bản hoặc mã chứng từ giao nhận tại nhà hàng để hoàn tất việc bàn
            giao ấn phẩm cho tiệc cưới:
          </p>
          <div className="v0-form-group">
            <label className="v0-label" htmlFor="evidence-input">
              Mã chứng từ / Biên bản bàn giao:
            </label>
            <input
              ref={inputRef}
              id="evidence-input"
              type="text"
              className="v0-input"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Ví dụ: BG-2408-014-KHO"
              maxLength={120}
              required
            />
          </div>
          <div className="v0-modal-actions">
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="v0-button v0-button-primary"
              disabled={!evidence.trim() || isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý…' : 'Xác nhận bàn giao'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Component: Destructive Cancellation Modal (Conforms to print-policy.ts)
// -----------------------------------------------------------------------------
interface CancelOrderModalProps {
  order: PrintOrderView;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}

function CancelOrderModal({ order, isSubmitting, onClose, onConfirm }: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const isApproved = order.status === 'APPROVED';

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBackBtnRef = useRef<HTMLButtonElement | null>(null);

  // Safe default: initial focus on Cancel/Back button for destructive modal
  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: cancelBackBtnRef,
    onClose,
  });

  const isReasonValid = !isApproved || reason.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isReasonValid) return;
    onConfirm(reason);
  };

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận hủy đơn in"
      >
        <div className="v0-modal-head">
          <h3 style={{ color: 'var(--v0-danger)' }}>Xác nhận hủy đơn in · {order.orderId}</h3>
          <button
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="v0-modal-body">
          {isApproved ? (
            <div className="v0-alert-box v0-alert-danger" style={{ marginBottom: '16px' }}>
              <strong>Quy tắc đối soát hủy đơn đã duyệt:</strong>
              <p style={{ marginTop: '6px', fontSize: '13px', lineHeight: '1.5' }}>
                Đơn in này đã được Couple chấp thuận. Theo quy định backend:
              </p>
              <ul
                style={{
                  paddingLeft: '18px',
                  marginTop: '6px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                <li>
                  Máy chủ yêu cầu xác nhận ý định hủy từ Cặp đôi (Couple Cancellation Intent) trên
                  ứng dụng khớp với phiên bản đơn hiện tại.
                </li>
                <li>
                  Hệ thống sẽ ghi nhận bút toán tín dụng (Credit Adjustment / Credit Note) vào sổ
                  cái thanh toán tiệc cưới theo hợp đồng, không hoàn tiền mặt tự do tại đây.
                </li>
              </ul>
            </div>
          ) : (
            <p>
              Đơn in đang ở trạng thái {order.status}. Hủy đơn in sẽ chuyển trạng thái sang ĐÃ HỦY
              và không thể tiếp tục sản xuất.
            </p>
          )}

          <div className="v0-form-group">
            <label className="v0-label">Phiên bản xác thực (Expected Revision)</label>
            <input
              type="text"
              readOnly
              value={`Revision: ${order.revision}`}
              className="v0-input v0-input-readonly"
            />
          </div>

          <div className="v0-form-group">
            <label className="v0-label" htmlFor="cancel-reason-input">
              Lý do hủy đơn {isApproved ? '(Bắt buộc đối với đơn đã duyệt):' : '(Tùy chọn):'}
            </label>
            <textarea
              id="cancel-reason-input"
              className="v0-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do hủy hoặc căn cứ thỏa thuận với Couple…"
              maxLength={500}
              required={isApproved}
            />
            {isApproved && reason.trim().length === 0 ? (
              <p className="text-danger" style={{ fontSize: '12px', marginTop: '4px' }}>
                * Lý do hủy là bắt buộc đối với đơn in đã được phê duyệt.
              </p>
            ) : null}
          </div>

          <div className="v0-modal-actions">
            <button
              ref={cancelBackBtnRef}
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Quay lại
            </button>
            <button
              type="submit"
              className="v0-button v0-button-danger"
              disabled={isSubmitting || !isReasonValid}
            >
              {isSubmitting ? 'Đang hủy…' : 'Xác nhận hủy đơn in'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Component: Notice Modal Explaining Business Rule
// -----------------------------------------------------------------------------
function CreateOrderNoticeModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const okBtnRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: okBtnRef,
    onClose,
  });

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Quy trình khởi tạo đơn in"
      >
        <div className="v0-modal-head">
          <h3>Quy tắc khởi tạo đơn in ấn thiệp cưới</h3>
          <button
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <div className="v0-modal-body">
          <p>Theo quy định nghiệp vụ hệ thống, đơn in ấn vật lý do Couple khởi tạo trực tiếp:</p>
          <ul style={{ paddingLeft: '20px', margin: '14px 0', lineHeight: '1.6' }}>
            <li>
              Đơn in ấn thiệp cưới được chủ động khởi tạo bởi <strong>Couple</strong> từ ứng dụng
              khách hàng sau khi hoàn tất tùy chỉnh và chốt bản mẫu thiết kế số hóa.
            </li>
            <li>
              <strong>Quản lý vận hành (Manager)</strong> không được phép tự ý tạo đơn in thay thế
              Couple để đảm bảo tính toàn vẹn và bất biến của hợp đồng thiết kế.
            </li>
            <li>
              Khi Couple gửi yêu cầu, đơn in sẽ xuất hiện tại hàng đợi này ở trạng thái{' '}
              <code>REQUESTED</code> để Quản lý tiến hành báo giá.
            </li>
          </ul>
          <div className="v0-modal-actions">
            <button
              ref={okBtnRef}
              type="button"
              className="v0-button v0-button-primary"
              onClick={onClose}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Component: History Modal
// -----------------------------------------------------------------------------
function HistoryModal({ order, onClose }: { order: PrintOrderView | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: closeBtnRef,
    onClose,
  });

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Lịch sử đơn in"
        tabIndex={-1}
      >
        <div className="v0-modal-head">
          <h3>Lịch sử đơn in {order ? `· ${order.orderId}` : ''}</h3>
          <button
            ref={closeBtnRef}
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <div className="v0-modal-body">
          <p>
            Nhật ký lưu vết bất biến các lần điều chỉnh trạng thái và báo giá thương mại theo hợp
            đồng:
          </p>
          {order ? (
            <ul style={{ paddingLeft: '20px', margin: '14px 0', lineHeight: '1.6' }}>
              <li>
                <strong>Khởi tạo:</strong> {formatVietnameseDateTime(order.createdAt)} bởi Couple.
              </li>
              <li>
                <strong>Phiên bản hiện tại:</strong> Revision {order.revision}.
              </li>
              {order.currentCommercialRevision ? (
                <li>
                  <strong>Báo giá:</strong> Revision{' '}
                  {order.currentCommercialRevision.revisionNumber} (
                  {formatVnd(order.currentCommercialRevision.orderTotalVnd)}).
                </li>
              ) : null}
              {order.readyAt ? (
                <li>
                  <strong>Sẵn sàng:</strong> {formatVietnameseDateTime(order.readyAt)}.
                </li>
              ) : null}
              {order.handedOverAt ? (
                <li>
                  <strong>Đã bàn giao:</strong> {formatVietnameseDateTime(order.handedOverAt)} (Biên
                  bản: {order.evidenceReference ?? 'N/A'}).
                </li>
              ) : null}
            </ul>
          ) : (
            <p>Chưa chọn đơn in nào.</p>
          )}
          <div className="v0-modal-actions">
            <button type="button" className="v0-button v0-button-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
