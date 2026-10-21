/**
 * Authoritative types and utilities for M09–M14 Invitation Print Orders.
 * Derived from wedding-be print-orders.schemas.ts and print-policy.ts.
 */

import { formatVnd } from '../../lib/formatters';

export const PRINT_ORDER_STATUSES = [
  'REQUESTED',
  'QUOTED',
  'APPROVED',
  'IN_PRODUCTION',
  'READY_FOR_HANDOVER',
  'HANDED_OVER',
  'CANCELLED',
] as const;

export type PrintOrderStatus = (typeof PRINT_ORDER_STATUSES)[number];

export const MAX_ORDER_TOTAL_VND = 1_000_000_000_000;
export const MAX_LINE_UNIT_PRICE_VND = 1_000_000;
export const MIN_LINE_UNIT_PRICE_VND = 1;
export const QUOTE_EXPIRY_DAYS = 7;

export interface PrintLineView {
  readonly lineId: string;
  readonly designId: string;
  readonly quantity: number;
  readonly printableRevisionId: string | null;
  /** Friendly display label for UI rendering */
  readonly displayVariant?: string | undefined;
}

export interface QuotedLineView {
  readonly lineId: string;
  readonly designId: string;
  readonly quantity: number;
  readonly unitPriceVnd: number;
  readonly lineTotalVnd: number;
  readonly designRevisionId?: string | undefined;
  /** Friendly display label for UI rendering */
  readonly displayVariant?: string | undefined;
}

export interface CommercialRevisionView {
  readonly commercialRevisionId: string;
  readonly revisionNumber: number;
  readonly lines: readonly QuotedLineView[];
  readonly orderTotalVnd: number;
  readonly estimatedHandoverAt: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface PrintOrderView {
  readonly orderId: string;
  readonly bookingId: string;
  readonly status: PrintOrderStatus;
  readonly revision: number;
  readonly lines: readonly PrintLineView[];
  readonly currentCommercialRevisionId: string | null;
  readonly currentCommercialRevision: CommercialRevisionView | null;
  readonly pendingReplacementProposal: CommercialRevisionView | null;
  readonly receivableChargeId: string | null;
  readonly readyAt: string | null;
  readonly handedOverAt: string | null;
  readonly evidenceReference: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Optional metadata for display when enriched */
  readonly displayCouple?: string | undefined;
  readonly displayEventDate?: string | undefined;
  readonly displayHall?: string | undefined;
}

export interface PrintOrderListResult {
  readonly items: readonly PrintOrderView[];
  readonly nextCursor: string | null;
}

export interface ManagementPrintOrderListQuery {
  readonly bookingId?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface QuotePrintOrderBody {
  readonly expectedRevision: number;
  readonly lines: readonly {
    readonly lineId: string;
    readonly unitPriceVnd: number;
  }[];
  readonly estimatedHandoverAt: string;
}

export interface TransitionOrderBody {
  readonly expectedRevision: number;
}

export interface HandoverOrderBody {
  readonly expectedRevision: number;
  readonly evidenceReference: string;
}

export interface CancelOrderBody {
  readonly expectedRevision: number;
  readonly reason?: string;
}

export type StatusTone = 'green' | 'amber' | 'red' | 'neutral';

export interface StatusBadgeDescriptor {
  readonly label: string;
  readonly tone: StatusTone;
}

/**
 * Checks whether a commercial revision has expired.
 */
export function isCommercialRevisionExpired(revision: CommercialRevisionView | null): boolean {
  if (revision === null) return false;
  return new Date(revision.expiresAt).getTime() <= Date.now();
}

/**
 * Derives the commercial status label and tone from the backend print order state.
 */
export function deriveCommercialStatus(order: PrintOrderView): StatusBadgeDescriptor {
  switch (order.status) {
    case 'REQUESTED':
      return { label: 'Chờ báo giá', tone: 'amber' };
    case 'QUOTED':
      if (isCommercialRevisionExpired(order.currentCommercialRevision)) {
        return { label: 'Báo giá hết hạn', tone: 'red' };
      }
      return { label: 'Chờ Couple duyệt', tone: 'amber' };
    case 'APPROVED':
    case 'IN_PRODUCTION':
    case 'READY_FOR_HANDOVER':
    case 'HANDED_OVER':
      if (order.pendingReplacementProposal !== null) {
        return { label: 'Đã duyệt · Có đề xuất thay thế', tone: 'amber' };
      }
      return { label: 'Đã duyệt', tone: 'green' };
    case 'CANCELLED':
      return { label: 'Đã hủy', tone: 'neutral' };
  }
}

/**
 * Derives the production status label and tone from the backend print order state.
 */
export function deriveProductionStatus(order: PrintOrderView): StatusBadgeDescriptor {
  switch (order.status) {
    case 'REQUESTED':
    case 'QUOTED':
      return { label: 'Chưa mở', tone: 'neutral' };
    case 'APPROVED':
      if (order.pendingReplacementProposal !== null) {
        return { label: 'Chờ duyệt đề xuất (Chặn sản xuất)', tone: 'amber' };
      }
      return { label: 'Chờ bắt đầu sản xuất', tone: 'amber' };
    case 'IN_PRODUCTION':
      return { label: 'Đang sản xuất', tone: 'green' };
    case 'READY_FOR_HANDOVER':
      return { label: 'Sẵn sàng bàn giao', tone: 'green' };
    case 'HANDED_OVER':
      return { label: 'Đã bàn giao', tone: 'green' };
    case 'CANCELLED':
      return { label: 'Đã dừng', tone: 'neutral' };
  }
}

/**
 * Action eligibility helpers strictly conforming to domain/print-policy.ts
 */
export function canQuoteOrder(order: PrintOrderView): boolean {
  if (order.status === 'REQUESTED') return true;
  if (order.status === 'QUOTED') {
    return isCommercialRevisionExpired(order.currentCommercialRevision);
  }
  return false;
}

export function canStartProduction(order: PrintOrderView): boolean {
  return order.status === 'APPROVED' && order.pendingReplacementProposal === null;
}

export function canMarkReady(order: PrintOrderView): boolean {
  return order.status === 'IN_PRODUCTION';
}

export function canMarkHandedOver(order: PrintOrderView): boolean {
  return order.status === 'READY_FOR_HANDOVER';
}

export function canCancelOrder(order: PrintOrderView): boolean {
  // Only orders not yet in production or completed can be cancelled
  return order.status === 'REQUESTED' || order.status === 'QUOTED' || order.status === 'APPROVED';
}

export function canProposeReplacement(order: PrintOrderView): boolean {
  return order.status === 'APPROVED' && order.pendingReplacementProposal === null;
}

/**
 * Derives whether the order has an accepted commercial revision.
 */
export function isOrderApprovedOrBeyond(status: PrintOrderStatus): boolean {
  return (
    status === 'APPROVED' ||
    status === 'IN_PRODUCTION' ||
    status === 'READY_FOR_HANDOVER' ||
    status === 'HANDED_OVER'
  );
}

/**
 * Formats an integer VND currency value.
 */
export { formatVnd };

/**
 * Formats an ISO datetime into Vietnamese display format (Asia/Ho_Chi_Minh).
 */
export function formatVietnameseDateTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return isoDate;
  }
}

