import type React from 'react';
import { useCallback } from 'react';
import { ApiClientError } from '../../lib/api/client';
import type { ManagementPrintOrdersGateway } from './print-orders-api';
import {
  canCancelOrder,
  canMarkHandedOver,
  canMarkReady,
  canStartProduction,
  generateIdempotencyKey,
  type CancelOrderBody,
  type PrintOrderView,
} from './print-orders-types';

export interface UsePrintOrderLifecycleMutationsOptions {
  selectedOrder: PrintOrderView | null;
  setSelectedOrder: React.Dispatch<React.SetStateAction<PrintOrderView | null>>;
  setOrders: React.Dispatch<React.SetStateAction<readonly PrintOrderView[]>>;
  isSubmittingRef: React.MutableRefObject<boolean>;
  setIsSubmitting: (submitting: boolean) => void;
  requestEpochRef: React.MutableRefObject<number>;
  authorize: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  gateway: ManagementPrintOrdersGateway;
  showToast: (msg: string) => void;
  showError: (msg: string) => void;
  currentCursor?: string | undefined;
  fetchOrders: (cursor?: string, silent?: boolean) => Promise<boolean>;
  setHandoverModalOpen: (open: boolean) => void;
  setCancelModalOpen: (open: boolean) => void;
}

const isNetworkError = (err: unknown): boolean =>
  err instanceof ApiClientError && (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR');

export function usePrintOrderLifecycleMutations({
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
}: UsePrintOrderLifecycleMutationsOptions) {
  const handleStartProduction = useCallback(async () => {
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
      } else if (isNetworkError(err)) {
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
  }, [
    selectedOrder,
    isSubmittingRef,
    setIsSubmitting,
    requestEpochRef,
    authorize,
    gateway,
    showError,
    setSelectedOrder,
    setOrders,
    showToast,
    fetchOrders,
    currentCursor,
  ]);

  const handleMarkReady = useCallback(async () => {
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
      } else if (isNetworkError(err)) {
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
  }, [
    selectedOrder,
    isSubmittingRef,
    setIsSubmitting,
    requestEpochRef,
    authorize,
    gateway,
    showError,
    setSelectedOrder,
    setOrders,
    showToast,
    fetchOrders,
    currentCursor,
  ]);

  const handleConfirmHandover = useCallback(
    async (evidenceReference: string) => {
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
        } else if (isNetworkError(err)) {
          showError(
            'Kết quả thao tác chưa xác định do gián đoạn mạng. Đang đối soát lại trạng thái đơn in…',
          );
          try {
            const reconciled = await authorize((token) => gateway.get(token, orderId));
            if (epoch !== requestEpochRef.current) return;
            setSelectedOrder(reconciled);
            setOrders((prev) =>
              prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)),
            );
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
    },
    [
      selectedOrder,
      isSubmittingRef,
      setIsSubmitting,
      requestEpochRef,
      authorize,
      gateway,
      showError,
      setSelectedOrder,
      setOrders,
      setHandoverModalOpen,
      showToast,
      fetchOrders,
      currentCursor,
    ],
  );

  const handleConfirmCancel = useCallback(
    async (reason?: string) => {
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
        } else if (isNetworkError(err)) {
          showError(
            'Kết quả hủy đơn chưa xác định do gián đoạn mạng. Đang đối soát lại từ máy chủ…',
          );
          try {
            const reconciled = await authorize((token) => gateway.get(token, orderId));
            if (epoch !== requestEpochRef.current) return;
            setSelectedOrder(reconciled);
            setOrders((prev) =>
              prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)),
            );
            if (reconciled.status === 'CANCELLED') {
              showToast(
                `Đã đối soát thành công: đơn ${reconciled.orderId} đã được hủy trên máy chủ.`,
              );
              setCancelModalOpen(false);
            } else {
              showError(
                'Thao tác hủy chưa được ghi nhận trên máy chủ. Bạn có thể thử lại an toàn.',
              );
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
    },
    [
      selectedOrder,
      isSubmittingRef,
      setIsSubmitting,
      requestEpochRef,
      authorize,
      gateway,
      showError,
      setSelectedOrder,
      setOrders,
      setCancelModalOpen,
      showToast,
      fetchOrders,
      currentCursor,
    ],
  );

  return {
    handleStartProduction,
    handleMarkReady,
    handleConfirmHandover,
    handleConfirmCancel,
  };
}
