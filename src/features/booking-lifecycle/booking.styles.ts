import type { CSSProperties } from 'react';

export const bookingStyles = {
  tabList: {
    display: 'inline-flex',
    gap: '0.375rem',
    background: 'var(--hy-surface-container, #fdf6ee)',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid var(--hy-outline, #eadfd6)',
    marginBottom: '1.5rem',
  } satisfies CSSProperties,

  tabButton: (active: boolean): CSSProperties => ({
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '0.88rem',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    background: active ? '#ffffff' : 'transparent',
    color: active ? 'var(--hy-wine, #7a1f3d)' : 'var(--hy-text-muted, #6e5d63)',
    boxShadow: active ? '0 1px 3px rgba(122, 31, 61, 0.08)' : 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  }),

  badgeActive: {
    background: 'var(--hy-status-success, #2f6b4f)',
    color: '#ffffff',
    borderRadius: '999px',
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 700,
  } satisfies CSSProperties,

  badgeDraft: {
    background: 'var(--hy-status-warning, #8a5300)',
    color: '#ffffff',
    borderRadius: '999px',
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 700,
  } satisfies CSSProperties,

  stepKicker: {
    color: 'var(--hy-text-muted, #6e5d63)',
    fontSize: '0.875rem',
    marginBottom: '0.75rem',
  } satisfies CSSProperties,

  prefillBox: {
    padding: '6px 10px',
    backgroundColor: 'var(--hy-status-success-bg, #e7f1ea)',
    border: '1px solid var(--hy-status-success-border, #bbf7d0)',
    borderRadius: '6px',
    fontSize: '0.78rem',
    color: 'var(--hy-status-success, #2f6b4f)',
    marginBottom: '0.75rem',
  } satisfies CSSProperties,

  resetButton: {
    marginLeft: '6px',
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--hy-status-success, #2f6b4f)',
    fontWeight: 600,
    padding: 0,
    fontSize: 'inherit',
  } satisfies CSSProperties,

  actionInline: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  } satisfies CSSProperties,

  syncBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    background: 'var(--hy-status-success-bg, #e7f1ea)',
    color: 'var(--hy-status-success, #2f6b4f)',
    border: '1px solid var(--hy-status-success-border, #86efac)',
    fontWeight: 600,
  } satisfies CSSProperties,

  syncButton: {
    padding: '4px 10px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    background: '#ffffff',
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: '4px',
    color: 'var(--hy-text, #2b1d22)',
  } satisfies CSSProperties,

  statusBanner: (type: 'info' | 'warning' | 'error' | 'success'): CSSProperties => {
    let bg = 'var(--hy-status-info-bg, #e6eef2)';
    let text = 'var(--hy-status-info, #3f5b6b)';
    let border = 'var(--hy-status-info-border, #cbd5e1)';
    if (type === 'warning') {
      bg = 'var(--hy-status-warning-bg, #fcefd6)';
      text = 'var(--hy-status-warning, #8a5300)';
      border = 'var(--hy-status-warning-border, #fcd34d)';
    } else if (type === 'error') {
      bg = 'var(--hy-status-error-bg, #fdecea)';
      text = 'var(--hy-status-error, #c62828)';
      border = 'var(--hy-status-error-border, #fca5a5)';
    } else if (type === 'success') {
      bg = 'var(--hy-status-success-bg, #e7f1ea)';
      text = 'var(--hy-status-success, #2f6b4f)';
      border = 'var(--hy-status-success-border, #bbf7d0)';
    }
    return {
      padding: '0.75rem 1rem',
      borderRadius: '6px',
      fontSize: '0.875rem',
      backgroundColor: bg,
      color: text,
      border: `1px solid ${border}`,
      marginBottom: '1rem',
    };
  },

  logContainer: {
    marginTop: '0.75rem',
    padding: '8px',
    background: 'var(--hy-surface-container, #fdf6ee)',
    borderRadius: '6px',
    border: '1px solid var(--hy-outline, #eadfd6)',
    fontSize: '0.78rem',
  } satisfies CSSProperties,
};