/**
 * Formats an ISO datetime into Vietnamese date only (DD/MM/YYYY).
 */
export function formatVietnameseDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoDate;
  }
}

/**
 * Converts a date input (YYYY-MM-DD) into Vietnam local agreed business datetime ISO (17:00:00+07:00).
 */
export function toVietnamBusinessIsoString(dateString: string, hour = 17, minute = 0): string {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${dateString}T${h}:${m}:00+07:00`;
}

/**
 * Validates that an agreed handover date is strictly in the future (minimum tomorrow in Vietnam time).
 */
export function isValidFutureHandoverDate(dateString: string): boolean {
  if (!dateString) return false;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return false;
  const [year, month, day] = parts;
  if (!year || !month || !day) return false;
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayVn = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()),
  );

  return targetDate.getTime() > todayVn.getTime();
}

/**
 * Derives a deterministic idempotency key incorporating operation, order, expected revision, and payload content digest.
 */
export function generateIdempotencyKey(
  operation: string,
  orderId: string,
  revision: number,
  payload?: unknown,
): string {
  if (payload === undefined) {
    return `${operation}-${orderId}-${revision}`;
  }
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return `${operation}-${orderId}-${revision}-${hash.toString(36)}`;
}

/**
 * Computes estimated line total in VND.
 */
export function computeQuotedLineTotal(quantity: number, unitPriceVnd: number): number {
  return Math.max(0, Math.floor(quantity) * Math.floor(unitPriceVnd));
}
