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
    background:
      type === 'success'
        ? 'var(--hy-status-success-bg, #e7f1ea)'
        : type === 'warning'
          ? 'var(--hy-status-warning-bg, #fcefd6)'
          : 'var(--hy-status-info-bg, #e6eef2)',
    border: `1px solid ${
      type === 'success'
        ? 'var(--hy-status-success-border, #bbf7d0)'
        : type === 'warning'
          ? 'var(--hy-status-warning-border, #fcd34d)'
          : 'var(--hy-status-info-border, #cbd5e1)'
    }`,
    color:
      type === 'success'
        ? 'var(--hy-status-success, #2f6b4f)'
        : type === 'warning'
          ? 'var(--hy-status-warning, #8a5300)'
          : 'var(--hy-status-info, #3f5b6b)',
  }),

  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    margin: '1.25rem 0 1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  tabList: {
    display: 'inline-flex',
    gap: '0.375rem',
    background: 'var(--hy-surface-container, #fdf6ee)',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  tabButton: (active: boolean): CSSProperties => ({
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    background: active ? '#ffffff' : 'transparent',
    color: active ? 'var(--hy-wine, #7a1f3d)' : 'var(--hy-text-muted, #6e5d63)',
    boxShadow: active ? '0 1px 2px rgba(122, 31, 61, 0.08)' : 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  }),

  tabCountBadge: (active: boolean, isMineTab: boolean): CSSProperties => ({
    background: active
      ? isMineTab
        ? 'var(--hy-status-success, #2f6b4f)'
        : 'var(--hy-wine, #7a1f3d)'
      : 'var(--hy-outline, #eadfd6)',
    color: active ? '#ffffff' : 'var(--hy-text-muted, #6e5d63)',
    borderRadius: '999px',
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 700,
  }),

  searchInput: {
    padding: '6px 12px',
    fontSize: '0.85rem',
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: '6px',
    minWidth: '170px',
    background: '#ffffff',
    color: 'var(--hy-text, #2b1d22)',
  } satisfies CSSProperties,

  selectFilter: {
    padding: '6px 10px',
    fontSize: '0.85rem',
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: '6px',
    background: '#ffffff',
    color: 'var(--hy-text, #2b1d22)',
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
    background: disabled
      ? 'var(--hy-surface-container, #fdf6ee)'
      : 'var(--hy-status-success-bg, #e7f1ea)',
    color: disabled ? 'var(--hy-text-muted, #6e5d63)' : 'var(--hy-status-success, #2f6b4f)',
    border: `1px solid ${disabled ? 'var(--hy-outline, #eadfd6)' : 'var(--hy-status-success-border, #bbf7d0)'}`,
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  }),

  phaseBadge: (phase: string): CSSProperties => {
    let bg = 'var(--hy-surface-container, #fdf6ee)';
    let text = 'var(--hy-text-muted, #6e5d63)';
    let border = 'var(--hy-outline, #eadfd6)';
    if (phase === 'CONFIRMED') {
      bg = 'var(--hy-status-success-bg, #e7f1ea)';
      text = 'var(--hy-status-success, #2f6b4f)';
      border = 'var(--hy-status-success-border, #a7f3d0)';
    } else if (phase === 'AWAITING_DEPOSIT') {
      bg = 'var(--hy-status-warning-bg, #fcefd6)';
      text = 'var(--hy-status-warning, #8a5300)';
      border = 'var(--hy-status-warning-border, #fde68a)';
    } else if (phase === 'COMPLETED') {
      bg = 'var(--hy-status-info-bg, #e6eef2)';
      text = 'var(--hy-status-info, #3f5b6b)';
      border = 'var(--hy-status-info-border, #bfdbfe)';
    } else if (phase === 'CANCELLED') {
      bg = 'var(--hy-status-error-bg, #fdecea)';
      text = 'var(--hy-status-error, #c62828)';
      border = 'var(--hy-status-error-border, #fecaca)';
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
    background: 'var(--hy-status-success-bg, #e7f1ea)',
    color: 'var(--hy-status-success, #2f6b4f)',
    border: '1px solid var(--hy-status-success-border, #bbf7d0)',
    borderRadius: '4px',
    padding: '1px 5px',
    fontWeight: 600,
  } satisfies CSSProperties,

  assignedBadge: {
    fontSize: '0.68rem',
    background: 'var(--hy-status-error-bg, #fdecea)',
    color: 'var(--hy-status-error, #c62828)',
    border: '1px solid var(--hy-status-error-border, #fecaca)',
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
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: '4px',
    background: 'var(--hy-surface-container, #fdf6ee)',
    color: 'var(--hy-text-muted, #6e5d63)',
    cursor: 'not-allowed',
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '3px 8px',
    whiteSpace: 'nowrap',
    lineHeight: '1.2',
  } satisfies CSSProperties,

  claimActiveButton: {
    border: '1px solid var(--hy-status-success-border, #86efac)',
    borderRadius: '4px',
    background: 'var(--hy-status-success-bg, #e7f1ea)',
    color: 'var(--hy-status-success, #2f6b4f)',
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
    color: copied ? 'var(--hy-status-success, #2f6b4f)' : 'var(--hy-text-muted, #6e5d63)',
    borderRadius: '3px',
  }),
};
