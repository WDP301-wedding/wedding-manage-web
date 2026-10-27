import { useLiveRefresh } from '../realtime/use-live-refresh';
import { useEffect, useRef, useState } from 'react';
import { describeApiError } from '../../lib/api/api-errors';
import {
  contractService,
  type AppendixListData,
  type AppendixRevisionItem,
} from '../../services/contract.service';
import { notify } from '../../design-system/notifications';

export interface UseAppendixPanelOptions {
  bookingId: string;
  bookingRevision: number;
  onRefresh: () => void;
}

export function useAppendixPanel({
  bookingId,
  bookingRevision,
  onRefresh,
}: UseAppendixPanelOptions) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AppendixListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const activeBookingIdRef = useRef(bookingId);
  const readEpoch = useRef(0);
  const previousHead = useRef<string | null>(null);

  const loadAppendices = async (targetId = bookingId) => {
    if (!targetId) return;
    const epoch = ++readEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const res = await contractService.getAppendices(targetId);
      if (activeBookingIdRef.current !== targetId || epoch !== readEpoch.current) return;
      setData(res);
      // Follow a new head when viewing the previous head; preserve an explicitly selected history row.
      const nextHead = res.currentRevisionId ?? res.revisions[0]?.revisionId ?? null;
      const oldHead = previousHead.current;
      previousHead.current = nextHead;
      setSelectedRevisionId((previous) =>
        previous === null || previous === oldHead
          ? nextHead
          : res.revisions.some((row) => row.revisionId === previous)
            ? previous
            : nextHead,
      );
    } catch (err) {
      if (activeBookingIdRef.current !== targetId || epoch !== readEpoch.current) return;
      const friendly = describeApiError(err);
      setError(friendly.message);
    } finally {
      if (activeBookingIdRef.current === targetId && epoch === readEpoch.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeBookingIdRef.current = bookingId;
    setData(null);
    setError(null);
    setActionMessage(null);
    setSelectedRevisionId(null);
    previousHead.current = null;
    void loadAppendices(bookingId);
  }, [bookingId]);

  useLiveRefresh(
    async () => {
      await loadAppendices(bookingId);
    },
    {
      scope: bookingId,
      bookingId,
      types: ['contract.updated', 'booking.updated'],
      blocked: loading,
    },
  );

  const activeAppendix: AppendixRevisionItem | null =
    data?.revisions.find((r) => r.revisionId === selectedRevisionId) ??
    (data?.currentRevisionId
      ? (data.revisions.find((r) => r.revisionId === data.currentRevisionId) ??
        data.revisions[0] ??
        null)
      : (data?.revisions[0] ?? null));

  const handleApproveAppendix = async (revisionId: string) => {
    if (!revisionId) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const rev = data?.bookingRevision ?? bookingRevision;
      await contractService.approveAppendix(bookingId, revisionId, rev);
      const msg = 'Đã ghi nhận phê duyệt phụ lục hợp đồng từ phía Quản lý.';
      setActionMessage(msg);
      notify.success(msg);
      await loadAppendices();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err, {
        CONTRACT_DISTINCT_APPROVERS_REQUIRED:
          'Quản lý đã duyệt phụ lục này rồi; cần phía Cặp đôi phê duyệt.',
        COMMERCIAL_PREDECESSOR_STALE: 'Dữ liệu phụ lục vừa được cập nhật. Vui lòng làm mới trang.',
      });
      setError(friendly.message);
      notify.error(err, { message: friendly.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAppendix = async (revisionId: string) => {
    if (!revisionId) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const rev = data?.bookingRevision ?? bookingRevision;
      await contractService.submitAppendix(bookingId, revisionId, rev);
      const msg = 'Đã gửi duyệt phụ lục hợp đồng thành công. Chờ hai bên phê duyệt.';
      setActionMessage(msg);
      notify.success(msg);
      await loadAppendices();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err);
      setError(friendly.message);
      notify.error(err, { message: friendly.message });
    } finally {
      setLoading(false);
    }
  };

  const managerApproved = activeAppendix?.approvals.some((a) => a.party === 'MANAGER');
  const coupleApproved = activeAppendix?.approvals.some((a) => a.party === 'COUPLE');

  const pendingApprovalsCount =
    data?.revisions.filter(
      (r) => r.state === 'AWAITING_APPROVAL' && !r.approvals.some((a) => a.party === 'MANAGER'),
    ).length ?? 0;

  return {
    loading,
    data,
    error,
    actionMessage,
    activeAppendix,
    selectedRevisionId,
    setSelectedRevisionId,
    managerApproved,
    coupleApproved,
    pendingApprovalsCount,
    handleApproveAppendix,
    handleSubmitAppendix,
    refreshAppendices: () => void loadAppendices(),
  };
}

export type AppendixPanelState = ReturnType<typeof useAppendixPanel>;
