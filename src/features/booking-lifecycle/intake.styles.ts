import type { CSSProperties } from 'react';

export const intakeStyles = {
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    margin: '1.25rem 0 1.5rem',
  } satisfies CSSProperties,

  kpiCard: (isActive: boolean, borderColor?: string): CSSProperties => {
    const baseBorder = `1.5px solid ${isActive ? 'var(--hy-wine, #7a1f3d)' : 'var(--hy-outline, #eadfd6)'}`;
    return {
      background: '#ffffff',
      borderTop: baseBorder,
      borderRight: baseBorder,
      borderBottom: baseBorder,
      borderLeft: borderColor ? `4px solid ${borderColor}` : baseBorder,
      borderRadius: '12px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      cursor: 'pointer',
      boxShadow: isActive ? '0 2px 8px rgba(122, 31, 61, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
      transition: 'all 0.15s ease',
    };
  },

  kpiLabel: {
    fontSize: '0.8rem',
    color: 'var(--hy-text-muted, #6e5d63)',
    fontWeight: 500,
  } satisfies CSSProperties,

  kpiValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--hy-text, #2b1d22)',
    lineHeight: 1.2,
  } satisfies CSSProperties,

  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    margin: '0 0 1.5rem',
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
    flexWrap: 'wrap',
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

  tabCountBadge: (active: boolean, customBg?: string): CSSProperties => ({
    background: active ? customBg || 'var(--hy-wine, #7a1f3d)' : 'var(--hy-outline, #eadfd6)',
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
    borderRadius: '8px',
    minWidth: '220px',
    background: '#ffffff',
    color: 'var(--hy-text, #2b1d22)',
  } satisfies CSSProperties,

  intakeItem: (status: string): CSSProperties => {
    let borderColor = 'var(--hy-wine, #7a1f3d)';
    if (status === 'CONVERTED') borderColor = 'var(--hy-status-success, #2f6b4f)';
    if (status === 'CLOSED') borderColor = '#94a3b8';

    return {
      background: '#ffffff',
      borderTop: '1px solid var(--hy-outline, #eadfd6)',
      borderRight: '1px solid var(--hy-outline, #eadfd6)',
      borderBottom: '1px solid var(--hy-outline, #eadfd6)',
      borderLeft: `5px solid ${borderColor}`,
      borderRadius: '16px',
      padding: '24px 28px',
      boxShadow: '0 4px 20px rgba(122, 31, 61, 0.04)',
      position: 'relative',
      transition: 'all 0.2s ease',
    };
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '1rem',
  } satisfies CSSProperties,

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
  } satisfies CSSProperties,

  kickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  } satisfies CSSProperties,

  dataRibbon: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
    margin: '1rem 0',
    background: 'var(--hy-surface-container, #fdf6ee)',
    padding: '12px 18px',
    borderRadius: '12px',
    border: '1px solid var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  ribbonItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  } satisfies CSSProperties,

  ribbonDt: {
    fontSize: '0.75rem',
    color: 'var(--hy-text-muted, #6e5d63)',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } satisfies CSSProperties,

  ribbonDd: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--hy-text, #2b1d22)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  } satisfies CSSProperties,

  subDetail: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--hy-text-muted, #6e5d63)',
  } satisfies CSSProperties,

  contextTag: (dateStr: string): CSSProperties => {
    const target = new Date(dateStr);
    let isUrgent = false;
    if (!isNaN(target.getTime())) {
      const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) isUrgent = true;
    }
    return {
      fontSize: '0.72rem',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '6px',
      background: isUrgent ? 'var(--hy-status-error-bg, #fdecea)' : '#ffffff',
      color: isUrgent ? 'var(--hy-status-error, #c62828)' : 'var(--hy-text-muted, #6e5d63)',
      border: `1px solid ${isUrgent ? 'var(--hy-status-error-border, #fca5a5)' : 'var(--hy-outline, #eadfd6)'}`,
    };
  },

  messageCallout: {
    background: '#faf7f2',
    borderLeft: '3px solid var(--hy-wine-gold, #c5a880)',
    borderRadius: '0 10px 10px 0',
    padding: '12px 18px',
    marginTop: '1rem',
    maxWidth: '920px',
  } satisfies CSSProperties,

  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  } satisfies CSSProperties,

  messageLabel: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--hy-wine, #7a1f3d)',
  } satisfies CSSProperties,

  messageText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    fontSize: '0.92rem',
    lineHeight: 1.6,
    color: 'var(--hy-text, #2b1d22)',
  } satisfies CSSProperties,

  consultationCode: {
    fontSize: '0.82rem',
    background: '#ffffff',
    border: '1px solid var(--hy-status-success-border, #bbf7d0)',
    color: 'var(--hy-status-success, #2f6b4f)',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '6px',
  } satisfies CSSProperties,

  statusBadge: (status: string): CSSProperties => {
    let bg = 'var(--hy-surface-container, #fdf6ee)';
    let text = 'var(--hy-text-muted, #6e5d63)';
    let border = 'var(--hy-outline, #eadfd6)';
    if (status === 'NEW') {
      bg = 'var(--hy-status-error-bg, #fdecea)';
      text = 'var(--hy-status-error, #c62828)';
      border = 'var(--hy-status-error-border, #fca5a5)';
    } else if (status === 'CONVERTED') {
      bg = 'var(--hy-status-success-bg, #e7f1ea)';
      text = 'var(--hy-status-success, #2f6b4f)';
      border = 'var(--hy-status-success-border, #bbf7d0)';
    } else if (status === 'CLOSED') {
      bg = '#f1f5f9';
      text = '#64748b';
      border = '#cbd5e1';
    }
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 700,
      background: bg,
      color: text,
      border: `1px solid ${border}`,
    };
  },

  contactChips: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '0.88rem',
    color: 'var(--hy-text-muted, #6e5d63)',
    marginTop: '4px',
  } satisfies CSSProperties,

  contactLink: {
    color: 'var(--hy-wine, #7a1f3d)',
    textDecoration: 'none',
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  } satisfies CSSProperties,

  factsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    margin: '1.25rem 0',
  } satisfies CSSProperties,

  factItem: {
    background: 'var(--hy-surface-container, #fdf6ee)',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--hy-outline, #eadfd6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  } satisfies CSSProperties,

  factDt: {
    fontSize: '0.75rem',
    color: 'var(--hy-text-muted, #6e5d63)',
    fontWeight: 600,
  } satisfies CSSProperties,

  factDd: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--hy-text, #2b1d22)',
    margin: 0,
  } satisfies CSSProperties,

  messageBox: {
    background: '#faf7f2',
    borderLeft: '3px solid var(--hy-wine-gold, #c5a880)',
    borderRadius: '0 8px 8px 0',
    padding: '12px 16px',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    color: 'var(--hy-text, #2b1d22)',
    margin: '1rem 0 0',
  } satisfies CSSProperties,

  actionsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '1.25rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--hy-outline, #eadfd6)',
  } satisfies CSSProperties,

  primaryActionBtn: {
    background: 'var(--hy-wine, #7a1f3d)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 18px',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  } satisfies CSSProperties,

  secondaryActionBtn: {
    background: '#ffffff',
    color: 'var(--hy-wine, #7a1f3d)',
    border: '1px solid var(--hy-outline, #eadfd6)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } satisfies CSSProperties,

  convertedBanner: {
    borderRadius: '10px',
    background: 'var(--hy-status-success-bg, #e7f1ea)',
    border: '1px solid var(--hy-status-success-border, #bbf7d0)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    width: '100%',
    marginTop: '0.75rem',
  } satisfies CSSProperties,

  loadMoreBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '0.92rem',
    fontWeight: 600,
    background: '#ffffff',
    border: '1.5px dashed var(--hy-outline, #eadfd6)',
    borderRadius: '12px',
    color: 'var(--hy-wine, #7a1f3d)',
    cursor: 'pointer',
    textAlign: 'center',
    marginTop: '1rem',
    transition: 'all 0.15s ease',
  } satisfies CSSProperties,
};
