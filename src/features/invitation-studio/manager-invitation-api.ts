import { createApiClient, type ApiClient } from "../../lib/api/client";
import type { operations } from "../../lib/api/generated/schema";

export type ManagedPrintOrderView =
  operations["getManagementPrintOrder"]["responses"][200]["content"]["application/json"]["data"];
export type ManagedTemplateView =
  operations["listManagedInvitationTemplates"]["responses"][200]["content"]["application/json"]["data"]["items"][number];
export type MediaPolicyView =
  operations["changeWeddingMediaCutoff"]["responses"][200]["content"]["application/json"]["data"];

export type DesignTextFields = {
  brideName?: string;
  groomName?: string;
  greeting?: string;
  message?: string;
  footer?: string;
};

export type DesignSection = {
  kind: "HERO" | "MESSAGE" | "EVENT" | "TIMELINE" | "SEATING" | "FOOTER";
  textKey: "brideName" | "groomName" | "greeting" | "message" | "footer" | null;
  derivedAssetId: string | null;
};

export type DesignContentInput = {
  title: string;
  textFields: DesignTextFields;
  sections: readonly DesignSection[];
  derivedAssetIds: readonly string[];
  includesSeating: boolean;
};

export interface QuoteLineInput {
  lineId: string;
  unitPriceVnd: number;
}

export interface ManagerInvitationGateway {
  listPrintOrders(
    this: void,
    accessToken: string,
    bookingId?: string,
  ): Promise<readonly ManagedPrintOrderView[]>;
  getPrintOrder(
    this: void,
    accessToken: string,
    orderId: string,
  ): Promise<ManagedPrintOrderView>;
  quotePrintOrder(
    this: void,
    accessToken: string,
    orderId: string,
    expectedRevision: number,
    lines: readonly QuoteLineInput[],
    estimatedHandoverAt: string,
  ): Promise<ManagedPrintOrderView>;
  startProduction(
    this: void,
    accessToken: string,
    orderId: string,
    expectedRevision: number,
  ): Promise<ManagedPrintOrderView>;
  markReady(
    this: void,
    accessToken: string,
    orderId: string,
    expectedRevision: number,
  ): Promise<ManagedPrintOrderView>;
  markHandover(
    this: void,
    accessToken: string,
    orderId: string,
    expectedRevision: number,
    evidenceReference: string,
    idempotencyKey?: string,
  ): Promise<ManagedPrintOrderView>;
  cancelPrintOrder(
    this: void,
    accessToken: string,
    orderId: string,
    expectedRevision: number,
    reason: string,
  ): Promise<void>;
  listTemplates(
    this: void,
    accessToken: string,
  ): Promise<readonly ManagedTemplateView[]>;
  createTemplate(
    this: void,
    accessToken: string,
    expectedRevision: number,
    active: boolean,
    content: DesignContentInput,
  ): Promise<ManagedTemplateView>;
  reviseTemplate(
    this: void,
    accessToken: string,
    templateId: string,
    expectedRevision: number,
    active: boolean,
    content: DesignContentInput,
  ): Promise<ManagedTemplateView>;
  updateMediaPolicy(
    this: void,
    accessToken: string,
    bookingId: string,
    expectedRevision: number,
    cutoffAt: string,
  ): Promise<MediaPolicyView>;
}

function intent(scope: string, callerKey?: string): string {
  return callerKey ?? `${scope}:${crypto.randomUUID()}`;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Thiếu dữ liệu phản hồi.");
  return value;
}

