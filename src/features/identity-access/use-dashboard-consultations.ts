import { useMemo, useState } from 'react';
import type { ConsultationRequestItem } from '../../services/consultation.service';

export type ConsultationSortField = 'createdAt' | 'displayName' | 'preferredDate' | 'status';
export type SortOrder = 'asc' | 'desc';

export function useDashboardConsultations(consultations: readonly ConsultationRequestItem[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<ConsultationSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const handleSortChange = (field: ConsultationSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleQuickSortChange = (val: string) => {
    const [f, o] = val.split('-') as [ConsultationSortField, SortOrder];
    setSortField(f);
    setSortOrder(o);
    setCurrentPage(1);
  };

  const filteredConsultations = useMemo(() => {
    return consultations.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (item.displayName || '').toLowerCase().includes(q);
        const emailMatch = (item.email || '').toLowerCase().includes(q);
        const phoneMatch = (item.phone || '').toLowerCase().includes(q);
        const idMatch = (item.consultationId || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || idMatch;
      }
      return true;
    });
  }, [consultations, statusFilter, searchQuery]);

  const sortedConsultations = useMemo(() => {
    return [...filteredConsultations].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'createdAt') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = timeA - timeB;
      } else if (sortField === 'displayName') {
        cmp = (a.displayName || '').localeCompare(b.displayName || '', 'vi');
      } else if (sortField === 'preferredDate') {
        if (!a.preferredDate && !b.preferredDate) cmp = 0;
        else if (!a.preferredDate) cmp = 1;
        else if (!b.preferredDate) cmp = -1;
        else cmp = new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime();
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredConsultations, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedConsultations.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedConsultations.length);
  const paginatedConsultations = sortedConsultations.slice(startIndex, endIndex);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    sortOrder,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    handleSortChange,
    handleQuickSortChange,
    sortedConsultations,
    paginatedConsultations,
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
  };
}
