'use client';

import { useEffect } from 'react';
import { addCatalogInvalidationListener } from './catalog-cache';

/** Coalesces event bursts and defers background refresh while a form is dirty.
 * Existing editors keep their draft/revision until save/reset/unmount.
 */
const dirtyForms = new Set<HTMLFormElement>();
export function hasDirtyCatalogForms(): boolean {
  for (const form of dirtyForms) if (!form.isConnected) dirtyForms.delete(form);
  return dirtyForms.size > 0;
}

export function useCatalogLiveRefresh(refresh: (background?: boolean) => Promise<void>): void {
  useEffect(() => {
    let disposed = false;
    let pending = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const markDirty = (event: Event) => {
      const form = event.target instanceof Element ? event.target.closest('form') : null;
      if (form) dirtyForms.add(form);
    };
    const reset = (event: Event) => {
      if (event.target instanceof HTMLFormElement) dirtyForms.delete(event.target);
      if (pending) schedule();
    };
    const schedule = () => {
      if (!disposed && timer === null)
        timer = setTimeout(() => {
          timer = null;
          void flush();
        }, 400);
    };
    const flush = async () => {
      if (disposed || inFlight || !pending) return;
      if (hasDirtyCatalogForms()) return;
      pending = false;
      inFlight = true;
      try {
        await refresh(true);
        if (hasDirtyCatalogForms()) pending = true;
      } finally {
        inFlight = false;
        if (pending && !hasDirtyCatalogForms()) schedule();
      }
    };
    const observer = new MutationObserver(() => {
      if (pending && !hasDirtyCatalogForms()) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('input', markDirty, true);
    document.addEventListener('change', markDirty, true);
    document.addEventListener('reset', reset, true);
    const unsubscribe = addCatalogInvalidationListener(() => {
      pending = true;
      schedule();
    });
    return () => {
      disposed = true;
      unsubscribe();
      observer.disconnect();
      hasDirtyCatalogForms();
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener('input', markDirty, true);
      document.removeEventListener('change', markDirty, true);
      document.removeEventListener('reset', reset, true);
    };
  }, [refresh]);
}
