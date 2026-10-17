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
    border: '1px solid var(--hy-outline, #eadfd6)',
    background: active ? 'var(--hy-wine, #7a1f3d)' : '#ffffff',
    color: active ? '#ffffff' : 'var(--hy-text, #2b1d22)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),

  cardBox: {
    background: 'var(--hy-surface-container, #fdf6ee)',
    padding: '1.5rem',
    borderRadius: 8,
    border: '1px solid var(--hy-outline, #eadfd6)',
    marginBottom: '2rem',
  } satisfies CSSProperties,

  cardTitle: {
    fontSize: '1.25rem',
    color: 'var(--hy-wine, #7a1f3d)',
    fontWeight: 600,
    marginBottom: '1rem',
  } satisfies CSSProperties,

  cardSubtitle: {
    color: 'var(--hy-text-muted, #6e5d63)',
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
    color: 'var(--hy-text, #2b1d22)',
  } satisfies CSSProperties,

  input: {
    width: '100%',
    padding: '0.625rem',
    borderRadius: 6,
    border: '1px solid var(--hy-outline, #eadfd6)',
    background: '#ffffff',
    color: 'var(--hy-text, #2b1d22)',
  } satisfies CSSProperties,

  primaryButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.625rem 1.5rem',
    background: disabled ? 'var(--hy-surface-container, #fdf6ee)' : 'var(--hy-wine, #7a1f3d)',
    color: disabled ? 'var(--hy-text-muted, #6e5d63)' : '#ffffff',
    border: disabled ? '1px solid var(--hy-outline, #eadfd6)' : 'none',
    borderRadius: 6,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    height: '42px',
  }),

  emptyBox: {
    padding: '3rem 1rem',
    textAlign: 'center',
    background: '#ffffff',
    border: '1px dashed var(--hy-outline, #eadfd6)',
    borderRadius: 8,
    color: 'var(--hy-text-muted, #6e5d63)',
  } satisfies CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#ffffff',
  } satisfies CSSProperties,

  tableHeadRow: {
    background: 'var(--hy-surface-container, #fdf6ee)',
    textAlign: 'left',
    borderBottom: '2px solid var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  tableHeadCell: {
    padding: '0.875rem 1rem',
    color: 'var(--hy-text, #2b1d22)',
    fontWeight: 600,
  } satisfies CSSProperties,

  tableBodyRow: {
    borderBottom: '1px solid var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  tableCell: {
    padding: '1rem',
    color: 'var(--hy-text, #2b1d22)',
  } satisfies CSSProperties,

  groupBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.625rem',
    borderRadius: 9999,
    fontSize: '0.75rem',
    fontWeight: 600,
    background: 'var(--hy-surface-container, #fdf6ee)',
    color: 'var(--hy-wine, #7a1f3d)',
    border: '1px solid var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  statusBadge: (checkedIn: boolean): CSSProperties => ({
    display: 'inline-block',
    padding: '0.25rem 0.625rem',
    borderRadius: 9999,
    fontSize: '0.75rem',
    fontWeight: 600,
    background: checkedIn
      ? 'var(--hy-status-success-bg, #e7f1ea)'
      : 'var(--hy-status-warning-bg, #fcefd6)',
    color: checkedIn ? 'var(--hy-status-success, #2f6b4f)' : 'var(--hy-status-warning, #8a5300)',
    border: `1px solid ${checkedIn ? 'var(--hy-status-success-border, #bbf7d0)' : 'var(--hy-status-warning-border, #fde68a)'}`,
  }),

  checkinButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 700,
    background: disabled
      ? 'var(--hy-surface-container, #fdf6ee)'
      : 'var(--hy-status-success, #2f6b4f)',
    color: disabled ? 'var(--hy-text-muted, #6e5d63)' : '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: '0 2px 4px rgba(47, 107, 79, 0.2)',
  }),

  undoButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    background: 'var(--hy-status-error-bg, #fdecea)',
    color: 'var(--hy-status-error, #c62828)',
    border: '1px solid var(--hy-status-error-border, #fca5a5)',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),

  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
  } satisfies CSSProperties,

  adminCard: {
    background: '#ffffff',
    padding: '1.5rem',
    borderRadius: 8,
    border: '1px solid var(--hy-outline, #eadfd6)',
    boxShadow: '0 1px 3px rgba(122, 31, 61, 0.05)',
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
    color: 'var(--hy-text-muted, #6e5d63)',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  } satisfies CSSProperties,

  successBox: {
    background: 'var(--hy-status-success-bg, #e7f1ea)',
    padding: '1rem',
    borderRadius: 6,
    border: '1px solid var(--hy-status-success-border, #bbf7d0)',
    color: 'var(--hy-status-success, #2f6b4f)',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  errorBox: {
    background: 'var(--hy-status-error-bg, #fdecea)',
    padding: '1rem',
    borderRadius: 6,
    border: '1px solid var(--hy-status-error-border, #fca5a5)',
    color: 'var(--hy-status-error, #c62828)',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  roleBadge: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 600,
    background: 'var(--hy-status-info-bg, #e6eef2)',
    color: 'var(--hy-status-info, #3f5b6b)',
    border: '1px solid var(--hy-status-info-border, #cbd5e1)',
  } satisfies CSSProperties,

  revokeButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.375rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: '#ffffff',
    color: 'var(--hy-status-error, #c62828)',
    border: '1px solid var(--hy-status-error-border, #fca5a5)',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),

  refreshButton: (disabled?: boolean): CSSProperties => ({
    padding: '0.375rem 0.75rem',
    fontSize: '0.8rem',
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: 4,
    background: '#ffffff',
    color: 'var(--hy-text, #2b1d22)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
};
