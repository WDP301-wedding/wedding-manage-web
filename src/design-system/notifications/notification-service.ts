import type { NotificationItem, NotificationOptions, NotificationType } from './notification-types';
import { presentError, vietnameseMessage } from '../../lib/api/error-presentation';
type NotificationListener = (notification: NotificationItem) => void;
type DismissListener = (id: string) => void;
type ClearListener = () => void;

class NotificationService {
  private readonly listeners = new Set<NotificationListener>();
  private readonly dismissListeners = new Set<DismissListener>();
  private readonly clearListeners = new Set<ClearListener>();

  public subscribe(
    onNotify: NotificationListener,
    onDismiss: DismissListener,
    onClear: ClearListener,
  ): () => void {
    this.listeners.add(onNotify);
    this.dismissListeners.add(onDismiss);
    this.clearListeners.add(onClear);

    return () => {
      this.listeners.delete(onNotify);
      this.dismissListeners.delete(onDismiss);
      this.clearListeners.delete(onClear);
    };
  }

  public show(type: NotificationType, message: string, options?: NotificationOptions): string {
    const id = 'notif_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now();
    const durationMs = options?.durationMs ?? (type === 'error' ? 8000 : 5000);

    const item: NotificationItem = {
      id,
      type,
      message: type === 'error' ? presentError(message).message : message,
      title: options?.title,
      requestId: options?.requestId,
      durationMs,
      createdAt: Date.now(),
    };

    for (const listener of this.listeners) {
      listener(item);
    }

    return id;
  }

  public success(message: string, options?: NotificationOptions): string {
    return this.show('success', message, { title: 'Thao tác thành công', ...options });
  }

  public warning(message: string, options?: NotificationOptions): string {
    return this.show('warning', message, { title: 'Cảnh báo', ...options });
  }

  public info(message: string, options?: NotificationOptions): string {
    return this.show('info', message, { title: 'Thông báo', ...options });
  }

  public error(errorOrMessage: unknown, options?: NotificationOptions): string {
    const parsed = this.parseError(errorOrMessage, options);
    return this.show('error', parsed.message, {
      ...options,
      title: parsed.title,
      requestId: parsed.requestId,
    });
  }

  public dismiss(id: string): void {
    for (const listener of this.dismissListeners) {
      listener(id);
    }
  }

  public clearAll(): void {
    for (const listener of this.clearListeners) {
      listener();
    }
  }

  private parseError(
    err: unknown,
    options?: NotificationOptions,
  ): { title: string; message: string; requestId?: string | undefined } {
    const parsed = presentError(err);
    const fallback =
      vietnameseMessage(options?.message) ?? vietnameseMessage(options?.fallbackMessage);
    const message =
      parsed.code || parsed.requestId
        ? parsed.message
        : (vietnameseMessage(
            typeof err === 'string' ? err : err instanceof Error ? err.message : undefined,
          ) ??
          fallback ??
          parsed.message);
    return {
      title: vietnameseMessage(options?.title) ?? 'Không thể hoàn tất thao tác',
      message,
      requestId: parsed.requestId ?? options?.requestId,
    };
  }
}

export const notify = new NotificationService();
