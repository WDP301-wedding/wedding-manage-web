'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { addMyManagedBookingId, getMyManagedBookingIds } from '../identity-access/dashboard-live';
import type {
  Authorize,
  ManagementBookingGateway,
  ProposalView,
  ConsultationWorkspace,
} from './booking-api';
import {
  type BookingPrefill,
  errorMessage,
  type InviteLogEntry,
  parseConsultationChoices,
} from './booking-helpers';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { useRefreshQueue } from '../realtime/refresh-queue';
import { notify } from '../../design-system/notifications';
import { useWorkspaceInvite } from './use-workspace-invite';
import { parseBookingUrlParams } from './booking-url-params';

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
  const contextSequence = useRef(0);
  const resumeTarget = useRef<{ bookingId?: string; consultationId?: string }>({});
  useEffect(
    () => () => {
      contextSequence.current++;
    },
    [],
  );
  const [contextStatus, setContextStatus] = useState<'ready' | 'loading' | 'error'>('loading');
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentBookingIds, setRecentBookingIds] = useState<string[]>([]);
  const [prefill, setPrefill] = useState<BookingPrefill>({});
  const [createdBookingNotice, setCreatedBookingNotice] = useState<{
    bookingId: string;
    consultationId: string;
    email?: string | undefined;
  } | null>(null);

  const { inviteLogs, setInviteLogs, sendWorkspaceInvite } = useWorkspaceInvite({
    authorize,
    gateway,
    consultation,
    proposal,
    setPending,
    setMessage,
    setError,
  });

  useEffect(() => {
    setRecentBookingIds(getMyManagedBookingIds(currentAccountId));
  }, [currentAccountId]);

  const recordMyBooking = (id: string) => {
    addMyManagedBookingId(id, currentAccountId, currentEmail);
    setRecentBookingIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  };

  const run = async <T>(label: string, operation: () => Promise<T>): Promise<T | null> => {
    setPending(label);
    setMessage(null);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
        setProposal(null);
        setConsultation(null);
        setPrefill({});
        setContextStatus('error');
      }
      const errText = errorMessage(caught, proposal?.proposal.shift);
      setError(errText);
      notify.error(caught, { message: errText });
      if (
        label === 'booking' &&
        caught instanceof ApiClientError &&
        caught.code === 'BOOKING_ALREADY_EXISTS' &&
        consultation
      )
        await resumeConsultation(consultation.id);
      return null;
    } finally {
      setPending(null);
    }
  };

  const applyContext = (
    context: Awaited<ReturnType<ManagementBookingGateway['loadWorkspace']>>,
  ) => {
    const legacy = parseConsultationChoices(context.note);
    setConsultation({ id: context.consultationId, revision: context.revision });
    setPrefill({
      displayName: context.displayName,
      email: context.email,
      note: context.note ?? undefined,
      eventDate: context.preferredDate ?? undefined,
      expectedGuests: context.expectedGuests ?? undefined,
      preferredHallId: context.preferredHallId ?? undefined,
      preferredMenuVersionId: context.preferredMenuVersionId ?? undefined,
      preferredHallName: legacy.hallName,
      preferredMenuName: legacy.menuName,
      preferredShift: context.preferredShift ?? legacy.shift,
    });
  };

  const loadProposal = async (
    id: string,
    shouldSwitchTab = true,
    knownContext?: ConsultationWorkspace,
  ) => {
    resumeTarget.current = { bookingId: id };
    const sequence = ++contextSequence.current;
    setPending('load');
    setError(null);
    setContextStatus('loading');
    if (shouldSwitchTab) {
      setProposal(null);
      setConsultation(null);
      setPrefill({});
      setInviteLogs([]);
      setCreatedBookingNotice((previous) => (previous?.bookingId === id ? previous : null));
    }
    try {
      const result = await authorize((token) => gateway.loadProposal(token, id));
      const context =
        knownContext?.consultationId === result.consultationId
          ? knownContext
          : await authorize((token) => gateway.loadWorkspace(token, result.consultationId));
      if (sequence !== contextSequence.current) return;
      applyContext(context);
      setBookingId(result.bookingId);
      setProposal(result);
      recordMyBooking(result.bookingId);
      setContextStatus('ready');
      if (shouldSwitchTab) {
        switchTab('manage');
        window.history.replaceState(null, '', '/bookings?bookingId=' + result.bookingId);
      }
    } catch (caught) {
      if (sequence !== contextSequence.current) return;
      setContextStatus('error');
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
        setProposal(null);
        setConsultation(null);
        setPrefill({});
        setBookingId('');
      }
      const errText = errorMessage(caught);
      setError(errText);
      notify.error(caught, { message: errText });
    } finally {
      if (sequence === contextSequence.current) setPending(null);
    }
  };

  const resumeConsultation = async (id: string) => {
    resumeTarget.current = { consultationId: id };
    const sequence = ++contextSequence.current;
    setPending('context');
    setContextStatus('loading');
    setError(null);
    try {
      const context = await authorize((token) => gateway.loadWorkspace(token, id));
      if (sequence !== contextSequence.current) return;
      if (context.bookingId) {
        await loadProposal(context.bookingId, true, context);
        return;
      }
      applyContext(context);
      setBookingId('');
      setProposal(null);
      setContextStatus('ready');
      switchTab('booking');
    } catch (caught) {
      if (sequence !== contextSequence.current) return;
      setContextStatus('error');
      const errText = errorMessage(caught);
      setError(errText);
      notify.error(caught, { message: errText });
    } finally {
      if (sequence === contextSequence.current) setPending(null);
    }
  };

  const retryContext = () => {
    if (resumeTarget.current.bookingId) void loadProposal(resumeTarget.current.bookingId);
    else if (resumeTarget.current.consultationId)
      void resumeConsultation(resumeTarget.current.consultationId);
  };

  const prepareBooking = async () => {
    if (!consultation) {
      setError('Tạo hoặc chọn hồ sơ tư vấn trước khi lập tiệc.');
      return null;
    }
    const context = await run('context', () =>
      authorize((token) => gateway.loadWorkspace(token, consultation.id)),
    );
    if (!context) return null;
    if (context.bookingId) {
      await loadProposal(context.bookingId);
      setMessage('Hồ sơ tư vấn này đã có tiệc. Đã mở hồ sơ hiện có; không tạo thêm booking.');
      return null;
    }
    applyContext(context);
    return { id: context.consultationId, revision: context.revision };
  };

  const currentBookingId = proposal?.bookingId ?? (bookingId || undefined);

  const proposalRefresh = useRefreshQueue(async () => {
    if (currentBookingId) await loadProposal(currentBookingId, false);
  }, currentBookingId ?? 'no-booking');

  useRealtimeSubscription({
    bookingId: currentBookingId,
    onEvent: (event) => {
      if (
        currentBookingId &&
        (!event.scope.bookingId || event.scope.bookingId === currentBookingId)
      ) {
        proposalRefresh.schedule();
      }
    },
    onResync: () => {
      if (currentBookingId) {
        proposalRefresh.schedule();
      }
    },
  });

  const refresh = async (success: string) => {
    setMessage(success);
    if (proposal !== null) await proposalRefresh.refresh();
  };

  const resetConsultation = () => {
    contextSequence.current++;
    resumeTarget.current = {};
    setPending(null);
    setContextStatus('ready');
    setProposal(null);
    setBookingId('');
    setInviteLogs([]);
    setCreatedBookingNotice(null);
    setConsultation(null);
    setPrefill({});
    window.history.replaceState(null, '', '/bookings');
    switchTab('consultation');
    setMessage(
      'Đã xóa mã tư vấn cũ. Hãy nhập thông tin cặp đôi mới ở Bước 01 rồi bấm "Tạo hồ sơ tư vấn".',
    );
  };

  useEffect(() => {
    const parsed = parseBookingUrlParams(window.location.search);
    if (parsed.bookingId) {
      void loadProposal(parsed.bookingId);
      return;
    }
    if (parsed.consultationId) {
      void resumeConsultation(parsed.consultationId);
      return;
    }
    setContextStatus('ready');
    if (parsed.prefill) {
      switchTab('consultation');
      setPrefill(parsed.prefill);
    }
  }, []);

  return {
    contextStatus,
    prepareBooking,
    retryContext,
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
