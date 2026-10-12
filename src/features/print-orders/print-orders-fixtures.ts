import type { ManagementPrintOrdersGateway } from './print-orders-api';
import type { CommercialRevisionView, PrintOrderView, QuotedLineView } from './print-orders-types';

export const DEMO_PRINT_ORDERS: readonly PrintOrderView[] = [
  {
    orderId: 'IN-2408-018',
    bookingId: 'bk_2408_018_ngoclan',
    status: 'APPROVED',
    revision: 3,
    displayCouple: 'Minh Anh & Quốc Bảo',
    displayEventDate: '24/08/2026',
    displayHall: 'Sảnh Ngọc Lan',
    lines: [
      {
        lineId: 'line_18_1',
        designId: 'IVY-24-FOLDED',
        quantity: 220,
        printableRevisionId: 'prev_18_3',
        displayVariant: 'Thiệp gập · Ivory',
      },
      {
        lineId: 'line_18_2',
        designId: 'IVY-24-THANKYOU',
        quantity: 220,
        printableRevisionId: 'prev_18_3_ty',
        displayVariant: 'Thiệp cảm ơn đi kèm',
      },
    ],
    currentCommercialRevisionId: 'rev_18_3',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_18_3',
      revisionNumber: 3,
      lines: [
        {
          lineId: 'line_18_1',
          designId: 'IVY-24-FOLDED',
          quantity: 220,
          unitPriceVnd: 70000,
          lineTotalVnd: 15400000,
          displayVariant: 'Thiệp gập · Ivory',
        },
        {
          lineId: 'line_18_2',
          designId: 'IVY-24-THANKYOU',
          quantity: 220,
          unitPriceVnd: 15000,
          lineTotalVnd: 3300000,
          displayVariant: 'Thiệp cảm ơn đi kèm',
        },
      ],
      orderTotalVnd: 18700000,
      estimatedHandoverAt: '2026-08-20T10:00:00.000Z',
      expiresAt: '2026-08-15T10:00:00.000Z',
      createdAt: '2026-08-08T14:30:00.000Z',
    },
    pendingReplacementProposal: null,
    receivableChargeId: 'chg_18_3',
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-08-08T10:12:00.000Z',
    updatedAt: '2026-08-09T09:38:00.000Z',
  },
  {
    orderId: 'IN-2408-017',
    bookingId: 'bk_2408_017_vuoncam',
    status: 'QUOTED',
    revision: 2,
    displayCouple: 'Thanh Vy & Đức Huy',
    displayEventDate: '30/08/2026',
    displayHall: 'Sảnh Vườn Cam',
    lines: [
      {
        lineId: 'line_17_1',
        designId: 'IVY-24-FLAT',
        quantity: 180,
        printableRevisionId: 'prev_17_2',
        displayVariant: 'Thiệp phẳng · Sage',
      },
    ],
    currentCommercialRevisionId: 'rev_17_2',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_17_2',
      revisionNumber: 2,
      lines: [
        {
          lineId: 'line_17_1',
          designId: 'IVY-24-FLAT',
          quantity: 180,
          unitPriceVnd: 70000,
          lineTotalVnd: 12600000,
          displayVariant: 'Thiệp phẳng · Sage',
        },
      ],
      orderTotalVnd: 12600000,
      estimatedHandoverAt: '2026-08-25T10:00:00.000Z',
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2026-08-11T16:00:00.000Z',
    },
    pendingReplacementProposal: null,
    receivableChargeId: null,
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-08-11T14:00:00.000Z',
    updatedAt: '2026-08-11T16:00:00.000Z',
  },
  {
    orderId: 'IN-2408-016',
    bookingId: 'bk_2408_016_thuyta',
    status: 'IN_PRODUCTION',
    revision: 4,
    displayCouple: 'Khánh Linh & Hoàng Nam',
    displayEventDate: '06/09/2026',
    displayHall: 'Sảnh Thủy Tạ',
    lines: [
      {
        lineId: 'line_16_1',
        designId: 'IVY-24-LINEN',
        quantity: 260,
        printableRevisionId: 'prev_16_4',
        displayVariant: 'Thiệp gập · Linen',
      },
    ],
    currentCommercialRevisionId: 'rev_16_4',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_16_4',
      revisionNumber: 4,
      lines: [
        {
          lineId: 'line_16_1',
          designId: 'IVY-24-LINEN',
          quantity: 260,
          unitPriceVnd: 90000,
          lineTotalVnd: 23400000,
          displayVariant: 'Thiệp gập · Linen',
        },
      ],
      orderTotalVnd: 23400000,
      estimatedHandoverAt: '2026-09-01T10:00:00.000Z',
      expiresAt: '2026-08-19T10:00:00.000Z',
      createdAt: '2026-08-12T17:00:00.000Z',
    },
    pendingReplacementProposal: null,
    receivableChargeId: 'chg_16_4',
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-08-12T16:20:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
  },
  {
    orderId: 'IN-2408-015',
    bookingId: 'bk_2408_015_ngoclan',
    status: 'QUOTED',
    revision: 1,
    displayCouple: 'Hương Giang & Quang Huy',
    displayEventDate: '12/09/2026',
    displayHall: 'Sảnh Ngọc Lan',
    lines: [
      {
        lineId: 'line_15_1',
        designId: 'IVY-24-VELLUM',
        quantity: 300,
        printableRevisionId: 'prev_15_1',
        displayVariant: 'Thiệp phong thư · Vellum',
      },
    ],
    currentCommercialRevisionId: 'rev_15_1',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_15_1',
      revisionNumber: 1,
      lines: [
        {
          lineId: 'line_15_1',
          designId: 'IVY-24-VELLUM',
          quantity: 300,
          unitPriceVnd: 65000,
          lineTotalVnd: 19500000,
          displayVariant: 'Thiệp phong thư · Vellum',
        },
      ],
      orderTotalVnd: 19500000,
      estimatedHandoverAt: '2026-08-30T10:00:00.000Z',
      expiresAt: '2026-08-01T10:12:00.000Z',
      createdAt: '2026-08-01T10:12:00.000Z',
    },
    pendingReplacementProposal: null,
    receivableChargeId: null,
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-08-01T10:12:00.000Z',
    updatedAt: '2026-08-01T10:12:00.000Z',
  },
  {
    orderId: 'IN-2408-020',
    bookingId: 'bk_2408_020_thuyta',
    status: 'APPROVED',
    revision: 5,
    displayCouple: 'Mỹ Linh & Anh Dũng',
    displayEventDate: '18/10/2026',
    displayHall: 'Sảnh Thủy Tạ',
    lines: [
      {
        lineId: 'line_20_1',
        designId: 'IVY-24-VELLUM-FOIL',
        quantity: 300,
        printableRevisionId: 'prev_20_5',
        displayVariant: 'Thiệp phong thư · Vellum Ép kim vàng',
      },
    ],
    currentCommercialRevisionId: 'rev_20_4',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_20_4',
      revisionNumber: 4,
      lines: [
        {
          lineId: 'line_20_1',
          designId: 'IVY-24-VELLUM-FOIL',
          quantity: 300,
          unitPriceVnd: 95000,
          lineTotalVnd: 28500000,
          displayVariant: 'Thiệp phong thư · Vellum Ép kim vàng',
        },
      ],
      orderTotalVnd: 28500000,
      estimatedHandoverAt: '2026-09-30T10:00:00.000Z',
      expiresAt: '2026-09-15T10:12:00.000Z',
      createdAt: '2026-09-08T11:00:00.000Z',
    },
    pendingReplacementProposal: {
      commercialRevisionId: 'prop_20_5',
      revisionNumber: 5,
      lines: [
        {
          lineId: 'line_20_1',
          designId: 'IVY-24-VELLUM-FOIL',
          quantity: 300,
          unitPriceVnd: 110000,
          lineTotalVnd: 33000000,
          displayVariant: 'Thiệp phong thư · Vellum Ép kim vàng',
        },
      ],
      orderTotalVnd: 33000000,
      estimatedHandoverAt: '2026-10-05T10:00:00.000Z',
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2026-09-14T09:00:00.000Z',
    },
    receivableChargeId: 'chg_20_4',
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-09-08T10:12:00.000Z',
    updatedAt: '2026-09-14T09:00:00.000Z',
  },
  {
    orderId: 'IN-2408-014',
    bookingId: 'bk_2408_014_vuoncam',
    status: 'READY_FOR_HANDOVER',
    revision: 3,
    displayCouple: 'Ngọc Hà & Tuấn Kiệt',
    displayEventDate: '19/09/2026',
    displayHall: 'Sảnh Vườn Cam',
    lines: [
      {
        lineId: 'line_14_1',
        designId: 'IVY-24-MENU-2SIDE',
        quantity: 24,
        printableRevisionId: 'prev_14_3',
        displayVariant: 'Menu bàn · 2 mặt',
      },
    ],
    currentCommercialRevisionId: 'rev_14_3',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_14_3',
      revisionNumber: 3,
      lines: [
        {
          lineId: 'line_14_1',
          designId: 'IVY-24-MENU-2SIDE',
          quantity: 24,
          unitPriceVnd: 120000,
          lineTotalVnd: 2880000,
          displayVariant: 'Menu bàn · 2 mặt',
        },
      ],
      orderTotalVnd: 2880000,
      estimatedHandoverAt: '2026-08-15T10:00:00.000Z',
      expiresAt: '2026-08-14T10:00:00.000Z',
      createdAt: '2026-08-07T14:30:00.000Z',
    },
    pendingReplacementProposal: null,
    receivableChargeId: 'chg_14_3',
    readyAt: '2026-08-12T10:00:00.000Z',
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-08-07T14:05:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z',
  },
  {
    orderId: 'IN-2408-013',
    bookingId: 'bk_2408_013_hoangyen',
    status: 'HANDED_OVER',
    revision: 4,
    displayCouple: 'Văn Lâm & Yến Nhi',
    displayEventDate: '28/08/2026',
    displayHall: 'Sảnh Hoàng Yến',
    lines: [
      {
        lineId: 'line_13_1',
        designId: 'IVY-24-MINIMAL',
        quantity: 200,
        printableRevisionId: 'prev_13_4',
        displayVariant: 'Thiệp cưới tối giản Minimal',
      },
    ],
    currentCommercialRevisionId: 'rev_13_3',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_13_3',
      revisionNumber: 3,
      lines: [
        {
          lineId: 'line_13_1',
          designId: 'IVY-24-MINIMAL',
          quantity: 200,
          unitPriceVnd: 60000,
          lineTotalVnd: 12000000,
          displayVariant: 'Thiệp cưới tối giản Minimal',
        },
      ],
      orderTotalVnd: 12000000,
      estimatedHandoverAt: '2026-08-10T10:00:00.000Z',
      expiresAt: '2026-08-05T10:00:00.000Z',
      createdAt: '2026-08-01T09:00:00.000Z',
    },
    pendingReplacementProposal: null,
    receivableChargeId: 'chg_13_3',
    readyAt: '2026-08-08T14:00:00.000Z',
    handedOverAt: '2026-08-10T11:20:00.000Z',
    evidenceReference: 'BBBG-2408-013-VL-YN',
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-10T11:20:00.000Z',
  },
  {
    orderId: 'IN-2408-012',
    bookingId: 'bk_2408_012_ngoclan',
    status: 'CANCELLED',
    revision: 2,
    displayCouple: 'Thế Vinh & Mỹ Duyên',
    displayEventDate: '02/10/2026',
    displayHall: 'Sảnh Ngọc Lan',
    lines: [
      {
        lineId: 'line_12_1',
        designId: 'IVY-24-CUSTOM-ART',
        quantity: 250,
        printableRevisionId: 'prev_12_1',
        displayVariant: 'Thiệp vẽ tay mỹ thuật',
      },
    ],
    currentCommercialRevisionId: 'rev_12_1',
    currentCommercialRevision: {
      commercialRevisionId: 'rev_12_1',
      revisionNumber: 1,
      lines: [
        {
          lineId: 'line_12_1',
          designId: 'IVY-24-CUSTOM-ART',
          quantity: 250,
          unitPriceVnd: 120000,
          lineTotalVnd: 30000000,
          displayVariant: 'Thiệp vẽ tay mỹ thuật',
        },
      ],
      orderTotalVnd: 30000000,
      estimatedHandoverAt: '2026-08-20T10:00:00.000Z',
      expiresAt: '2026-08-10T10:00:00.000Z',
      createdAt: '2026-08-03T10:00:00.000Z',
    },
    pendingReplacementProposal: null,
    receivableChargeId: null,
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-08-03T09:00:00.000Z',
    updatedAt: '2026-08-06T15:00:00.000Z',
  },
  {
    orderId: 'IN-2408-019',
    bookingId: 'bk_2408_019_hoangyen',
    status: 'REQUESTED',
    revision: 1,
    displayCouple: 'Hải Đăng & Thùy Dương',
    displayEventDate: '15/10/2026',
    displayHall: 'Sảnh Hoàng Yến',
    lines: [
      {
        lineId: 'line_19_1',
        designId: 'IVY-24-PREMIUM-GOLD',
        quantity: 300,
        printableRevisionId: 'prev_19_1',
        displayVariant: 'Thiệp cưới ép kim cao cấp',
      },
      {
        lineId: 'line_19_2',
        designId: 'IVY-24-SAVE-THE-DATE',
        quantity: 150,
        printableRevisionId: 'prev_19_1_std',
        displayVariant: 'Thiệp báo hỷ (Save the Date)',
      },
    ],
    currentCommercialRevisionId: null,
    currentCommercialRevision: null,
    pendingReplacementProposal: null,
    receivableChargeId: null,
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-08-05T08:30:00.000Z',
    updatedAt: '2026-08-05T08:30:00.000Z',
  },
];

export function createFixturePrintOrdersGateway(
  initialOrders: readonly PrintOrderView[] = DEMO_PRINT_ORDERS,
): ManagementPrintOrdersGateway {
  const orders = [...initialOrders];

  return {
    async list(_token, query) {
      await Promise.resolve();
      let filtered = [...orders];
      if (query?.bookingId) {
        filtered = filtered.filter((o) => o.bookingId === query.bookingId);
      }
      let startIndex = 0;
      if (query?.cursor) {
        const found = filtered.findIndex((o) => o.orderId === query.cursor);
        if (found !== -1) {
          startIndex = found;
        }
      }
      const limit = query?.limit ?? filtered.length;
      const pageItems = filtered.slice(startIndex, startIndex + limit);
      const nextItem = filtered[startIndex + limit];
      const nextCursor = nextItem ? nextItem.orderId : null;
      return {
        items: pageItems,
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
