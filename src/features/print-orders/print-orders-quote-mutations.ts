import type React from 'react';
import { useCallback } from 'react';
import { ApiClientError } from '../../lib/api/client';
import type { ManagementPrintOrdersGateway } from './print-orders-api';
import {
  generateIdempotencyKey,
  type PrintOrderView,
  type QuotePrintOrderBody,
} from './print-orders-types';

export interface UsePrintOrderQuoteMutationsOptions {
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
  setQuoteDrawerOpen: (open: boolean) => void;
  isReplacementProposal: boolean;
}

const isNetworkError = (err: unknown): boolean =>
  err instanceof ApiClientError && (err.code === 'NETWORK_TIMEOUT' || err.code === 'NETWORK_ERROR');

export function usePrintOrderQuoteMutations({
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
}: UsePrintOrderQuoteMutationsOptions) {
  const handleSubmitQuote = useCallback(
    async (body: QuotePrintOrderBody) => {
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
        } else if (isNetworkError(err)) {
          showError(
            'Kết quả gửi báo giá chưa xác định do gián đoạn mạng. Đang đối soát lại từ máy chủ…',
          );
          try {
            const reconciled = await authorize((token) => gateway.get(token, orderId));
            if (epoch !== requestEpochRef.current) return;
            setSelectedOrder(reconciled);
            setOrders((prev) =>
              prev.map((o) => (o.orderId === reconciled.orderId ? reconciled : o)),
            );
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
    },
    [
      selectedOrder,
      isSubmittingRef,
      setIsSubmitting,
      requestEpochRef,
      authorize,
      gateway,
      isReplacementProposal,
      showToast,
      setSelectedOrder,
      setOrders,
      setQuoteDrawerOpen,
      showError,
      fetchOrders,
      currentCursor,
    ],
  );

  return {
    handleSubmitQuote,
  };
}
