'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearCatalogCache } from '../venue-catalog/catalog-api';
import {
  type ManagementIdentitySession,
  sharedManagementSession,
  type ManagementSessionSnapshot,
} from './session';

export interface UseManagementSessionOptions {
  session?: ManagementIdentitySession | undefined;
  onLogoutCleanup?: (() => void) | undefined;
}

export function useManagementSession(options: UseManagementSessionOptions = {}) {
  const session = options.session ?? sharedManagementSession;
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void session.restore().then((snap) => {
      if (active) setSnapshot(snap);
    });
    return () => {
      active = false;
    };
  }, [session]);

  const onLogoutCleanupRef = useRef(options.onLogoutCleanup);
  useEffect(() => {
    onLogoutCleanupRef.current = options.onLogoutCleanup;
  }, [options.onLogoutCleanup]);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await session.logout();
      // Purge session-specific catalog cache entries on logout
      clearCatalogCache();
    } catch {
      setLogoutError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.');
    } finally {
      setSnapshot(session.snapshot());
      setLoggingOut(false);
      onLogoutCleanupRef.current?.();
    }
  }, [session]);

  return {
    snapshot,
    setSnapshot,
    loggingOut,
    logoutError,
    logout,
    session,
  };
}
