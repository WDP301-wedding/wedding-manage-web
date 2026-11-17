'use client';

import { useCallback, useMemo, useState } from 'react';

export function useCatalogPagination<T>(
  items: readonly T[],
  initialPageSize = 10,
  pageSizes: readonly number[] = [5, 10, 20],
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  return {
    page: safePage,
    setPage,
    pageSize,
    pageSizes,
    setPageSize: changePageSize,
    totalPages,
    startIndex,
    endIndex,
    totalItems: items.length,
    paginatedItems,
    resetPage,
  };
}