export function createManagerInvitationGateway(client?: ApiClient): ManagerInvitationGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

  return {
    async listPrintOrders(accessToken, bookingId): Promise<readonly ManagedPrintOrderView[]> {
      const { data, error } = await api().GET("/management/print-orders", {
        headers: headers(accessToken),
        params: { query: bookingId ? { bookingId } : {} },
      });
      if (error !== undefined) throw new Error("Không thể tải danh sách đơn in.");
      return required(data).data.items as unknown as readonly ManagedPrintOrderView[];
    },

    async getPrintOrder(accessToken, orderId): Promise<ManagedPrintOrderView> {
      const { data, error } = await api().GET("/management/print-orders/{orderId}", {
        headers: headers(accessToken),
        params: { path: { orderId } },
      });
      if (error !== undefined) throw new Error("Không thể tải chi tiết đơn in.");
      return required(data).data as unknown as ManagedPrintOrderView;
    },

    async quotePrintOrder(accessToken, orderId, expectedRevision, lines, estimatedHandoverAt): Promise<ManagedPrintOrderView> {
      const { data, error } = await api().POST("/management/print-orders/{orderId}/quotations", {
        headers: headers(accessToken),
        params: {
          path: { orderId },
          header: { "Idempotency-Key": intent("quote-order") },
        },
        body: { expectedRevision, lines, estimatedHandoverAt },
      });
      if (error !== undefined) throw new Error("Không thể báo giá đơn in.");
      return required(data).data as unknown as ManagedPrintOrderView;
    },

    async startProduction(accessToken, orderId, expectedRevision): Promise<ManagedPrintOrderView> {
      const { data, error } = await api().POST("/management/print-orders/{orderId}/production", {
        headers: headers(accessToken),
        params: {
          path: { orderId },
          header: { "Idempotency-Key": intent("start-prod") },
        },
        body: { expectedRevision },
      });
      if (error !== undefined) throw new Error("Không thể chuyển sang sản xuất.");
      return required(data).data as unknown as ManagedPrintOrderView;
    },

    async markReady(accessToken, orderId, expectedRevision): Promise<ManagedPrintOrderView> {
      const { data, error } = await api().POST("/management/print-orders/{orderId}/ready", {
        headers: headers(accessToken),
        params: {
          path: { orderId },
          header: { "Idempotency-Key": intent("mark-ready") },
        },
        body: { expectedRevision },
      });
      if (error !== undefined) throw new Error("Không thể cập nhật sẵn sàng bàn giao.");
      return required(data).data as unknown as ManagedPrintOrderView;
    },

    async markHandover(accessToken, orderId, expectedRevision, evidenceReference, idempotencyKey): Promise<ManagedPrintOrderView> {
      const { data, error } = await api().POST("/management/print-orders/{orderId}/handover", {
        headers: headers(accessToken),
        params: {
          path: { orderId },
          header: { "Idempotency-Key": intent("handover", idempotencyKey) },
        },
        body: { expectedRevision, evidenceReference },
      });
      if (error !== undefined) throw new Error("Không thể hoàn tất bàn giao.");
      return required(data).data as unknown as ManagedPrintOrderView;
    },

    async cancelPrintOrder(accessToken, orderId, expectedRevision, reason): Promise<void> {
      const { error } = await api().POST("/management/print-orders/{orderId}/cancellation", {
        headers: headers(accessToken),
        params: {
          path: { orderId },
          header: { "Idempotency-Key": intent("cancel-order") },
        },
        body: { expectedRevision, reason },
      });
      if (error !== undefined) throw new Error("Không thể hủy đơn in.");
    },

    async listTemplates(accessToken): Promise<readonly ManagedTemplateView[]> {
      const { data, error } = await api().GET("/management/invitation-templates", {
        headers: headers(accessToken),
      });
      if (error !== undefined) throw new Error("Không thể tải danh sách mẫu thiệp.");
      return required(data).data.items as unknown as readonly ManagedTemplateView[];
    },

    async createTemplate(accessToken, expectedRevision, active, content): Promise<ManagedTemplateView> {
      const { data, error } = await api().POST("/management/invitation-templates", {
        headers: headers(accessToken),
        params: {
          header: { "Idempotency-Key": intent("create-template") },
        },
        body: { expectedRevision, active, content },
      });
      if (error !== undefined) throw new Error("Không thể tạo mẫu thiệp.");
      return required(data).data as unknown as ManagedTemplateView;
    },

    async reviseTemplate(accessToken, templateId, expectedRevision, active, content): Promise<ManagedTemplateView> {
      const { data, error } = await api().PATCH("/management/invitation-templates/{templateId}", {
        headers: headers(accessToken),
        params: {
          path: { templateId },
          header: { "Idempotency-Key": intent("revise-template") },
        },
        body: { expectedRevision, active, content },
      });
      if (error !== undefined) throw new Error("Không thể cập nhật mẫu thiệp.");
      return required(data).data as unknown as ManagedTemplateView;
    },

    async updateMediaPolicy(accessToken, bookingId, expectedRevision, cutoffAt): Promise<MediaPolicyView> {
      const { data, error } = await api().PATCH("/management/bookings/{bookingId}/media-policy", {
        headers: headers(accessToken),
        params: {
          path: { bookingId },
          header: { "Idempotency-Key": intent("media-cutoff") },
        },
        body: { expectedRevision, cutoffAt },
      });
      if (error !== undefined) throw new Error("Không thể cập nhật chính sách cutoff media.");
      return required(data).data;
    },
  };
}
