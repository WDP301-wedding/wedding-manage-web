'use client';

import { useEffect, useRef, useState } from 'react';
import {
  billingService,
  type IncidentalExpensesResponse,
  type FinalInvoicesResponse,
} from '../../services/billing.service';
import { contractService, type AppendixListData } from '../../services/contract.service';
import { describeApiError } from '../../lib/api/api-errors';
import { formatVnd } from '../../lib/formatters';
import { IncidentalCreateForm, type IncidentalFormData } from './incidental-create-form';
import { IncidentalTable } from './incidental-table';
import { FinalInvoicesList } from './final-invoices-list';
import { notify } from '../../design-system/notifications';

export function IncidentalsPanel({
  bookingId,
  disabled,
  billingRevision,
  onRefresh,
}: Readonly<{
  bookingId: string;
  disabled: boolean;
  billingRevision: number;
  onRefresh: () => void;
}>) {
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [incidentals, setIncidentals] = useState<IncidentalExpensesResponse | null>(null);
  const [finalInvoices, setFinalInvoices] = useState<FinalInvoicesResponse | null>(null);
  const [appendices, setAppendices] = useState<AppendixListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const activeBookingIdRef = useRef(bookingId);

  const loadData = async (targetId = bookingId) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [incRes, finRes, appRes] = await Promise.allSettled([
        billingService.getIncidentals(targetId),
        billingService.getFinalInvoices(targetId),
        contractService.getAppendices(targetId),
      ]);
      if (activeBookingIdRef.current !== targetId) return;

      const errors: string[] = [];
      if (incRes.status === 'fulfilled') {
        setIncidentals(incRes.value);
      } else {
        const friendly = describeApiError(incRes.reason);
        errors.push(`Phát sinh: ${friendly.message}`);
      }

      if (finRes.status === 'fulfilled') {
        setFinalInvoices(finRes.value);
      } else {
        const friendly = describeApiError(finRes.reason);
        errors.push(`Hoá đơn: ${friendly.message}`);
      }

      if (appRes.status === 'fulfilled') {
        setAppendices(appRes.value);
      }

      if (errors.length > 0) {
        setError(errors.join(' | '));
      }
    } catch (err) {
      if (activeBookingIdRef.current !== targetId) return;
      const friendly = describeApiError(err);
      setError(friendly.message);
    } finally {
      if (activeBookingIdRef.current === targetId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeBookingIdRef.current = bookingId;
    setIncidentals(null);
    setFinalInvoices(null);
    setAppendices(null);
    setError(null);
    setMessage(null);
    setShowFinalizeConfirm(false);
    void loadData(bookingId);
  }, [bookingId]);

  const handleCreateIncidental = async (formData: IncidentalFormData) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await billingService.createIncidental(bookingId, {
        ...formData,
        expectedRevision: incidentals?.revision ?? 1,
      });
      const msg = 'Đã thêm chi phí phát sinh thành công.';
      setMessage(msg);
      notify.success(msg);
      setShowAddForm(false);
      await loadData();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err, {
        EVENT_NOT_ENDED: 'Chỉ có thể ghi nhận phát sinh sau khi tiệc kết thúc.',
      });
      setError(friendly.message);
      notify.error(err, { message: friendly.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    setLoading(true);
    setError(null);
    try {
      await billingService.deleteIncidental(bookingId, lineId, incidentals?.revision ?? 1);
      const msg = 'Đã xoá dòng phát sinh.';
      setMessage(msg);
      notify.success(msg);
      await loadData();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err);
      setError(friendly.message);
      notify.error(err, { message: friendly.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!appendices?.effectiveRevisionId) {
      const msg =
        'Chưa thể chốt hoá đơn: không tìm thấy thoả thuận thương mại hiệu lực của booking.';
      setError(msg);
      notify.error(msg);
      return;
    }
    setFinalizing(true);
    setError(null);
    setMessage(null);
    try {
      await billingService.finalizeInvoice(bookingId, {
        expectedBillingRevision: billingRevision,
        expectedCommercialRevisionId: appendices.effectiveRevisionId,
        expectedDraftRevision: incidentals?.revision ?? 0,
      });
      const msg = 'Đã chốt hoá đơn quyết toán cuối thành công. Sổ cái công nợ đã được khoá sổ.';
      setMessage(msg);
      notify.success(msg);
      setShowFinalizeConfirm(false);
      await loadData();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err, {
        EVENT_NOT_ENDED:
          'Tiệc chưa kết thúc; chỉ được chốt chi phí phát sinh và hoá đơn sau khi tan tiệc.',
        INVOICE_FINALIZED: 'Hoá đơn quyết toán cuối đã được chốt và khoá sổ từ trước.',
        COMMERCIAL_PREDECESSOR_STALE: 'Thoả thuận thương mại vừa thay đổi. Vui lòng làm mới trang.',
        EXPENSE_REVISION_STALE: 'Dữ liệu phát sinh vừa thay đổi. Vui lòng làm mới trang.',
      });
      setError(friendly.message);
      notify.error(err, { message: friendly.message });
    } finally {
      setFinalizing(false);
    }
  };

  const hasFinalizedInvoice = Boolean(finalInvoices && finalInvoices.revisions.length > 0);
  const commercialTotal = appendices?.effectiveTotalVnd ?? 0;
  const incidentalTotal = incidentals?.totalVnd ?? 0;
  const projectedTotal = commercialTotal + incidentalTotal;

  return (
    <section className="billing-panel" style={{ marginTop: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2
            style={{
              margin: '0 0 4px',
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--hy-ink)',
              lineHeight: 1.3,
            }}
          >
            Chi phí phát sinh &amp; Hoá đơn cuối
          </h2>
          <p style={{ margin: 0, color: 'var(--hy-ink-muted)', fontSize: '0.875rem' }}>
            Ghi nhận các khoản phát sinh sau giờ tiệc và kiểm tra quyết toán hoá đơn.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || loading || finalizing}
          className="hy-btn hy-btn-secondary"
          onClick={() => void loadData()}
        >
          {loading ? 'Đang tải…' : 'Làm mới'}
        </button>
      </div>

      {/* Bố cục 2 cột: Cột trái (Nghiệp vụ tất toán & Hoá đơn cuối) · Cột phải (Chi phí phát sinh nháp) */}
      <div className="incidentals-two-col-grid">
        {/* CỘT TRÁI: Nghiệp vụ tất toán sau tiệc & Hoá đơn cuối */}
        <div className="incidentals-settlement-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!hasFinalizedInvoice ? (
            <div
              style={{
                background: 'var(--hy-surface-container, #fdf6ee)',
                border: '1px solid var(--hy-outline, #eadfd6)',
                borderRadius: 'var(--hy-radius-md, 8px)',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span className="section-kicker">Nghiệp vụ tất toán sau tiệc</span>
                  <h3
                    style={{
                      margin: '0.25rem 0',
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.15rem',
                      fontWeight: 600,
                      color: 'var(--hy-wine, #7a1f3d)',
                      lineHeight: 1.3,
                    }}
                  >
                    Chốt hoá đơn quyết toán cuối
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--hy-ink-muted)',
                      fontSize: '0.85rem',
                      maxWidth: '560px',
                      lineHeight: 1.45,
                    }}
                  >
                    Sau khi tiệc cưới kết thúc và phát sinh được ghi nhận đầy đủ, Quản lý tiến hành chốt
                    hoá đơn để khoá sổ các khoản phát sinh và làm căn cứ thanh toán số dư hoặc hoàn
                    tiền.
                  </p>
                  {!appendices?.effectiveRevisionId ? (
                    <p
                      style={{
                        margin: '0.5rem 0 0',
                        color: 'var(--hy-status-warning, #8a5300)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      Cần hoàn tất hợp đồng và đặt cọc để xác định thoả thuận thương mại trước khi
                      chốt hoá đơn.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={disabled || loading || finalizing || !appendices?.effectiveRevisionId}
                  className="hy-btn hy-btn-primary"
                  onClick={() => setShowFinalizeConfirm(true)}
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  Chốt hoá đơn quyết toán
                </button>
              </div>

              {/* Bảng tóm tắt tài chính quyết toán dự kiến */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  background: '#ffffff',
                  border: '1px solid var(--hy-outline, #eadfd6)',
                  borderRadius: 6,
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                    Thoả thuận thương mại hiệu lực:
                  </span>
                  <strong>{formatVnd(commercialTotal)}</strong>
                  {appendices?.effectiveRevisionId ? (
                    <small style={{ display: 'block', color: 'var(--hy-text-muted, #6e5d63)' }}>
                      REV: {appendices.effectiveRevisionId.slice(0, 8)}…
                    </small>
                  ) : null}
                </div>

                <div>
                  <span style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                    Tổng phát sinh ({incidentals?.lines?.length ?? 0} khoản):
                  </span>
                  <strong>{formatVnd(incidentalTotal)}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                    Tổng quyết toán cuối dự kiến:
                  </span>
                  <strong
                    style={{
                      color: 'var(--hy-wine, #7a1f3d)',
                      fontSize: '1.05rem',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {formatVnd(projectedTotal)}
                  </strong>
                </div>
              </div>

              {/* Modal / Hộp xác nhận chốt hoá đơn */}
              {showFinalizeConfirm ? (
                <div
                  style={{
                    marginTop: '1rem',
                    background: '#ffffff',
                    border: '1.5px solid var(--hy-wine, #7a1f3d)',
                    borderRadius: 8,
                    padding: '1rem',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 0.5rem',
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      color: 'var(--hy-wine, #7a1f3d)',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    Xác nhận chốt hoá đơn quyết toán cuối
                  </h4>
                  <p
                    style={{
                      margin: '0 0 0.75rem',
                      fontSize: '0.85rem',
                      color: 'var(--hy-ink, #2b1d22)',
                      lineHeight: 1.45,
                    }}
                  >
                    Hoá đơn sau khi chốt là <strong>chứng từ pháp lý và kế toán bất biến</strong>. Toàn
                    bộ chi phí phát sinh nháp (Bản {incidentals?.revision ?? 0}) sẽ được đóng sổ và tích
                    hợp chính thức vào công nợ cuối cùng của tiệc với tổng tiền{' '}
                    <strong>{formatVnd(projectedTotal)}</strong>.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      disabled={finalizing}
                      className="hy-btn hy-btn-secondary"
                      onClick={() => setShowFinalizeConfirm(false)}
                    >
                      Huỷ bỏ
                    </button>
                    <button
                      type="button"
                      disabled={finalizing}
                      className="hy-btn hy-btn-primary"
                      onClick={handleFinalizeInvoice}
                    >
                      {finalizing ? 'Đang chốt hoá đơn…' : 'Xác nhận chốt hoá đơn'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Danh sách hoá đơn cuối đã chốt */}
          <FinalInvoicesList finalInvoices={finalInvoices} />
        </div>

        {/* CỘT PHẢI: Chi phí phát sinh nháp & Bảng kê */}
        <div
          className="incidentals-drafts-col"
          style={{
            background: 'white',
            border: '1px solid var(--line)',
            borderRadius: 'var(--hy-radius-md, 8px)',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: 'var(--hy-ink)',
                  lineHeight: 1.3,
                }}
              >
                Chi phí phát sinh nháp ({incidentals?.lines?.length ?? 0}) · Bản{' '}
                {incidentals?.revision ?? 0}
              </h3>
              {hasFinalizedInvoice ? (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--hy-success)',
                    background: 'var(--hy-success-bg)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--hy-success)',
                  }}
                >
                  ✓ Đã khoá sổ chi phí theo hoá đơn cuối
                </span>
              ) : null}
            </div>

            {!hasFinalizedInvoice && !showAddForm ? (
              <button
                type="button"
                disabled={disabled || loading || finalizing}
                className="hy-btn hy-btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                + Thêm chi phí phát sinh
              </button>
            ) : null}
          </div>

          {showAddForm && !hasFinalizedInvoice ? (
            <IncidentalCreateForm
              disabled={disabled}
              loading={loading}
              onSubmit={handleCreateIncidental}
              onCancel={() => setShowAddForm(false)}
            />
          ) : null}

          <div style={{ marginTop: '0.75rem' }}>
            <IncidentalTable
              incidentals={incidentals}
              disabled={disabled || hasFinalizedInvoice}
              loading={loading}
              onDeleteLine={handleDeleteLine}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
