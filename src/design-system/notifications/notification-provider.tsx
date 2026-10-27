'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  NotificationContextValue,
  NotificationItem,
  NotificationOptions,
  NotificationType,
} from './notification-types';
import { notify } from './notification-service';
import { NotificationToast } from './notification-toast';
import styles from './notification.module.css';

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const unsubscribe = notify.subscribe(
      (newItem) => {
        setNotifications((prev) => {
          // Limit stack to maximum 5 notifications to prevent overflowing screen
          const filtered = prev.slice(-4);
          return [...filtered, newItem];
        });
      },
      (id) => {
        dismiss(id);
      },
      () => {
        clearAll();
      },
    );

    return unsubscribe;
  }, [dismiss, clearAll]);

  const show = useCallback(
    (type: NotificationType, message: string, options?: NotificationOptions) => {
      return notify.show(type, message, options);
    },
    [],
  );

  const success = useCallback((message: string, options?: NotificationOptions) => {
    return notify.success(message, options);
  }, []);

  const error = useCallback((errorOrMessage: unknown, options?: NotificationOptions) => {
    return notify.error(errorOrMessage, options);
  }, []);

  const warning = useCallback((message: string, options?: NotificationOptions) => {
    return notify.warning(message, options);
  }, []);

  const info = useCallback((message: string, options?: NotificationOptions) => {
    return notify.info(message, options);
  }, []);

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      show,
      success,
      error,
      warning,
      info,
      dismiss,
      clearAll,
    }),
    [notifications, show, success, error, warning, info, dismiss, clearAll],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notifications.length > 0 && (
        <div className={styles.container} aria-label="Khu vực thông báo hệ thống">
          {notifications.map((item) => (
            <NotificationToast key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    // If used outside NotificationProvider, fallback directly to the global notify service methods
    return {
      notifications: [],
      show: (type, msg, opts) => notify.show(type, msg, opts),
      success: (msg, opts) => notify.success(msg, opts),
      error: (err, opts) => notify.error(err, opts),
      warning: (msg, opts) => notify.warning(msg, opts),
      info: (msg, opts) => notify.info(msg, opts),
      dismiss: (id) => notify.dismiss(id),
      clearAll: () => notify.clearAll(),
    };
  }
  return context;
}
