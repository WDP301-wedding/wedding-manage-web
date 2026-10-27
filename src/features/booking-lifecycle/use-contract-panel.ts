import { useEffect, useRef, useState } from 'react';
import { ApiServiceError } from '../../lib/api/axios-client';
import {
  contractService,
  type ContractListData,
  type ContractRevisionItem,
} from '../../services/contract.service';
import { notify } from '../../design-system/notifications';

export interface UseContractPanelOptions {
  bookingId: string;
  bookingRevision: number;
  onRefresh: () => void;
}

export function useContractPanel({
  bookingId,
  bookingRevision,
  onRefresh,
}: UseContractPanelOptions) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ContractListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const activeBookingIdRef = useRef(bookingId);

  const loadContracts = async (targetId = bookingId) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await contractService.getContracts(targetId);
      if (activeBookingIdRef.current !== targetId) return;
      setData(res);
    } catch (err) {
      if (activeBookingIdRef.current !== targetId) return;
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể tải thông tin hợp đồng tiệc.');
      }
    } finally {
      if (activeBookingIdRef.current === targetId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeBookingIdRef.current = bookingId;
    setData(null);
    setError(null);
    setActionMessage(null);
    void loadContracts(bookingId);
  }, [bookingId]);

  const currentRevision: ContractRevisionItem | null =
    data && data.currentRevisionId
      ? (data.revisions.find((r) => r.revisionId === data.currentRevisionId) ??
        data.revisions[0] ??
        null)
      : (data?.revisions[0] ?? null);

  const handleApprove = async () => {
    if (!currentRevision) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      await contractService.approveContract(bookingId, currentRevision.revisionId, bookingRevision);
      const msg = 'Đã ghi nhận phê duyệt hợp đồng từ phía Quản lý.';
      setActionMessage(msg);
      notify.success(msg);
      await loadContracts();
      onRefresh();
    } catch (err) {
      const msg = err instanceof ApiServiceError ? err.message : 'Không thể phê duyệt hợp đồng.';
      setError(msg);
      notify.error(err, { message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!currentRevision) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      await contractService.submitContract(bookingId, currentRevision.revisionId, bookingRevision);
      const msg = 'Đã gửi duyệt hợp đồng thành công. Chờ hai bên phê duyệt.';
      setActionMessage(msg);
      notify.success(msg);
      await loadContracts();
      onRefresh();
    } catch (err) {
      const msg = err instanceof ApiServiceError ? err.message : 'Không thể gửi duyệt hợp đồng.';
      setError(msg);
      notify.error(err, { message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentRevision) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      const blob = await contractService.downloadContractPdf(bookingId, currentRevision.revisionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hop-dong-tiec-${bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      const msg = err instanceof ApiServiceError ? err.message : 'Không thể tải file PDF hợp đồng.';
      setError(msg);
      notify.error(err, { message: msg });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const managerApproved = currentRevision?.approvals.some((a) => a.party === 'MANAGER');
  const coupleApproved = currentRevision?.approvals.some((a) => a.party === 'COUPLE');

  return {
    loading,
    data,
    error,
    actionMessage,
    downloadingPdf,
    currentRevision,
    managerApproved,
    coupleApproved,
    handleApprove,
    handleSubmitDraft,
    handleDownloadPdf,
  };
}
