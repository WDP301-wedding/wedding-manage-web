import { useMemo, useState } from 'react';
import type { PublicHall } from '../../services/catalog.service';

export type HallSortField = 'name' | 'maxGuests';
export type SortOrder = 'asc' | 'desc';

/** Lọc, sắp xếp và phân trang danh mục sảnh trên trang Tổng quan (dữ liệu đã tải đủ ở client). */
export function useDashboardHalls(halls: readonly PublicHall[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<HallSortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const handleSortChange = (field: HallSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'maxGuests' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleQuickSortChange = (val: string) => {
    const [f, o] = val.split('-') as [HallSortField, SortOrder];
    setSortField(f);
    setSortOrder(o);
    setCurrentPage(1);
  };

  const sortedHalls = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? halls.filter(
          (h) =>
            (h.name || '').toLowerCase().includes(q) ||
            (h.description || '').toLowerCase().includes(q),
        )
      : halls;
    return [...filtered].sort((a, b) => {
      const cmp =
        sortField === 'name'
          ? (a.name || '').localeCompare(b.name || '', 'vi')
          : (a.maxGuests || 0) - (b.maxGuests || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [halls, searchQuery, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedHalls.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedHalls.length);

  return {
    searchQuery,
    setSearchQuery: (value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);
    },
    sortField,
    sortOrder,
    handleSortChange,
    handleQuickSortChange,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    setCurrentPage,
    sortedHalls,
    paginatedHalls: sortedHalls.slice(startIndex, endIndex),
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
  };
}
