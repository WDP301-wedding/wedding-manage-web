'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { addMyManagedBookingId, getMyManagedBookingIds } from '../identity-access/dashboard-live';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import { type BookingPrefill, errorMessage, type InviteLogEntry } from './booking-helpers';
import { useRealtimeSubscription } from '../realtime/use-realtime';

export interface UseBookingWorkspaceStateOptions {
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  currentAccountId?: string | undefined;
  currentEmail?: string | undefined;
}

export function useBookingWorkspaceState({
  authorize,
  gateway,
  currentAccountId,
  currentEmail,
}: UseBookingWorkspaceStateOptions) {
  const [activeTab, setActiveTab] = useState<'manage' | 'consultation' | 'booking'>('consultation');
  const [visitedTabs, setVisitedTabs] = useState<Set<'manage' | 'consultation' | 'booking'>>(
    () => new Set([activeTab]),
  );

  const switchTab = useCallback((tab: 'manage' | 'consultation' | 'booking') => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  const [consultation, setConsultation] = useState<{ id: string; revision: number } | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentBookingIds, setRecentBookingIds] = useState<string[]>([]);
  const [inviteLogs, setInviteLogs] = useState<readonly InviteLogEntry[]>([]);
  const [prefill, setPrefill] = useState<BookingPrefill>({});
  const [createdBookingNotice, setCreatedBookingNotice] = useState<{
    bookingId: string;
    consultationId: string;
    email?: string | undefined;
  } | null>(null);

  const sendWorkspaceInvite = async () => {
    const targetConsultationId = consultation?.id ?? proposal?.consultationId;
    const targetRevision = consultation?.revision ?? 1;
    if (!targetConsultationId) return;
    const now = new Date().toLocaleTimeString('vi-VN');
    const logId = crypto.randomUUID();
    console.log(`[Workspace Invitation] ${now} Bắt đầu gửi lời mời cộng tác:`, {
      consultationId: targetConsultationId,
      revision: targetRevision,
    });
    setInviteLogs((prev) => [
      {
        id: logId,
        time: now,
        type: 'pending',
        message: 'Đang gửi yêu cầu mời cộng tác tới máy chủ...',
        consultationId: targetConsultationId,
      },
      ...prev,
    ]);

    setPending('invite');
    setMessage(null);
    setError(null);
    try {
      const res = await authorize((token) =>
        gateway.invite(token, {
          consultationId: targetConsultationId,
          expectedRevision: targetRevision,
        }),
      );
      console.log(`[Workspace Invitation] ${now} Gửi lời mời thành công:`, res);
      setMessage('Đã yêu cầu gửi lời mời không gian cộng tác.');
      const invitationId = (res as { invitationId?: string } | undefined)?.invitationId;
      const isReplayed = (res as { replayed?: boolean } | undefined)?.replayed;
      setInviteLogs((prev) =>
        prev.map((item) =>
          item.id === logId
            ? {
                ...item,
                type: 'success',
                message: 'Đã gửi lời mời thành công tới email của cặp đôi.',
                invitationId: invitationId ?? 'Đã phát hành (ISSUED)',
                details: isReplayed
                  ? 'Yêu cầu lặp lại (replayed) - lời mời đã được phát hành trước đó.'
                  : undefined,
              }
            : item,
        ),
      );
    } catch (caught) {
      const errText = errorMessage(caught, proposal?.proposal.shift);
      console.error(`[Workspace Invitation] ${now} Lỗi gửi lời mời:`, caught);
      setError(errText);
      setInviteLogs((prev) =>
        prev.map((item) =>
          item.id === logId
            ? {
                ...item,
                type: 'error',
                message: `Gửi lời mời thất bại: ${errText}`,
                details:
                  caught instanceof ApiClientError
                    ? `HTTP ${caught.status ?? 'N/A'} (${caught.code}): ${caught.message}`
                    : caught instanceof Error
                      ? caught.message
                      : String(caught),
              }
            : item,
        ),
      );
    } finally {
      setPending(null);
    }
  };

  useEffect(() => {
    setRecentBookingIds(getMyManagedBookingIds(currentAccountId));
  }, [currentAccountId]);

  const recordMyBooking = (id: string) => {
    addMyManagedBookingId(id, currentAccountId, currentEmail);
    setRecentBookingIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  };

  const run = async <T,>(label: string, operation: () => Promise<T>): Promise<T | null> => {
    setPending(label);
    setMessage(null);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
        setProposal(null);
      }
      setError(errorMessage(caught, proposal?.proposal.shift));
      return null;
    } finally {
      setPending(null);
    }
  };

  const loadProposal = async (id: string, shouldSwitchTab = true) => {
    const result = await run('load', () => authorize((token) => gateway.loadProposal(token, id)));
    if (result !== null) {
      setProposal(result);
      recordMyBooking(id);
      if (shouldSwitchTab) {
        switchTab('manage');
      }
    }
  };

  const currentBookingId = proposal?.bookingId ?? (bookingId || undefined);

  useRealtimeSubscription({
    bookingId: currentBookingId,
    onEvent: (event) => {
      if (currentBookingId && (!event.scope.bookingId || event.scope.bookingId === currentBookingId)) {
        void loadProposal(currentBookingId, false);
      }
    },
    onResync: () => {
      if (currentBookingId) {
        void loadProposal(currentBookingId, false);
      }
    },
  });

  const refresh = async (success: string) => {
    setMessage(success);
    if (proposal !== null) await loadProposal(proposal.bookingId);
  };

  const resetConsultation = () => {
    setConsultation(null);
    setPrefill({});
    switchTab('consultation');
    setMessage(
      'Đã xóa mã tư vấn cũ. Hãy nhập thông tin cặp đôi mới ở Bước 01 rồi bấm "Tạo hồ sơ tư vấn".',
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bId = params.get('bookingId');
    const id = params.get('consultationId');
    const revision = Number(params.get('consultationRevision'));
    const dName = params.get('displayName') || undefined;
    const em = params.get('email') || undefined;
    const nt = params.get('note') || undefined;
    const pDate = params.get('preferredDate')?.slice(0, 10) || undefined;
    const expGuestsParam = params.get('expectedGuests');
    const expG =
      expGuestsParam && !Number.isNaN(Number(expGuestsParam)) ? Number(expGuestsParam) : undefined;
    const tCount = expG && expG > 0 ? Math.max(1, Math.ceil(expG / 10)) : undefined;

    // Ưu tiên 1: Có bookingId -> Chuyển sang Tab 3 (Quản lý tiệc)
    if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
      setBookingId(bId);
      switchTab('manage');
      void run('load', () => authorize((token) => gateway.loadProposal(token, bId))).then(
        (result) => {
          if (result !== null) setProposal(result);
        },
      );
      return;
    }

    // Ưu tiên 2: Có consultationId hợp lệ -> Đã có mã tư vấn -> Nhảy thẳng Tab 2 (Khảo sát & Tạo booking)
    if (
      id !== null &&
      /^[a-f0-9-]{36}$/iu.test(id) &&
      Number.isSafeInteger(revision) &&
      revision > 0
    ) {
      setConsultation({ id, revision });
      if (dName || em || nt || pDate || expG) {
        setPrefill({
          displayName: dName,
          email: em,
          note: nt,
          eventDate: pDate,
          expectedGuests: expG,
          tableCount: tCount,
        });
      }
      switchTab('booking');
      return;
    }

    // Ưu tiên 3: Chưa có consultationId nhưng có thông tin khách (tạo mới/vãng lai) -> Tab 1
    if (dName || em || nt || pDate || expG) {
      switchTab('consultation');
      setPrefill({
        displayName: dName,
        email: em,
        note: nt,
        eventDate: pDate,
        expectedGuests: expG,
        tableCount: tCount,
      });
    }
  }, []);

  return {
    activeTab,
    switchTab,
    consultation,
    setConsultation,
    bookingId,
    setBookingId,
    proposal,
    setProposal,
    pending,
    setPending,
    message,
    setMessage,
    error,
    setError,
    recentBookingIds,
    inviteLogs,
    setInviteLogs,
    prefill,
    setPrefill,
    createdBookingNotice,
    setCreatedBookingNotice,
    sendWorkspaceInvite,
    recordMyBooking,
    run,
    loadProposal,
    refresh,
    resetConsultation,
  };
}
