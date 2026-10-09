import { describe, it, expect, vi } from "vitest";
import { createManagerInvitationGateway } from "./manager-invitation-api";
import type { ApiClient } from "../../lib/api/client";

describe("ManagerInvitationGateway (IS-W7 Manager Web)", () => {
  const token = "manager-token";
  const orderId = "00000000-0000-0000-0000-000000000001";
  const bookingId = "11111111-1111-1111-1111-111111111111";

  it("lists print orders for manager", async () => {
    const mockClient = {
      GET: vi.fn().mockResolvedValue({
        data: { data: { items: [{ orderId, status: "REQUESTED" }] } },
      }),
    } as unknown as ApiClient;

    const gateway = createManagerInvitationGateway(mockClient);
    const orders = await gateway.listPrintOrders(token, bookingId);

    expect(orders).toHaveLength(1);
    expect(orders[0]?.orderId).toBe(orderId);
    expect(mockClient.GET).toHaveBeenCalledWith(
      "/management/print-orders",
      expect.anything(),
    );
  });

  it("quotes print order with unit prices", async () => {
    const mockClient = {
      POST: vi.fn().mockResolvedValue({
        data: { data: { orderId, status: "QUOTED" } },
      }),
    } as unknown as ApiClient;

    const gateway = createManagerInvitationGateway(mockClient);
    const res = await gateway.quotePrintOrder(token, orderId, 1, [{ lineId: "line-1", unitPriceVnd: 5000 }], "2026-10-25T00:00:00Z");

    expect(res.status).toBe("QUOTED");
    expect(mockClient.POST).toHaveBeenCalledWith(
      "/management/print-orders/{orderId}/quotations",
      expect.anything(),
    );
  });

  it("advances order to production, ready, and handover", async () => {
    const mockClient = {
      POST: vi.fn()
        .mockResolvedValueOnce({ data: { data: { orderId, status: "IN_PRODUCTION" } } })
        .mockResolvedValueOnce({ data: { data: { orderId, status: "READY_FOR_HANDOVER" } } })
        .mockResolvedValueOnce({ data: { data: { orderId, status: "HANDED_OVER" } } }),
    } as unknown as ApiClient;

    const gateway = createManagerInvitationGateway(mockClient);
    const prod = await gateway.startProduction(token, orderId, 1);
    expect(prod.status).toBe("IN_PRODUCTION");

    const ready = await gateway.markReady(token, orderId, 2);
    expect(ready.status).toBe("READY_FOR_HANDOVER");

    const handover = await gateway.markHandover(token, orderId, 3, "BBBG-12345");
    expect(handover.status).toBe("HANDED_OVER");
  });

  it("cancels order with explicit credit registration", async () => {
    const mockClient = {
      POST: vi.fn().mockResolvedValue({ data: { data: { orderId, status: "CANCELLED" } } }),
    } as unknown as ApiClient;

    const gateway = createManagerInvitationGateway(mockClient);
    await gateway.cancelPrintOrder(token, orderId, 1, "Hủy theo yêu cầu khách");
    expect(mockClient.POST).toHaveBeenCalledWith(
      "/management/print-orders/{orderId}/cancellation",
      expect.anything(),
    );
  });

  it("updates media cutoff policy with audited revision", async () => {
    const mockClient = {
      PATCH: vi.fn().mockResolvedValue({
        data: { data: { revision: 2, cutoffAt: "2026-10-22T00:00:00.000Z" } },
      }),
    } as unknown as ApiClient;

    const gateway = createManagerInvitationGateway(mockClient);
    const policy = await gateway.updateMediaPolicy(token, bookingId, 1, "2026-10-22T00:00:00.000Z");
    expect(policy.revision).toBe(2);
    expect(mockClient.PATCH).toHaveBeenCalledWith(
      "/management/bookings/{bookingId}/media-policy",
      expect.anything(),
    );
  });
});
