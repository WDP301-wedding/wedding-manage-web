import type { CSSProperties } from 'react';

export const staffStyles = {
  tabContainer: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  } satisfies CSSProperties,

  tabButton: (active: boolean): CSSProperties => ({
    padding: '0.625rem 1.25rem',
    borderRadius: 6,
    fontWeight: 600,
    border: '1px solid #d1d5db',
    background: active ? '#111827' : '#fff',
    color: active ? '#fff' : '#374151',
    cursor: 'pointer',
  }),

  cardBox: {
    background: '#f9fafb',
    padding: '1.5rem',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    marginBottom: '2rem',
  } satisfies CSSProperties,

  cardTitle: {
    fontSize: '1.25rem',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  cardSubtitle: {
    color: '#6b7280',
    fontSize: '0.9rem',
    marginBottom: '1.25rem',
  } satisfies CSSProperties,

  searchForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)) auto',
    gap: '1rem',
    alignItems: 'flex-end',
  } satisfies CSSProperties,

  fieldLabel: {
    display: 'block',
    fontWeight: 600,
    marginBottom: '0.25rem',
    fontSize: '0.875rem',
  } satisfies CSSProperties,

  input: {
    width: '100%',
    padding: '0.625rem',
    borderRadius: 6,
    border: '1px solid #d1d5db',
  } satisfies CSSProperties,

  primaryButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.625rem 1.5rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    height: '42px',
  }),

  emptyBox: {
    padding: '3rem 1rem',
    textAlign: 'center',
    background: '#fff',
    border: '1px dashed #d1d5db',
    borderRadius: 8,
  } satisfies CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
  } satisfies CSSProperties,

  tableHeadRow: {
    background: '#f3f4f6',
    textAlign: 'left',
    borderBottom: '2px solid #e5e7eb',
  } satisfies CSSProperties,

  tableHeadCell: {
    padding: '0.875rem 1rem',
  } satisfies CSSProperties,

  tableBodyRow: {
    borderBottom: '1px solid #e5e7eb',
  } satisfies CSSProperties,

  tableCell: {
    padding: '1rem',
  } satisfies CSSProperties,

  groupBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.625rem',
    borderRadius: 9999,
    fontSize: '0.75rem',
    background: '#e0e7ff',
    color: '#3730a3',
  } satisfies CSSProperties,

  statusBadge: (checkedIn: boolean): CSSProperties => ({
    display: 'inline-block',
    padding: '0.25rem 0.625rem',
    borderRadius: 9999,
    fontSize: '0.75rem',
    fontWeight: 600,
    background: checkedIn ? '#d1fae5' : '#fef3c7',
    color: checkedIn ? '#065f46' : '#92400e',
  }),

  checkinButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 700,
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  }),

  undoButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    background: '#fee2e2',
    color: '#b91c1c',
    border: '1px solid #f87171',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),

  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
  } satisfies CSSProperties,

  adminCard: {
    background: '#fff',
    padding: '1.5rem',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  } satisfies CSSProperties,

  adminCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  formColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } satisfies CSSProperties,

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  } satisfies CSSProperties,

  fieldHint: {
    color: '#6b7280',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  } satisfies CSSProperties,

  successBox: {
    background: '#f0fdf4',
    padding: '1rem',
    borderRadius: 6,
    border: '1px solid #bbf7d0',
    color: '#15803d',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  errorBox: {
    background: '#fef2f2',
    padding: '1rem',
    borderRadius: 6,
    border: '1px solid #fecaca',
    color: '#b91c1c',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  roleBadge: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 600,
    background: '#e0f2fe',
    color: '#0369a1',
  } satisfies CSSProperties,

  revokeButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.375rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),

  refreshButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.375rem 0.75rem',
    fontSize: '0.8rem',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    background: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
};
