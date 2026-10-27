import type { CSSProperties } from 'react';

export const contractStyles = {
  panelArticle: {
    marginTop: '2rem',
    background: '#ffffff',
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: 8,
    padding: '1.5rem',
  } satisfies CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  heading: {
    margin: '0.25rem 0',
    fontSize: '1.25rem',
    color: 'var(--hy-wine, #7a1f3d)',
  } satisfies CSSProperties,

  statusBadge: (state: string): CSSProperties => ({
    display: 'inline-block',
    padding: '0.25rem 0.625rem',
    borderRadius: 9999,
    fontSize: '0.75rem',
    fontWeight: 600,
    background:
      state === 'APPROVED'
        ? 'var(--hy-status-success-bg, #e7f1ea)'
        : state === 'AWAITING_APPROVAL'
          ? 'var(--hy-status-info-bg, #e6eef2)'
          : 'var(--hy-status-warning-bg, #fcefd6)',
    color:
      state === 'APPROVED'
        ? 'var(--hy-status-success, #2f6b4f)'
        : state === 'AWAITING_APPROVAL'
          ? 'var(--hy-status-info, #3f5b6b)'
          : 'var(--hy-status-warning, #8a5300)',
    border: `1px solid ${
      state === 'APPROVED'
        ? 'var(--hy-status-success-border, #bbf7d0)'
        : state === 'AWAITING_APPROVAL'
          ? 'var(--hy-status-info-border, #cbd5e1)'
          : 'var(--hy-status-warning-border, #fde68a)'
    }`,
  }),

  actionMessage: {
    background: 'var(--hy-status-success-bg, #e7f1ea)',
    color: 'var(--hy-status-success, #2f6b4f)',
    border: '1px solid var(--hy-status-success-border, #bbf7d0)',
    padding: '0.5rem 0.75rem',
    borderRadius: 6,
    marginBottom: '1rem',
    fontSize: '0.875rem',
  } satisfies CSSProperties,

  errorMessage: {
    background: 'var(--hy-status-error-bg, #fdecea)',
    color: 'var(--hy-status-error, #c62828)',
    border: '1px solid var(--hy-status-error-border, #fecaca)',
    padding: '0.5rem 0.75rem',
    borderRadius: 6,
    marginBottom: '1rem',
    fontSize: '0.875rem',
  } satisfies CSSProperties,

  emptyBox: {
    padding: '2rem 1rem',
    textAlign: 'center',
    background: 'var(--hy-surface-container, #fdf6ee)',
    borderRadius: 6,
    border: '1px dashed var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    background: 'var(--hy-surface-container, #fdf6ee)',
    border: '1px solid var(--hy-outline, #eadfd6)',
    padding: '1rem',
    borderRadius: 6,
    marginBottom: '1.25rem',
  } satisfies CSSProperties,

  metaSmall: {
    color: 'var(--hy-text-muted, #6e5d63)',
    display: 'block',
  } satisfies CSSProperties,

  approvalStatusBox: {
    display: 'flex',
    gap: '2rem',
    padding: '0.75rem',
    background: 'var(--hy-surface-container, #fdf6ee)',
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: 6,
    marginBottom: '1.25rem',
    fontSize: '0.875rem',
  } satisfies CSSProperties,

  approvalStatusText: (approved: boolean): CSSProperties => ({
    color: approved ? 'var(--hy-status-success, #2f6b4f)' : 'var(--hy-status-warning, #8a5300)',
  }),

  actionsRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  } satisfies CSSProperties,

  downloadButton: (disabled: boolean): CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 6,
    border: '1px solid var(--hy-outline, #eadfd6)',
    background: '#ffffff',
    color: 'var(--hy-text, #2b1d22)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
  }),

  submitDraftButton: (disabled: boolean): CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 6,
    border: 'none',
    background: 'var(--hy-wine, #7a1f3d)',
    color: '#ffffff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
  }),

  approveButton: (disabled: boolean): CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 6,
    border: 'none',
    background: 'var(--hy-status-success, #2f6b4f)',
    color: '#ffffff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
  }),
};
