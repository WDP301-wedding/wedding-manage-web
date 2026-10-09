import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { ManagerInvitationView } from "./manager-invitation-view";
import type { ManagerInvitationGateway, ManagedPrintOrderView } from "./manager-invitation-api";

describe("ManagerInvitationView (IS-W7 Manager Web Component)", () => {
  const token = "manager-token";
  const initialOrder: ManagedPrintOrderView = {
    orderId: "order-1",
    bookingId: "booking-1",
    status: "REQUESTED",
    revision: 1,
    currentCommercialRevisionId: null,
    receivableChargeId: null,
    currentCommercialRevision: null,
    pendingReplacementProposal: null,
    lines: [
      {
        lineId: "line-1",
        designId: "des-1",
        printableRevisionId: null,
        quantity: 200,
      },
    ],
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: "2026-10-09T00:00:00Z",
    updatedAt: "2026-10-09T00:00:00Z",
  };

  const mockGateway: ManagerInvitationGateway = {
    listPrintOrders: vi.fn().mockResolvedValue([initialOrder]),
    getPrintOrder: vi.fn().mockResolvedValue(initialOrder),
    quotePrintOrder: vi.fn().mockResolvedValue({ ...initialOrder, status: "QUOTED", revision: 2 }),
    startProduction: vi.fn().mockResolvedValue({ ...initialOrder, status: "IN_PRODUCTION", revision: 3 }),
    markReady: vi.fn().mockResolvedValue({ ...initialOrder, status: "READY_FOR_HANDOVER", revision: 4 }),
    markHandover: vi.fn().mockResolvedValue({ ...initialOrder, status: "HANDED_OVER", revision: 5 }),
    cancelPrintOrder: vi.fn().mockResolvedValue(undefined),
    listTemplates: vi.fn().mockResolvedValue([]),
    createTemplate: vi.fn(),
    reviseTemplate: vi.fn(),
    updateMediaPolicy: vi.fn().mockResolvedValue({ revision: 2, cutoffAt: "2026-10-22T00:00:00.000Z" }),
  };

  it("renders orders list and displays quoting form on button click", async () => {
    render(
      <ManagerInvitationView
        accessToken={token}
        gateway={mockGateway}
        initialOrders={[initialOrder]}
      />
    );

    expect(screen.getByText("Quản Lý Xưởng Thiệp Cưới & In Ấn")).toBeInTheDocument();
    expect(screen.getByText("Đơn: order-1")).toBeInTheDocument();
    expect(screen.getByText("Chờ Báo Giá")).toBeInTheDocument();

    const quoteBtn = screen.getByRole("button", { name: "Báo Giá" });
    fireEvent.click(quoteBtn);

    expect(screen.getByText("Gửi Báo Giá Đơn In")).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: "Xác Nhận Báo Giá" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockGateway.quotePrintOrder).toHaveBeenCalledWith(
        token,
        "order-1",
        1,
        [{ lineId: "line-1", unitPriceVnd: 5000 }],
        expect.any(String),
      );
    });

    expect(await screen.findByText("Đã gửi báo giá cho đơn order-1!")).toBeInTheDocument();
  });

  it("switches to Cutoff tab and updates media cutoff hours", async () => {
    render(
      <ManagerInvitationView
        accessToken={token}
        gateway={mockGateway}
        initialOrders={[initialOrder]}
      />
    );

    const cutoffTabBtn = screen.getByRole("button", { name: "Chính Sách Cutoff Media" });
    fireEvent.click(cutoffTabBtn);

    expect(screen.getByText("Cập Nhật Thời Hạn Cutoff Media")).toBeInTheDocument();

    const bookingInput = screen.getByPlaceholderText("00000000-0000-0000-0000-000000000001");
    fireEvent.change(bookingInput, { target: { value: "booking-1" } });

    const submitBtn = screen.getByRole("button", { name: "Cập Nhật Cutoff Policy" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockGateway.updateMediaPolicy).toHaveBeenCalledWith(
        token,
        "booking-1",
        1,
        expect.any(String),
      );
    });

    expect(await screen.findByText(/Đã cập nhật cutoff media thành công/)).toBeInTheDocument();
  });
});
