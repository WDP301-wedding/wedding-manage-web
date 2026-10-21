'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiClientError, createApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import { sharedManagementSession, type ManagementSessionSnapshot } from '../identity-access/session';

const session = sharedManagementSession;
let resolvedApi: ReturnType<typeof createApiClient> | undefined;
const getApi = () => (resolvedApi ??= createApiClient());

export type Queue = components['schemas']['ConsultationRequestList'];
export type Item = Queue['data'][number];
export type StatusFilter = 'ALL' | 'NEW' | 'CONVERTED' | 'CLOSED';
export type SortOption = 'newest' | 'oldest' | 'date-asc' | 'guests-desc' | 'name-asc';

export function useConsultationRequests() {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [access, setAccess] = useState<'loading' | 'manager' | 'denied'>('loading');
  const [queue, setQueue] = useState<Queue | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filter & sort state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const load = useCallback(async (cursor?: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await session.authorize((token) =>
        getApi().GET('/management/consultation-requests', {
          headers: { Authorization: `Bearer ${token}` },
          params: { query: { limit: 20, ...(cursor ? { cursor } : {}) } },
        }),
      );
      if (!result.data) throw new Error('Không tải được danh sách.');
      const page: Queue = {
        ...result.data,
        data: Array.from(result.data.data, (item) => ({ ...item })),
      };
      setQueue((previous) =>
        cursor && previous ? { ...page, data: [...previous.data, ...page.data] } : page,
      );
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
        setQueue(null);
        setAccess('denied');
      }
      setError('Không tải được yêu cầu tư vấn. Hãy thử lại.');
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void session
      .restore()
      .then((snap) => {
        if (!active) return;
        setSnapshot(snap);
        if (snap.status !== 'authenticated' || snap.presentation !== 'manager') {
          setAccess('denied');
          return;
        }
        setAccess('manager');
        void load();
      })
      .catch(() => {
        if (active) setAccess('denied');
      });
    return () => {
      active = false;
    };
  }, [load]);

  async function act(item: Item, action: 'conversion' | 'closure') {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await session.authorize((token) =>
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
      setNotice(
        action === 'conversion'
          ? 'Đã mở hồ sơ tư vấn. Chọn Tiếp tục đặt tiệc để gửi lời mời và chuẩn bị đề xuất.'
          : 'Đã đóng yêu cầu tư vấn.',
      );
      await load();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
        setQueue(null);
        setAccess('denied');
      }
      setError('Không hoàn tất được thao tác. Tải lại để kiểm tra trạng thái mới nhất.');
    } finally {
      setPending(false);
    }
  }

  const logout = () => {
    setPending(true);
    setError(null);
    setNotice(null);
    void session
      .logout()
      .catch(() =>
        setError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setQueue(null);
        setAccess('denied');
        setPending(false);
      });
  };

  const stats = useMemo(() => {
    const data = queue?.data ?? [];
    return {
      total: data.length,
      newCount: data.filter((i) => i.status === 'NEW').length,
      convertedCount: data.filter((i) => i.status === 'CONVERTED').length,
      closedCount: data.filter((i) => i.status === 'CLOSED').length,
    };
  }, [queue?.data]);

  const filteredItems = useMemo(() => {
    if (!queue?.data) return [];
    let list = [...queue.data];

    if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.displayName ?? '').toLowerCase().includes(q) ||
          (item.email ?? '').toLowerCase().includes(q) ||
          (item.phone ?? '').toLowerCase().includes(q) ||
          (item.message ?? '').toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-asc': {
          if (!a.preferredDate && !b.preferredDate) return 0;
          if (!a.preferredDate) return 1;
          if (!b.preferredDate) return -1;
          return new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime();
        }
        case 'guests-desc':
          return (b.expectedGuests ?? 0) - (a.expectedGuests ?? 0);
        case 'name-asc':
          return (a.displayName ?? '').localeCompare(b.displayName ?? '', 'vi');
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [queue?.data, statusFilter, searchQuery, sortBy]);

  return {
    snapshot,
    access,
    queue,
    pending,
    error,
    notice,
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
