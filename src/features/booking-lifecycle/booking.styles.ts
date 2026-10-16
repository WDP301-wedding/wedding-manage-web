import type { CSSProperties } from 'react';

export const bookingStyles = {
  stepKicker: {
    color: '#5d665f',
    fontSize: '0.875rem',
    marginBottom: '0.75rem',
  } satisfies CSSProperties,

  prefillBox: {
    padding: '6px 10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    fontSize: '0.78rem',
    color: '#15803d',
    marginBottom: '0.75rem',
  } satisfies CSSProperties,

  resetButton: {
    marginLeft: '6px',
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#15803d',
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
    background: '#dcfce7',
    color: '#15803d',
    border: '1px solid #86efac',
    fontWeight: 600,
  } satisfies CSSProperties,

  syncButton: {
    padding: '4px 10px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    color: '#374151',
  } satisfies CSSProperties,

  statusBanner: (type: 'info' | 'warning' | 'error' | 'success'): CSSProperties => {
    let bg = '#eff6ff';
    let text = '#1e40af';
    let border = '#bfdbfe';
    if (type === 'warning') {
      bg = '#fffbeb';
      text = '#92400e';
      border = '#fde68a';
    } else if (type === 'error') {
      bg = '#fef2f2';
      text = '#991b1b';
      border = '#fecaca';
    } else if (type === 'success') {
      bg = '#f0fdf4';
      text = '#166534';
      border = '#bbf7d0';
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
    background: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.78rem',
  } satisfies CSSProperties,
};
