"use client";

import React, { useState } from "react";
import type {
  ManagerInvitationGateway,
  ManagedPrintOrderView,
  ManagedTemplateView,
} from "./manager-invitation-api";

export interface ManagerInvitationViewProps {
  readonly accessToken: string;
  readonly gateway: ManagerInvitationGateway;
  readonly initialOrders?: readonly ManagedPrintOrderView[];
  readonly initialTemplates?: readonly ManagedTemplateView[];
}

export function ManagerInvitationView({
  accessToken,
  gateway,
  initialOrders = [],
  initialTemplates = [],
}: ManagerInvitationViewProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "templates" | "cutoff">("orders");
  const [orders, setOrders] = useState<readonly ManagedPrintOrderView[]>(initialOrders);
  const [templates] = useState<readonly ManagedTemplateView[]>(initialTemplates);

  // Quoting state
  const [quotingOrderId, setQuotingOrderId] = useState<string | null>(null);
  const [unitPriceInput, setUnitPriceInput] = useState<number>(5000);
  const [handoverDateInput, setHandoverDateInput] = useState<string>("2026-10-25T18:00:00Z");

  // Handover state
  const [handoverOrderId, setHandoverOrderId] = useState<string | null>(null);
  const [evidenceRefInput, setEvidenceRefInput] = useState<string>("");

  // Cutoff state
  const [cutoffBookingId, setCutoffBookingId] = useState<string>("");
  const [cutoffAtInput, setCutoffAtInput] = useState<string>("2026-10-22T00:00:00.000Z");
  const [cutoffRevision, setCutoffRevision] = useState<number>(1);

  // Feedback notice
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuoteSubmit = async (e: React.FormEvent, order: ManagedPrintOrderView) => {
    e.preventDefault();
    if (unitPriceInput <= 0) {
      setNotice({ type: "error", text: "Đơn giá phải lớn hơn 0 VND." });
      return;
    }
    setIsSubmitting(true);
    setNotice(null);
    try {
      const lines = order.lines.map((l) => ({
        lineId: l.lineId,
        unitPriceVnd: unitPriceInput,
      }));
      const updated = await gateway.quotePrintOrder(
        accessToken,
        order.orderId,
        order.revision,
        lines,
        handoverDateInput,
      );
      setOrders(orders.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setQuotingOrderId(null);
      setNotice({ type: "success", text: `Đã gửi báo giá cho đơn ${order.orderId}!` });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Báo giá thất bại." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartProduction = async (order: ManagedPrintOrderView) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const updated = await gateway.startProduction(accessToken, order.orderId, order.revision);
      setOrders(orders.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setNotice({ type: "success", text: "Đã chuyển đơn in sang trạng thái Đang sản xuất!" });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Lỗi chuyển sản xuất." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkReady = async (order: ManagedPrintOrderView) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const updated = await gateway.markReady(accessToken, order.orderId, order.revision);
      setOrders(orders.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setNotice({ type: "success", text: "Đơn in đã sẵn sàng bàn giao!" });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Lỗi chuyển sẵn sàng." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHandoverSubmit = async (e: React.FormEvent, order: ManagedPrintOrderView) => {
    e.preventDefault();
    if (!evidenceRefInput.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập mã biên bản hoặc ảnh xác nhận bàn giao." });
      return;
    }
    setIsSubmitting(true);
    setNotice(null);
    try {
      const updated = await gateway.markHandover(
        accessToken,
        order.orderId,
        order.revision,
        evidenceRefInput.trim(),
      );
      setOrders(orders.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setHandoverOrderId(null);
      setEvidenceRefInput("");
      setNotice({ type: "success", text: "Đã hoàn tất bàn giao đơn in thiệp!" });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Lỗi bàn giao." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (order: ManagedPrintOrderView) => {
    const reason = window.prompt("Nhập lý do hủy đơn in thiệp:", "Quản lý hủy theo thỏa thuận");
    if (!reason) return;
    setIsSubmitting(true);
    setNotice(null);
    try {
      await gateway.cancelPrintOrder(accessToken, order.orderId, order.revision, reason);
      setOrders(orders.filter((o) => o.orderId !== order.orderId));
      setNotice({ type: "success", text: "Đã hủy đơn in thành công!" });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Lỗi hủy đơn." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCutoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cutoffBookingId.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập Booking ID." });
      return;
    }
    setIsSubmitting(true);
    setNotice(null);
    try {
      const res = await gateway.updateMediaPolicy(
        accessToken,
        cutoffBookingId.trim(),
        cutoffRevision,
        cutoffAtInput,
      );
      setCutoffRevision(res.revision);
      setNotice({ type: "success", text: `Đã cập nhật cutoff media thành công: ${res.cutoffAt} (Revision ${res.revision})` });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Lỗi cập nhật cutoff." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Chờ Báo Giá</span>;
      case "QUOTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Đã Báo Giá</span>;
      case "APPROVED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Đã Duyệt</span>;
      case "IN_PRODUCTION":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Đang Sản Xuất</span>;
      case "READY_FOR_HANDOVER":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">Sẵn Sàng Bàn Giao</span>;
      case "HANDED_OVER":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Đã Bàn Giao</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Đã Hủy</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header className="border-b border-[#E2E8F0] pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1B4332]">
          Quản Lý Xưởng Thiệp Cưới &amp; In Ấn
        </h1>
        <p className="mt-1 text-sm text-[#52796F]">
          Quản lý quy trình báo giá, sản xuất, bàn giao đơn in thiệp và chính sách cutoff media.
        </p>
      </header>

      {notice && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm ${
            notice.type === "success"
              ? "bg-[#D8F3DC] text-[#1B4332] border border-[#95D5B2]"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Tabs */}
      <nav className="flex space-x-4 border-b border-gray-200" aria-label="Tabs">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`min-h-[44px] py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "orders"
              ? "border-[#1B4332] text-[#1B4332]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Đơn In Thiệp ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`min-h-[44px] py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-[#1B4332] text-[#1B4332]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Mẫu Thiệp Thư Viện ({templates.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cutoff")}
          className={`min-h-[44px] py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "cutoff"
              ? "border-[#1B4332] text-[#1B4332]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Chính Sách Cutoff Media
        </button>
      </nav>

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <section aria-label="Danh sách đơn in" className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
              Chưa có đơn in thiệp nào từ khách hàng.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200 shadow-sm">
              {orders.map((order) => (
                <div key={order.orderId} className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Đơn: {order.orderId}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Booking ID: {order.bookingId} • Revision: {order.revision}
                      </p>
                    </div>
                    {order.currentCommercialRevision && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#1B4332]">
                          {order.currentCommercialRevision.orderTotalVnd.toLocaleString("vi-VN")} VND
                        </div>
                        <div className="text-xs text-gray-500">
                          Dự kiến: {new Date(order.currentCommercialRevision.estimatedHandoverAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lines detail */}
                  <div className="bg-[#FAF9F6] p-4 rounded-lg text-sm space-y-2">
                    <p className="font-medium text-gray-700">Chi tiết ấn phẩm:</p>
                    {order.lines.map((line) => (
                      <div key={line.lineId} className="flex justify-between text-xs text-gray-600">
                        <span>Thiết kế {line.designId} × {line.quantity} thiệp</span>
                        <span>{line.printableRevisionId ? "Bản in: " + line.printableRevisionId : "Chưa gắn bản in"}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quoting form */}
                  {quotingOrderId === order.orderId && (
                    <form
                      onSubmit={(e) => { void handleQuoteSubmit(e, order); }}
                      className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3"
                    >
                      <h4 className="font-medium text-amber-900 text-sm">Gửi Báo Giá Đơn In</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-amber-800 mb-1">
                            Đơn giá mỗi thiệp (VND)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000000"
                            value={unitPriceInput}
                            onChange={(e) => setUnitPriceInput(Number(e.target.value))}
                            className="min-h-[44px] w-full px-3 py-2 border rounded-md text-sm bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-amber-800 mb-1">
                            Ngày dự kiến hoàn tất
                          </label>
                          <input
                            type="datetime-local"
                            value={handoverDateInput.slice(0, 16)}
                            onChange={(e) => setHandoverDateInput(new Date(e.target.value).toISOString())}
                            className="min-h-[44px] w-full px-3 py-2 border rounded-md text-sm bg-white"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="min-h-[44px] px-4 py-2 bg-[#1B4332] text-white text-sm font-medium rounded-md hover:bg-[#2D6A4F]"
                        >
                          Xác Nhận Báo Giá
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuotingOrderId(null)}
                          className="min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md"
                        >
                          Hủy Bỏ
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Handover form */}
                  {handoverOrderId === order.orderId && (
                    <form
                      onSubmit={(e) => { void handleHandoverSubmit(e, order); }}
                      className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl space-y-3"
                    >
                      <h4 className="font-medium text-cyan-900 text-sm">Xác Nhận Bàn Giao Khách Hàng</h4>
                      <div>
                        <label className="block text-xs font-medium text-cyan-800 mb-1">
                          Mã biên bản / Tham chiếu bằng chứng bàn giao (1-120 ký tự)
                        </label>
                        <input
                          type="text"
                          maxLength={120}
                          value={evidenceRefInput}
                          onChange={(e) => setEvidenceRefInput(e.target.value)}
                          placeholder="VD: BBBG-20261025-001"
                          className="min-h-[44px] w-full px-3 py-2 border rounded-md text-sm bg-white"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="min-h-[44px] px-4 py-2 bg-[#1B4332] text-white text-sm font-medium rounded-md hover:bg-[#2D6A4F]"
                        >
                          Lưu Biên Bản Bàn Giao
                        </button>
                        <button
                          type="button"
                          onClick={() => setHandoverOrderId(null)}
                          className="min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md"
                        >
                          Hủy Bỏ
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {order.status === "REQUESTED" && (
                      <button
                        type="button"
                        onClick={() => setQuotingOrderId(order.orderId)}
                        className="min-h-[44px] px-4 py-2 bg-[#1B4332] text-white text-sm font-medium rounded-md hover:bg-[#2D6A4F]"
                      >
                        Báo Giá
                      </button>
                    )}
                    {order.status === "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => { void handleStartProduction(order); }}
                        disabled={isSubmitting}
                        className="min-h-[44px] px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                      >
                        Bắt Đầu Sản Xuất
                      </button>
                    )}
                    {order.status === "IN_PRODUCTION" && (
                      <button
                        type="button"
                        onClick={() => { void handleMarkReady(order); }}
                        disabled={isSubmitting}
                        className="min-h-[44px] px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-md hover:bg-cyan-700"
                      >
                        Sẵn Sàng Bàn Giao
                      </button>
                    )}
                    {order.status === "READY_FOR_HANDOVER" && (
                      <button
                        type="button"
                        onClick={() => setHandoverOrderId(order.orderId)}
                        className="min-h-[44px] px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
                      >
                        Hoàn Tất Bàn Giao
                      </button>
                    )}
                    {order.status !== "HANDED_OVER" && order.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => { void handleCancelOrder(order); }}
                        disabled={isSubmitting}
                        className="min-h-[44px] px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50"
                      >
                        Hủy Đơn
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <section aria-label="Thư viện mẫu thiệp" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div key={tpl.templateId} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 text-lg">{tpl.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tpl.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                    {tpl.active ? "Đang Sử Dụng" : "Lưu Trữ"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Mã: {tpl.templateId}</p>
                <div className="bg-[#FAF9F6] p-3 rounded text-xs text-gray-600 space-y-1">
                  <p>Lời chào: {tpl.textFields?.greeting ?? "Mặc định"}</p>
                  <p>Số mục: {tpl.sections.length} phần</p>
                  <p>Sơ đồ bàn: {tpl.includesSeating ? "Có" : "Không"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cutoff Policy Tab */}
      {activeTab === "cutoff" && (
        <section aria-label="Chính sách cutoff media" className="max-w-xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Cập Nhật Thời Hạn Cutoff Media</h3>
          <p className="text-xs text-gray-500">
            Manager điều chỉnh chính sách cutoff tải ảnh của tiệc cưới. Mặc định là 72 giờ trước khi tiệc bắt đầu. Sau cutoff, cặp đôi không thể thêm/xóa ảnh thư viện.
          </p>

          <form onSubmit={(e) => { void handleUpdateCutoff(e); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking ID (UUID)
              </label>
              <input
                type="text"
                value={cutoffBookingId}
                onChange={(e) => setCutoffBookingId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000001"
                className="min-h-[44px] w-full px-3 py-2 border rounded-md text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời hạn Cutoff Media (ISO Datetime)
              </label>
              <input
                type="datetime-local"
                value={cutoffAtInput.slice(0, 16)}
                onChange={(e) => setCutoffAtInput(new Date(e.target.value).toISOString())}
                className="min-h-[44px] w-full px-3 py-2 border rounded-md text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] w-full px-4 py-2 bg-[#1B4332] text-white text-sm font-medium rounded-md hover:bg-[#2D6A4F]"
            >
              Cập Nhật Cutoff Policy
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
