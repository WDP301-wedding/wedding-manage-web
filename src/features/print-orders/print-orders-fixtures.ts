import type { ManagementSessionSnapshot } from '../identity-access/session';
import type { ManagementPrintOrdersGateway } from './print-orders-api';
import { DEMO_PRINT_ORDERS } from './print-orders-fixture-data';
import type { CommercialRevisionView, PrintOrderView, QuotedLineView } from './print-orders-types';

export { DEMO_PRINT_ORDERS } from './print-orders-fixture-data';

export const DEMO_MANAGER_SNAPSHOT: ManagementSessionSnapshot = {
  status: 'authenticated',
  actor: {
    accountId: 'demo-manager-account',
    displayEmail: 'quanly.demo@wedding-estate.vn',
    roles: ['MANAGER'],
    sessionId: 'demo-manager-session',
  },
  presentation: 'manager',
  denial: null,
};

export function createFixturePrintOrdersGateway(
  initialOrders: readonly PrintOrderView[] = DEMO_PRINT_ORDERS,
): ManagementPrintOrdersGateway {
  const orders = [...initialOrders];

  return {
    async list(_token, params) {
      await Promise.resolve();
      const limit = params?.limit ?? 10;
      const cursor = params?.cursor;

      let startIndex = 0;
      if (cursor) {
        const found = orders.findIndex((o) => o.orderId === cursor);
        if (found !== -1) {
          startIndex = found + 1;
        }
      }

      const paged = orders.slice(startIndex, startIndex + limit);
      const nextItem = orders[startIndex + limit];
      const nextCursor = nextItem ? (paged[paged.length - 1]?.orderId ?? null) : null;

      return {
        items: paged,
        nextCursor,
      };
    },

    async get(_token, orderId) {
      await Promise.resolve();
      const order = orders.find((o) => o.orderId === orderId);
      if (!order) {
        throw new Error(`Không tìm thấy đơn in với mã ${orderId}`);
      }
      return order;
    },

    async quote(_token, orderId, body) {
      await Promise.resolve();
      const index = orders.findIndex((o) => o.orderId === orderId);
      const order = orders[index];
      if (index === -1 || !order) throw new Error('Không tìm thấy đơn in');
      if (order.revision !== body.expectedRevision) {
        const error = new Error('Dữ liệu đơn in đã thay đổi trên máy chủ (stale revision).');
        (error as unknown as { status: number }).status = 409;
        throw error;
      }

      const nextRevNumber = (order.currentCommercialRevision?.revisionNumber ?? 0) + 1;
      const quotedLines: QuotedLineView[] = order.lines.map((l) => {
        const inputLine = body.lines.find((b) => b.lineId === l.lineId);
        const unitPrice = inputLine?.unitPriceVnd ?? 85000;
        return {
          lineId: l.lineId,
          designId: l.designId,
          quantity: l.quantity,
          unitPriceVnd: unitPrice,
          lineTotalVnd: l.quantity * unitPrice,
          displayVariant: l.displayVariant,
        };
      });

      const totalVnd = quotedLines.reduce((sum, item) => sum + item.lineTotalVnd, 0);
      const newRev: CommercialRevisionView = {
        commercialRevisionId: `rev_${order.orderId}_${nextRevNumber}`,
        revisionNumber: nextRevNumber,
        lines: quotedLines,
        orderTotalVnd: totalVnd,
        estimatedHandoverAt: body.estimatedHandoverAt,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      const updated: PrintOrderView = {
        ...order,
        status: 'QUOTED',
        revision: order.revision + 1,
        currentCommercialRevisionId: newRev.commercialRevisionId,
        currentCommercialRevision: newRev,
        updatedAt: new Date().toISOString(),
      };
      orders[index] = updated;
      return updated;
    },

    async startProduction(_token, orderId, body) {
      await Promise.resolve();
      const index = orders.findIndex((o) => o.orderId === orderId);
      const order = orders[index];
      if (index === -1 || !order) throw new Error('Không tìm thấy đơn in');
      if (order.revision !== body.expectedRevision) {
        const error = new Error('Stale revision');
        (error as unknown as { status: number }).status = 409;
        throw error;
      }
      const updated: PrintOrderView = {
        ...order,
        status: 'IN_PRODUCTION',
        revision: order.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      orders[index] = updated;
      return updated;
    },

    async markReady(_token, orderId, body) {
      await Promise.resolve();
      const index = orders.findIndex((o) => o.orderId === orderId);
      const order = orders[index];
      if (index === -1 || !order) throw new Error('Không tìm thấy đơn in');
      if (order.revision !== body.expectedRevision) {
        const error = new Error('Stale revision');
        (error as unknown as { status: number }).status = 409;
        throw error;
      }
      const updated: PrintOrderView = {
        ...order,
        status: 'READY_FOR_HANDOVER',
        revision: order.revision + 1,
        readyAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      orders[index] = updated;
      return updated;
    },

    async markHandedOver(_token, orderId, body) {
      await Promise.resolve();
      const index = orders.findIndex((o) => o.orderId === orderId);
      const order = orders[index];
      if (index === -1 || !order) throw new Error('Không tìm thấy đơn in');
      if (order.revision !== body.expectedRevision) {
        const error = new Error('Stale revision');
        (error as unknown as { status: number }).status = 409;
        throw error;
      }
      const updated: PrintOrderView = {
        ...order,
        status: 'HANDED_OVER',
        revision: order.revision + 1,
        handedOverAt: new Date().toISOString(),
        evidenceReference: body.evidenceReference,
        updatedAt: new Date().toISOString(),
      };
      orders[index] = updated;
      return updated;
    },

    async cancel(_token, orderId, body) {
      await Promise.resolve();
      const index = orders.findIndex((o) => o.orderId === orderId);
      const order = orders[index];
      if (index === -1 || !order) throw new Error('Không tìm thấy đơn in');
      if (order.revision !== body.expectedRevision) {
        const error = new Error('Stale revision');
        (error as unknown as { status: number }).status = 409;
        throw error;
      }
      const updated: PrintOrderView = {
        ...order,
        status: 'CANCELLED',
        revision: order.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      orders[index] = updated;
      return updated;
    },

    async proposeReplacement(_token, orderId, body) {
      await Promise.resolve();
      const index = orders.findIndex((o) => o.orderId === orderId);
      const order = orders[index];
      if (index === -1 || !order) throw new Error('Không tìm thấy đơn in');
      if (order.revision !== body.expectedRevision) {
        const error = new Error('Stale revision');
        (error as unknown as { status: number }).status = 409;
        throw error;
      }
      const nextRevNumber = (order.currentCommercialRevision?.revisionNumber ?? 0) + 1;
      const quotedLines: QuotedLineView[] = order.lines.map((l) => {
        const inputLine = body.lines.find((b) => b.lineId === l.lineId);
        const unitPrice = inputLine?.unitPriceVnd ?? 85000;
        return {
          lineId: l.lineId,
          designId: l.designId,
          quantity: l.quantity,
          unitPriceVnd: unitPrice,
          lineTotalVnd: l.quantity * unitPrice,
          displayVariant: l.displayVariant,
        };
      });

      const totalVnd = quotedLines.reduce((sum, item) => sum + item.lineTotalVnd, 0);
      const proposal: CommercialRevisionView = {
        commercialRevisionId: `prop_${order.orderId}_${nextRevNumber}`,
        revisionNumber: nextRevNumber,
        lines: quotedLines,
        orderTotalVnd: totalVnd,
        estimatedHandoverAt: body.estimatedHandoverAt,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      const updated: PrintOrderView = {
        ...order,
        revision: order.revision + 1,
        pendingReplacementProposal: proposal,
        updatedAt: new Date().toISOString(),
      };
      orders[index] = updated;
      return updated;
    },
  };
}
