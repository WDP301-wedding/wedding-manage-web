'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notify } from '../../design-system/notifications';
import type { Authorize, BookingSelections, ManagementBookingGateway } from './booking-api';

export interface UseBookingCatalogOptions {
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  autoLoadCatalog?: boolean;
}

export function useBookingCatalog({
  authorize,
  gateway,
  run,
  autoLoadCatalog = false,
}: UseBookingCatalogOptions) {
  const [selections, setSelections] = useState<BookingSelections | null>(null);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<BookingSelections | null> | null>(null);
  const autoLoadedRef = useRef(false);

  const loadCatalog = useCallback((): Promise<BookingSelections | null> => {
    if (inFlightRef.current !== null) {
      return inFlightRef.current;
    }
    setLoadingSelections(true);
    setLoadError(null);
    const promise = run('catalog', () => authorize((token) => gateway.loadSelections(token)))
      .then((result) => {
        if (result !== null) {
          setSelections(result);
          setLoadError(null);
        } else {
          const msg =
            'Không thể tải danh mục đặt tiệc. Vui lòng bấm "Tải lại danh mục đặt tiệc" để thử lại.';
          setLoadError(msg);
          notify.error(msg);
        }
        return result;
      })
      .catch((err) => {
        const msg =
          'Không thể tải danh mục đặt tiệc. Vui lòng bấm "Tải lại danh mục đặt tiệc" để thử lại.';
        setLoadError(msg);
        notify.error(err, { fallbackMessage: msg });
        return null;
      })
      .finally(() => {
        inFlightRef.current = null;
        setLoadingSelections(false);
      });

    inFlightRef.current = promise;
    return promise;
  }, [authorize, gateway, run]);

  useEffect(() => {
    if (
      autoLoadCatalog &&
      selections === null &&
      !autoLoadedRef.current &&
      inFlightRef.current === null
    ) {
      autoLoadedRef.current = true;
      void loadCatalog();
    }
  }, [autoLoadCatalog, selections, loadCatalog]);

  return {
    selections,
    loadingSelections,
    loadError,
    loadCatalog,
  };
}
