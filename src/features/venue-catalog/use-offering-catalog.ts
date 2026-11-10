'use client';
import { useCallback, useRef, useState } from 'react';
import { axiosApiClient } from '../../lib/api/axios-client';
import { notify } from '../../design-system/notifications';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import type { Authorize } from './catalog-tabs';
import { catalogErrorMessage } from './catalog-forms';
import {
  offeringBody,
  offeringCatalogs,
  offeringItem,
  type OfferingDraft,
  type OfferingItem,
  type OfferingKind,
  type OfferingResponse,
} from './offering-catalog-api';

export function useOfferingCatalog(kind: OfferingKind, authorize: Authorize) {
  const [items, setItems] = useState<readonly OfferingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const path = offeringCatalogs[kind].path;
  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      try {
        const all: OfferingItem[] = [];
        const seen = new Set<string>();
        let cursor: string | null = null;
        do {
          const response = await authorize((token) =>
            axiosApiClient.get<{ data: { items: OfferingResponse[]; nextCursor: string | null } }>(
              path,
              {
                params: { limit: 50, ...(cursor ? { cursor } : {}) },
                headers: { Authorization: `Bearer ${token}` },
              },
            ),
          );
          all.push(...response.data.data.items.map(offeringItem));
          cursor = response.data.data.nextCursor;
          if (cursor && seen.has(cursor)) throw new Error('Repeated catalog cursor');
          if (cursor) seen.add(cursor);
        } while (cursor);
        if (isCurrent()) {
          setItems(all);
          setError(null);
          setLoaded(true);
        }
      } catch {
        if (isCurrent()) setError('Chưa tải được danh mục. Hãy thử tải lại.');
      }
    },
    [authorize, path],
  );
  useLiveRefresh(load, {
    scope: `offerings-${kind}`,
    types: ['catalog.updated'],
    initial: true,
    blocked: pending,
    invalidateOnBlock: true,
  });

  const save = async (draft: OfferingDraft, item: OfferingItem | null, active: boolean) => {
    if (lock.current) return null;
    const body = {
      ...offeringBody(kind, draft, active),
      ...(item ? { expectedRevision: item.revision } : {}),
    };
    const url = path + (item ? `/${item.id}` : '');
    const fingerprint = JSON.stringify([url, body]);
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await authorize((token) =>
        axiosApiClient.request<{ data: OfferingResponse }>({
          method: item ? 'PATCH' : 'POST',
          url,
          data: body,
          headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': intent.current!.key },
        }),
      );
      const saved = offeringItem(response.data.data);
      intent.current = null;
      setItems((current) =>
        item
          ? current.map((value) => (value.id === saved.id ? saved : value))
          : [...current, saved],
      );
      notify.success('Đã lưu thay đổi. Các thỏa thuận đã chốt giữ nguyên.');
      await load();
      return saved;
    } catch (cause) {
      setError(catalogErrorMessage(cause));
      notify.error(cause);
      return null;
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return { items, loaded, pending, error, load, save };
}
