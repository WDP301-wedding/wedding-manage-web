import type { CSSProperties } from 'react';

export const bookingStyles = {
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

  stepContainerVisible: (maxWidth = '780px'): CSSProperties => ({
    display: 'block',
    maxWidth,
    margin: '0 auto',
    width: '100%',
  }),

  // Tab ẩn vẫn nằm trong cây trợ năng (không dùng display: none) để giữ hành vi cũ.
  stepContainerHidden: {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    height: '1px',
    overflow: 'hidden',
  } satisfies CSSProperties,
};
