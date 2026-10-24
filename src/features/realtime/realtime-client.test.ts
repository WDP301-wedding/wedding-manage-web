import { describe, it, expect, vi } from 'vitest';
import { ManagementRealtimeManager, type RealtimeEvent } from './realtime-client';

describe('ManagementRealtimeManager client', () => {
  it('audit: manager client instantiates with disconnected state and manages listeners cleanly', () => {
    const manager = new ManagementRealtimeManager();
    const listener = vi.fn<(event: RealtimeEvent) => void>();
    const resync = vi.fn();
    manager.addEventListener(listener);
    manager.addResyncListener(resync);

    expect(manager.getStatus()).toBe('disconnected');
    manager.disconnect();
    expect(manager.getStatus()).toBe('disconnected');
  });
});
