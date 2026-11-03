import { useEffect, useRef, useState } from 'react';
import { staffWorkspaceService as api } from '../../services/staff-workspace.service';
import type { StaffWorkspace, StaffEvent } from '../../services/staff-workspace.contracts';
import { notify } from '../../design-system/notifications';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { staffCommand } from './staff-command-intents';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function useStaffEventContext(authenticated: boolean, accountId: string, blocked: boolean) {
  const [bookingId, setInput] = useState('');
  const [resolved, setResolved] = useState<{ input: string; id: string } | null>(null);
  const [snapshotActor, setSnapshotActor] = useState(accountId);
  const [eventActor, setEventActor] = useState(accountId);
  const [snapshot, setSnapshot] = useState<StaffWorkspace | null>(null);
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [nextEvent, setNextEvent] = useState<string | null>(null);
  const [phase, setPhase] = useState<'CONFIRMED' | 'COMPLETED'>('CONFIRMED');
  const [eventQuery, setEventQuery] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const input = bookingId.trim();
  const eventId = uuid.test(input) ? input : resolved?.input === input ? resolved.id : '';
  const current = useRef({ input, eventId, phase, accountId, eventQuery });
  useEffect(() => {
    current.current = { input, eventId, phase, accountId, eventQuery };
  }, [input, eventId, phase, accountId, eventQuery]);
  const listEpoch = useRef(0);
  const workspace =
    snapshot?.bookingId === eventId && snapshotActor === accountId ? snapshot : null;
  const setBookingId = (value: string) => {
    current.current = {
      ...current.current,
      input: value.trim(),
      eventId: uuid.test(value.trim()) ? value.trim() : '',
    };
    setInput(value);
    setResolved(null);
    setSnapshot(null);
    setLoading(false);
  };
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('bookingId');
    if (value && uuid.test(value)) setInput(value);
  }, []);
  const resolveEventId = async () => {
    if (eventId) return eventId;
    if (!input) {
      notify.warning('Chọn tiệc được phân công hoặc nhập mã HY.');
      return null;
    }
    try {
      const result = await api.events(input, undefined, phase);
      if (current.current.input !== input) return null;
      const exact = result.items.filter((e) => e.bookingCode === input.toUpperCase());
      if (exact.length !== 1) {
        notify.warning(
          'Không tìm thấy đúng mã tiệc trong phạm vi được phép. Kiểm tra mã HY và bộ lọc trạng thái tiệc.',
        );
        return null;
      }
      const id = exact[0]!.bookingId;
      setResolved({ input, id });
      return id;
    } catch (error) {
      notify.error(error);
      return null;
    }
  };
  const loadEvents = async (more = false) => {
    const version = ++listEpoch.current;
    setLoadingEvents(true);
    try {
      const result = await api.events(
        eventQuery,
        more ? (nextEvent ?? undefined) : undefined,
        phase,
      );
      if (
        version !== listEpoch.current ||
        current.current.accountId !== accountId ||
        current.current.phase !== phase ||
        current.current.eventQuery !== eventQuery
      )
        return;
      setEventActor(accountId);
      setEvents((previous) =>
        more
          ? [...new Map([...previous, ...result.items].map((e) => [e.bookingId, e])).values()]
          : result.items,
      );
      setNextEvent(result.nextAfterId);
    } catch (err) {
      if (version === listEpoch.current) notify.error(err);
    } finally {
      if (version === listEpoch.current) setLoadingEvents(false);
    }
  };
  useEffect(() => {
    setEvents([]);
    setNextEvent(null);
    listEpoch.current++;
  }, [accountId, phase]);
  useLiveRefresh(
    async (isCurrent) => {
      const version = ++listEpoch.current;
      setLoadingEvents(true);
      try {
        const result = await api.events(eventQuery, undefined, phase);
        if (isCurrent() && version === listEpoch.current) {
          setEventActor(accountId);
          setEvents(result.items);
          setNextEvent(result.nextAfterId);
        }
      } catch (err) {
        if (isCurrent()) notify.error(err);
      } finally {
        if (isCurrent() && version === listEpoch.current) setLoadingEvents(false);
      }
    },
    {
      scope: `staff-event-list:${accountId}:${phase}`,
      enabled: authenticated,
      initial: true,
      blocked,
      types: ['staff.updated', 'booking.updated'],
    },
  );
  const refreshWorkspace = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const result = await api.read(eventId);
      if (current.current.eventId === eventId && current.current.accountId === accountId) {
        setSnapshotActor(accountId);
        setSnapshot(result);
      }
    } catch (err) {
      if (current.current.eventId === eventId) {
        setSnapshot(null);
        notify.error(err);
      }
    } finally {
      if (current.current.eventId === eventId) setLoading(false);
    }
  };
  useLiveRefresh(
    async (isCurrent) => {
      setLoading(true);
      try {
        const result = await api.read(eventId);
        if (isCurrent()) {
          setSnapshotActor(accountId);
          setSnapshot(result);
        }
      } catch (err) {
        if (isCurrent()) {
          setSnapshot(null);
          notify.error(err);
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    {
      scope: `staff-workspace:${accountId}:${eventId}`,
      bookingId: eventId,
      enabled: authenticated && Boolean(eventId),
      blocked: blocked || configuring,
      initial: true,
      types: [
        'staff.updated',
        'guest.updated',
        'seating.updated',
        'timeline.updated',
        'booking.updated',
      ],
    },
  );
  const configure = async () => {
    if (!workspace || configuring) return;
    setConfiguring(true);
    const body = {
      checkInMode:
        workspace.settings.checkInMode === 'NONE' ? ('BY_GUEST_NAME' as const) : ('NONE' as const),
      expectedRevision: workspace.settings.revision,
    };
    try {
      await staffCommand(`${accountId}:${eventId}:settings:${body.expectedRevision}`, body, (key) =>
        api.configure(eventId, body, key),
      );
      notify.success('Đã cập nhật chế độ check-in.');
      await refreshWorkspace();
    } catch (err) {
      notify.error(err);
    } finally {
      setConfiguring(false);
    }
  };
  return {
    bookingId,
    setBookingId,
    eventId,
    resolveEventId,
    workspace,
    refreshWorkspace,
    loading,
    configuring,
    configure,
    events: eventActor === accountId ? events : [],
    nextEvent: eventActor === accountId ? nextEvent : null,
    phase,
    setPhase,
    eventQuery,
    setEventQuery,
    loadingEvents,
    loadEvents,
  };
}
