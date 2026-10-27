'use client';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { ApiClientError, createApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import {
  sharedManagementSession,
  type ManagementSessionSnapshot,
} from '../identity-access/session';
import { notify } from '../../design-system/notifications';

const session = sharedManagementSession;
let resolvedApi: ReturnType<typeof createApiClient> | undefined;
const getApi = () => (resolvedApi ??= createApiClient());
export type Item = components['schemas']['ConsultationRequestList']['data'][number] & {
  bookingId?: string | null;
  bookingPhase?: string | null;
};
export type Queue = Omit<components['schemas']['ConsultationRequestList'], 'data'> & {
  data: readonly Item[];
  totalMatches: number;
  counts: { NEW: number; CONVERTED: number; CLOSED: number };
};
export type StatusFilter = 'ALL' | 'NEW' | 'CONVERTED' | 'CLOSED';
export type SortOption = 'newest' | 'oldest' | 'date-asc' | 'guests-desc' | 'name-asc';
const metadata = z.object({
  totalMatches: z.number().int().nonnegative(),
  counts: z.object({
    NEW: z.number().int().nonnegative(),
    CONVERTED: z.number().int().nonnegative(),
    CLOSED: z.number().int().nonnegative(),
  }),
});
export function useConsultationRequests() {
  const actionInFlight = useRef(false),
    invitationKeys = useRef(new Map<string, string>());
  const sequence = useRef(0),
    abort = useRef<AbortController | null>(null),
    queueFilter = useRef('');
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [access, setAccess] = useState<'loading' | 'manager' | 'denied'>('loading');
  const [resultKey, setResultKey] = useState('');
  const [queue, setQueue] = useState<Queue | null>(null),
    [pending, setPending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState(''),
    [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchQuery.trim().normalize('NFC')), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const filterKey = JSON.stringify([statusFilter, searchTerm, sortBy]);
  const load = useCallback(
    async (cursor?: string) => {
      if (cursor && queueFilter.current !== filterKey) return;
      const current = ++sequence.current;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setPending(true);
      try {
        const query: Record<string, string> = {};
        if (statusFilter !== 'ALL') query.status = statusFilter;
        if (searchTerm) query.search = searchTerm;
        if (sortBy !== 'newest') query.sortBy = sortBy;
        if (cursor) query.cursor = cursor;
        const result = await session.authorize((token) =>
          getApi().GET('/management/consultation-requests', {
            headers: { Authorization: `Bearer ${token}` },
            params: { query },
            signal: controller.signal,
          }),
        );
        if (current !== sequence.current || controller.signal.aborted) return;
        if (result.error) {
          const errObj = result.error as { code?: string; message?: string; requestId?: string };
          throw new ApiClientError({
            kind: 'api',
            code: errObj.code ?? 'REQUEST_FAILED',
            message: errObj.message ?? 'Request failed',
            requestId: errObj.requestId ?? crypto.randomUUID(),
            status: result.response?.status,
          });
        }
        if (!result.data) throw new Error('Dữ liệu yêu cầu tư vấn trống');
        const rawData = (Array.isArray(result.data.data) ? result.data.data : []) as Item[];
        const meta = metadata.safeParse(result.data);
        const resolvedMeta = meta.success
          ? meta.data
          : {
              totalMatches: rawData.length,
              counts: {
                NEW: rawData.filter((i) => i.status === 'NEW').length,
                CONVERTED: rawData.filter((i) => i.status === 'CONVERTED').length,
                CLOSED: rawData.filter((i) => i.status === 'CLOSED').length,
              },
            };
        const page: Queue = {
          ...result.data,
          ...resolvedMeta,
          nextCursor: result.data.nextCursor ?? null,
          data: rawData.map((item) => ({ ...item })),
        };
        queueFilter.current = filterKey;
        setResultKey(filterKey);
        setQueue((previous) => {
          if (!cursor || !previous) return page;
          const items = new Map(previous.data.map((item) => [item.id, item]));
          for (const item of page.data) items.set(item.id, item);
          return { ...page, data: [...items.values()] };
        });
      } catch (caught) {
        if (current !== sequence.current || controller.signal.aborted) return;
        if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
          setQueue(null);
          setAccess('denied');
        }
        notify.error(caught, {
          title: 'Yêu cầu tư vấn',
          message:
            caught instanceof ApiClientError && caught.code === 'CONSULTATION_LIST_CHANGED'
              ? 'Danh sách vừa thay đổi. Bấm tải lại để nhận kết quả mới.'
              : 'Không tải được yêu cầu tư vấn. Hãy thử lại.',
        });
      } finally {
        if (current === sequence.current) setPending(false);
      }
    },
    [filterKey, statusFilter, searchTerm, sortBy],
  );
  const loadLatest = useRef(load);
  useEffect(() => {
    loadLatest.current = load;
  }, [load]);
  useEffect(() => {
    let active = true;
    void session
      .restore()
      .then((snap) => {
        if (!active) return;
        setSnapshot(snap);
        setAccess(
          snap.status === 'authenticated' && snap.presentation === 'manager' ? 'manager' : 'denied',
        );
      })
      .catch(() => {
        if (active) setAccess('denied');
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (access === 'manager') void load();
    return () => {
      sequence.current++;
      abort.current?.abort();
    };
  }, [access, load]);
  useLiveRefresh(
    async () => {
      await loadLatest.current();
    },
    {
      scope: filterKey,
      enabled: access === 'manager',
      blocked: pending,
      types: ['booking.updated'],
    },
  );
  async function act(item: Item, action: 'conversion' | 'closure') {
    if (pending || actionInFlight.current) return;
    actionInFlight.current = true;
    setPending(true);
    try {
      const result = await session.authorize((token) =>
        action === 'conversion'
          ? getApi().POST('/management/consultation-requests/{id}/conversion', {
              headers: { Authorization: `Bearer ${token}` },
              params: { path: { id: item.id } },
            })
          : getApi().POST('/management/consultation-requests/{id}/closure', {
              headers: { Authorization: `Bearer ${token}` },
              params: { path: { id: item.id } },
            }),
      );
      if (result.error) {
        const errObj = result.error as { code?: string; message?: string; requestId?: string };
        throw new ApiClientError({
          kind: 'api',
          code: errObj.code ?? 'REQUEST_FAILED',
          message: errObj.message ?? 'Request failed',
          requestId: errObj.requestId ?? crypto.randomUUID(),
          status: result.response?.status,
        });
      }
      if (action === 'conversion') {
        const converted = z
          .object({
            data: z.object({
              consultationId: z.string().uuid(),
              consultationRevision: z.number().int().positive().optional(),
            }),
          })
          .safeParse(result.data);
        if (!converted.success) {
          await loadLatest.current();
          notify.warning(
            'Đã mở hồ sơ. Máy chủ chưa hỗ trợ gửi kích hoạt tại bước duyệt; hãy mở hồ sơ để gửi lời mời.',
          );
          return;
        }
        const { consultationId, consultationRevision } = converted.data.data;
        if (consultationRevision !== undefined) {
          let key = invitationKeys.current.get(consultationId);
          if (!key) {
            key = crypto.randomUUID();
            invitationKeys.current.set(consultationId, key);
          }
          try {
            await session.authorize((token) =>
              getApi().POST('/management/consultations/{consultationId}/workspace-invitations', {
                headers: { Authorization: 'Bearer ' + token },
                params: { path: { consultationId }, header: { 'Idempotency-Key': key } },
                body: { expectedRevision: consultationRevision },
              }),
            );
            invitationKeys.current.delete(consultationId);
          } catch (invitationErr) {
            await loadLatest.current();
            notify.error(invitationErr, {
              title: 'Gửi lời mời kích hoạt',
              message:
                'Đã mở hồ sơ nhưng chưa xác nhận gửi lời mời. Mở hồ sơ để kiểm tra và gửi lại; không cần đặt cọc để kích hoạt tài khoản.',
            });
            return;
          }
        }
      }
      notify.success(
        action === 'conversion'
          ? 'Đã mở hồ sơ tư vấn và phát hành lời mời kích hoạt tài khoản thành công.'
          : 'Đã đóng yêu cầu tư vấn.',
      );
      await loadLatest.current();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
        setQueue(null);
        setAccess('denied');
      }
      notify.error(caught);
    } finally {
      actionInFlight.current = false;
      setPending(false);
    }
  }

  const logout = () => {
    sequence.current++;
    abort.current?.abort();
    setPending(true);
    setQueue(null);
    setAccess('denied');
    void session
      .logout()
      .catch((err) => notify.error(err, { message: 'Không thể kết nối máy chủ để đăng xuất.' }))
      .finally(() => {
        setSnapshot(session.snapshot());
        setPending(false);
      });
  };
  const rawList = queue?.data ?? [];
  const stats = useMemo(() => {
    return {
      total: queue?.totalMatches ?? rawList.length,
      newCount:
        queue?.counts?.NEW ?? rawList.filter((item) => (item.status as string) === 'NEW').length,
      convertedCount:
        queue?.counts?.CONVERTED ??
        rawList.filter((item) => (item.status as string) === 'CONVERTED').length,
      closedCount:
        queue?.counts?.CLOSED ??
        rawList.filter((item) => (item.status as string) === 'CLOSED').length,
    };
  }, [queue, rawList]);
  const filteredItems = useMemo(() => {
    let list = [...rawList];
    if (statusFilter !== 'ALL') {
      list = list.filter((item) => (item.status as string) === statusFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (item) =>
          (item.displayName ?? '').toLowerCase().includes(q) ||
          (item.email ?? '').toLowerCase().includes(q) ||
          (item.phone && item.phone.includes(q)) ||
          item.id.toLowerCase().includes(q),
      );
    }
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'date-asc') {
      list.sort((a, b) => {
        if (!a.preferredDate && !b.preferredDate) return 0;
        if (!a.preferredDate) return 1;
        if (!b.preferredDate) return -1;
        return new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime();
      });
    } else if (sortBy === 'guests-desc') {
      list.sort((a, b) => (b.expectedGuests ?? 0) - (a.expectedGuests ?? 0));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '', 'vi'));
    }
    return list;
  }, [rawList, statusFilter, searchTerm, sortBy]);
  return {
    snapshot,
    access,
    queue,
    pending,
    error: null,
    notice: null,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    load,
    act,
    logout,
    stats,
    filteredItems,
  };
}
