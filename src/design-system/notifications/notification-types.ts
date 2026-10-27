export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  title?: string | undefined;
  message?: string | undefined;
  fallbackMessage?: string | undefined;
  durationMs?: number | undefined;
  requestId?: string | undefined;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string | undefined;
  message: string;
  requestId?: string | undefined;
  durationMs: number;
  createdAt: number;
}

export interface NotificationContextValue {
  notifications: readonly NotificationItem[];
  show: (type: NotificationType, message: string, options?: NotificationOptions) => string;
  success: (message: string, options?: NotificationOptions) => string;
  error: (errorOrMessage: unknown, options?: NotificationOptions) => string;
  warning: (message: string, options?: NotificationOptions) => string;
  info: (message: string, options?: NotificationOptions) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}
