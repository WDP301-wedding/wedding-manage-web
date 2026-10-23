'use client';

import { io, type Socket } from 'socket.io-client';
import { readPublicEnv } from '../../lib/env';

export type RealtimeEventType =
  | 'booking.updated'
  | 'proposal.updated'
  | 'timeline.updated'
  | 'contract.updated'
  | 'deposit.received'
  | 'billing.updated'
  | 'guest.updated'
  | 'seating.updated'
  | 'print_order.updated'
  | 'catalog.updated'
  | 'notification.received'
  | 'session.revoked';

export interface RealtimeScope {
  readonly entityType: 'booking' | 'catalog' | 'account' | 'print_order' | 'session';
  readonly entityId?: string | undefined;
  readonly bookingId?: string | undefined;
  readonly revision?: number | undefined;
}

export interface RealtimeEvent<T = Record<string, unknown>> {
  readonly eventId: string;
  readonly schemaVersion: 1;
  readonly type: RealtimeEventType;
  readonly scope: RealtimeScope;
  readonly resources: readonly string[];
  readonly occurredAt: string;
  readonly payload?: T | undefined;
}

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type RealtimeEventListener = (event: RealtimeEvent) => void;
export type RealtimeResyncListener = () => void;
export type RealtimeStatusListener = (status: RealtimeStatus) => void;

export function resolveRealtimeSocketUrl(): string {
  try {
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_REALTIME_URL) {
      return new URL(process.env.NEXT_PUBLIC_REALTIME_URL).origin;
    }
    const apiBase = readPublicEnv().NEXT_PUBLIC_API_BASE_URL;
    const parsed = new URL(apiBase);
    // In local dev, if NEXT_PUBLIC_API_BASE_URL points to Next.js Manager/Couple BFF (port 3000 or 3002),
    // backend WebSocket is running on port 3001.
    if (parsed.port === '3000' || parsed.port === '3002') {
      return `${parsed.protocol}//${parsed.hostname}:3001`;
    }
    return parsed.origin;
  } catch {
    return 'http://127.0.0.1:3001';
  }
}

export class ManagementRealtimeManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private status: RealtimeStatus = 'disconnected';
  private readonly eventListeners = new Set<RealtimeEventListener>();
  private readonly resyncListeners = new Set<RealtimeResyncListener>();
  private readonly statusListeners = new Set<RealtimeStatusListener>();
  private readonly activeSubscriptions = new Map<string, number>();
  private readonly seenEventIds = new Set<string>();

  connect(token: string): void {
    if (typeof window === 'undefined') return;

    this.token = token;

    if (this.socket) {
      this.socket.auth = { token };
      if (this.socket.connected) {
        return;
      }
      this.socket.disconnect();
    }

    this.setStatus('connecting');

    const socket = io(resolveRealtimeSocketUrl(), {
      path: '/realtime',
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.3,
      timeout: 10000,
    });

    this.socket = socket;

    socket.on('connect', () => {
      this.setStatus('connected');
      this.resubscribeAll();
      this.triggerResync();
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        this.setStatus('disconnected');
      } else {
        this.setStatus('reconnecting');
      }
    });

    socket.on('connect_error', (_error) => {
      this.setStatus('reconnecting');
    });

    socket.on('realtime:event', (payload: unknown) => {
      if (!this.isValidEvent(payload)) return;
      if (this.seenEventIds.has(payload.eventId)) {
        return;
      }
      if (this.seenEventIds.size >= 10000) {
        const iter = this.seenEventIds.values();
        for (let i = 0; i < 2000; i++) {
          const next = iter.next();
          if (next.done) break;
          this.seenEventIds.delete(next.value);
        }
      }
      this.seenEventIds.add(payload.eventId);

      for (const listener of this.eventListeners) {
        try {
          listener(payload);
        } catch {
          // Prevent listener errors from breaking dispatch
        }
      }
    });

    socket.on('realtime:resync', () => {
      this.triggerResync();
    });

    socket.on('subscription:confirmed', () => {
      this.setStatus('connected');
    });

    socket.on('subscription:denied', () => {
      this.setStatus('connected');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.activeSubscriptions.clear();
    this.setStatus('disconnected');
  }

  updateToken(token: string): void {
    this.token = token;
    if (this.socket) {
      this.socket.auth = { token };
      if (this.socket.disconnected) {
        this.socket.connect();
      }
    }
  }

  subscribeBooking(bookingId: string): () => void {
    const current = this.activeSubscriptions.get(bookingId) ?? 0;
    this.activeSubscriptions.set(bookingId, current + 1);

    if (current === 0 && this.socket?.connected) {
      this.socket.emit('subscribe:booking', { bookingId });
    }

    return () => {
      const remaining = (this.activeSubscriptions.get(bookingId) ?? 1) - 1;
      if (remaining <= 0) {
        this.activeSubscriptions.delete(bookingId);
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe:booking', { bookingId });
        }
      } else {
        this.activeSubscriptions.set(bookingId, remaining);
      }
    };
  }

  addEventListener(listener: RealtimeEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  addResyncListener(listener: RealtimeResyncListener): () => void {
    this.resyncListeners.add(listener);
    return () => {
      this.resyncListeners.delete(listener);
    };
  }

  addStatusListener(listener: RealtimeStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  private setStatus(newStatus: RealtimeStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const listener of this.statusListeners) {
      try {
        listener(newStatus);
      } catch {
        // Ignore
      }
    }
  }

  private triggerResync(): void {
    for (const listener of this.resyncListeners) {
      try {
        listener();
      } catch {
        // Ignore
      }
    }
  }

  private resubscribeAll(): void {
    if (!this.socket?.connected) return;
    for (const bookingId of this.activeSubscriptions.keys()) {
      this.socket.emit('subscribe:booking', { bookingId });
    }
  }

  private isValidEvent(payload: unknown): payload is RealtimeEvent {
    if (!payload || typeof payload !== 'object') return false;
    const evt = payload as Record<string, unknown>;
    return (
      typeof evt.eventId === 'string' &&
      evt.schemaVersion === 1 &&
      typeof evt.type === 'string' &&
      typeof evt.occurredAt === 'string' &&
      typeof evt.scope === 'object' &&
      evt.scope !== null &&
      Array.isArray(evt.resources)
    );
  }
}

export const sharedManagementRealtime = new ManagementRealtimeManager();
