import type { CSSProperties } from 'react';

export const printOrderStyles = {
  centeredNotice: {
    padding: '60px 20px',
    textAlign: 'center',
  } as CSSProperties,

  primaryActionWithMargin: {
    marginTop: '16px',
  } as CSSProperties,

  retryButton: {
    marginTop: '12px',
    background: '#047857',
    color: '#fff',
    border: 'none',
  } as CSSProperties,

  refreshButton: {
    marginTop: '8px',
  } as CSSProperties,

  emptyTableCol: {
    textAlign: 'center',
    padding: '36px',
  } as CSSProperties,

  selectedDetails: {
    marginTop: '36px',
  } as CSSProperties,

  textDangerBlock: {
    display: 'block',
  } as CSSProperties,

  amberBlockSmall: {
    display: 'block',
    fontSize: '12px',
  } as CSSProperties,

  amberBlockSmallWithMargin: {
    display: 'block',
    fontSize: '12px',
    marginTop: '2px',
  } as CSSProperties,

  proposalLinesBox: {
    marginTop: '8px',
    fontSize: '11px',
  } as CSSProperties,

  proposalLineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
  } as CSSProperties,

  drawerHeaderInfo: {
    marginTop: '8px',
  } as CSSProperties,

  cancelHeaderTitle: {
    color: 'var(--v0-danger)',
  } as CSSProperties,

  alertBoxWithMargin: {
    marginBottom: '16px',
  } as CSSProperties,

  alertBoxNoticeText: {
    marginTop: '6px',
    fontSize: '13px',
    lineHeight: '1.5',
  } as CSSProperties,

  alertBoxNoticeList: {
    margin: '6px 0 0',
    paddingLeft: '18px',
    fontSize: '13px',
    lineHeight: '1.5',
  } as CSSProperties,

  dangerSubText: {
    fontSize: '12px',
    marginTop: '4px',
  } as CSSProperties,

  bulletList: {
    paddingLeft: '20px',
    margin: '14px 0',
    lineHeight: '1.6',
  } as CSSProperties,

  authDeniedButtons: {
    marginTop: '20px',
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  } as CSSProperties,
};
