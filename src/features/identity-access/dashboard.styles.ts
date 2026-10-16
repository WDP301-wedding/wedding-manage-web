import type { CSSProperties } from 'react';

export const dashboardStyles = {
  scheduleSection: {
    marginBottom: '2.5rem',
  } satisfies CSSProperties,

  sectionHeading: {
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'flex-start',
  } satisfies CSSProperties,

  lockNotice: (type: 'success' | 'warning' | 'info'): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderRadius: '6px',
    margin: '0.75rem 0',
    fontSize: '0.85rem',
    lineHeight: 1.4,
    background: type === 'success' ? '#f0fdf4' : type === 'warning' ? '#fffbeb' : '#f8fafc',
    border: `1px solid ${type === 'success' ? '#86efac' : type === 'warning' ? '#fcd34d' : '#cbd5e1'}`,
    color: type === 'success' ? '#166534' : type === 'warning' ? '#92400e' : '#334155',
  }),

  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    margin: '1.25rem 0 1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #e5e7eb',
  } satisfies CSSProperties,

  tabList: {
    display: 'inline-flex',
    gap: '0.375rem',
    background: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  } satisfies CSSProperties,

  tabButton: (active: boolean): CSSProperties => ({
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#1e293b' : '#64748b',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  }),

  tabCountBadge: (active: boolean, isMineTab: boolean): CSSProperties => ({
    background: active ? (isMineTab ? '#15803d' : '#334537') : '#cbd5e1',
    color: active ? '#ffffff' : '#475569',
    borderRadius: '999px',
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 700,
  }),

  searchInput: {
    padding: '5px 10px',
    fontSize: '0.8rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    minWidth: '170px',
    background: '#ffffff',
  } satisfies CSSProperties,

  selectFilter: {
    padding: '5px 8px',
    fontSize: '0.8rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
  } satisfies CSSProperties,

  emptyCard: {
    padding: '2.5rem 1rem',
    textAlign: 'center',
  } satisfies CSSProperties,

  claimButton: (disabled?: boolean): CSSProperties => ({
    padding: '4px 10px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: disabled ? '#f3f4f6' : '#f0fdf4',
    color: disabled ? '#9ca3af' : '#15803d',
    border: `1px solid ${disabled ? '#e5e7eb' : '#bbf7d0'}`,
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  }),

  phaseBadge: (phase: string): CSSProperties => {
    let bg = '#f3f4f6';
    let text = '#374151';
    let border = '#e5e7eb';
    if (phase === 'CONFIRMED') {
      bg = '#ecfdf5';
      text = '#065f46';
      border = '#a7f3d0';
    } else if (phase === 'AWAITING_DEPOSIT') {
      bg = '#fffbeb';
      text = '#92400e';
      border = '#fde68a';
    } else if (phase === 'COMPLETED') {
      bg = '#eff6ff';
      text = '#1e40af';
      border = '#bfdbfe';
    } else if (phase === 'CANCELLED') {
      bg = '#fef2f2';
      text = '#991b1b';
      border = '#fecaca';
    }
    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: bg,
      color: text,
      border: `1px solid ${border}`,
    };
  },

  actionGroup: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  } satisfies CSSProperties,

  mineBadge: {
    fontSize: '0.68rem',
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: '4px',
    padding: '1px 5px',
    fontWeight: 600,
  } satisfies CSSProperties,

  assignedBadge: {
    fontSize: '0.68rem',
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    padding: '1px 5px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  } satisfies CSSProperties,

  actionLink: {
    padding: '4px 10px',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  } satisfies CSSProperties,

  lockedButton: {
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    background: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'not-allowed',
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '3px 8px',
    whiteSpace: 'nowrap',
    lineHeight: '1.2',
  } satisfies CSSProperties,

  claimActiveButton: {
    border: '1px solid #86efac',
    borderRadius: '4px',
    background: '#f0fdf4',
    color: '#166534',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '3px 8px',
    whiteSpace: 'nowrap',
    lineHeight: '1.2',
  } satisfies CSSProperties,

  copyButton: (copied: boolean): CSSProperties => ({
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '0.75rem',
    color: copied ? '#16a34a' : '#64748b',
    borderRadius: '3px',
  }),
};
