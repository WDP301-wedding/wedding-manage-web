import { useCallback } from 'react';
import { ApiClientError } from '../../lib/api/client';
import {
  usePrintOrderClosureMutations,
  type UsePrintOrderClosureMutationsOptions,
} from './print-orders-closure-mutations';
import { canMarkReady, canStartProduction, generateIdempotencyKey } from './print-orders-types';

export type UsePrintOrderLifecycleMutationsOptions = UsePrintOrderClosureMutationsOptions;
export { usePrintOrderClosureMutations };

const isNetworkError = (err: unknown): boolean =>
  err instanceof ApiClientError && (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR');

export function usePrintOrderLifecycleMutations(options: UsePrintOrderLifecycleMutationsOptions) {
  const {
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
  } = options;

  const { handleConfirmHandover, handleConfirmCancel } = usePrintOrderClosureMutations(options);

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

  return {
    handleStartProduction,
    handleMarkReady,
    handleConfirmHandover,
    handleConfirmCancel,
  };
}
