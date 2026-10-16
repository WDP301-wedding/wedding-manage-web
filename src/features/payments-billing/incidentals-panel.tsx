'use client';

import { type FormEvent, useEffect, useState } from 'react';
import {
  billingService,
  type IncidentalExpensesResponse,
  type FinalInvoicesResponse,
} from '../../services/billing.service';
import { ApiServiceError } from '../../lib/api/axios-client';

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

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
  const [incidentals, setIncidentals] = useState<IncidentalExpensesResponse | null>(null);
  const [finalInvoices, setFinalInvoices] = useState<FinalInvoicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const [incRes, finRes] = await Promise.allSettled([
        billingService.getIncidentals(bookingId),
        billingService.getFinalInvoices(bookingId),
      ]);
      if (incRes.status === 'fulfilled') setIncidentals(incRes.value);
      if (finRes.status === 'fulfilled') setFinalInvoices(finRes.value);
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể tải chi phí phát sinh.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [bookingId]);

  const handleCreateIncidental = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const note = String(data.get('note') || '').trim();
    const quantity = Number(data.get('quantity') || 1);
    const unit = String(data.get('unit') || 'lần').trim();
    const unitPriceVnd = Number(data.get('unitPriceVnd') || 0);

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await billingService.createIncidental(bookingId, {
        name,
        ...(note ? { note } : {}),
        quantity,
        unit,
        unitPriceVnd,
        expectedRevision: incidentals?.revision ?? 1,
      });
      setMessage('Đã thêm chi phí phát sinh thành công.');
      form.reset();
      setShowAddForm(false);
      await loadData();
      onRefresh();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể thêm chi phí phát sinh (lưu ý: chỉ thêm được sau khi tiệc kết thúc).');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    setLoading(true);
    setError(null);
    try {
      await billingService.deleteIncidental(bookingId, lineId, incidentals?.revision ?? 1);
      setMessage('Đã xoá dòng phát sinh.');
      await loadData();
      onRefresh();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể xoá dòng phát sinh.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="billing-panel" style={{ marginTop: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2>Chi phí phát sinh &amp; Hoá đơn cuối</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Ghi nhận các khoản phát sinh sau giờ tiệc (đồ uống thêm, thời gian quá giờ, hư hỏng) và
            chốt quyết toán.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || loading}
          className="billing-secondary"
          onClick={() => void loadData()}
        >
          {loading ? 'Đang tải…' : 'Làm mới'}
        </button>
      </div>

      {message ? (
        <div
          role="status"
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            color: '#991b1b',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Danh sách dòng phát sinh */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          Chi phí phát sinh nháp ({incidentals?.lines?.length ?? 0}) · REV{' '}
          {incidentals?.revision ?? 0}
        </h3>

        {!incidentals || incidentals.lines.length === 0 ? (
          <p
            style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: 6,
            }}
          >
            Chưa có dòng chi phí phát sinh nào được ghi nhận.
          </p>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    background: '#f3f4f6',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <th style={{ padding: '0.5rem' }}>Hạng mục</th>
                  <th style={{ padding: '0.5rem' }}>Ghi chú</th>
                  <th style={{ padding: '0.5rem' }}>Số lượng</th>
                  <th style={{ padding: '0.5rem' }}>Đơn giá</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Thành tiền</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Xoá</th>
                </tr>
              </thead>
              <tbody>
                {incidentals.lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{l.name}</td>
                    <td style={{ padding: '0.5rem', color: '#6b7280' }}>{l.note || '—'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {l.quantity} {l.unit}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{formatVnd(l.unitPriceVnd)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>
                      {formatVnd(l.totalVnd)}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={disabled || loading}
                        onClick={() => void handleDeleteLine(l.id)}
                        style={{
                          color: '#dc2626',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          {!showAddForm ? (
            <button
              type="button"
              disabled={disabled || loading}
              className="billing-secondary"
              onClick={() => setShowAddForm(true)}
            >
              + Thêm chi phí phát sinh
            </button>
          ) : (
            <form
              onSubmit={handleCreateIncidental}
              style={{
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                marginTop: '0.5rem',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                Ghi nhận chi phí phát sinh mới
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>
                    Tên hạng mục
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="VD: Nước ngọt phát sinh"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>
                    Số lượng
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={1}
                    required
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>
                    Đơn vị tính
                  </label>
                  <input
                    name="unit"
                    defaultValue="thùng"
                    required
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>
                    Đơn giá (VND)
                  </label>
                  <input
                    name="unitPriceVnd"
                    type="number"
                    min={0}
                    step={1}
                    required
                    placeholder="VD: 300000"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>
                  Ghi chú / Biên bản
                </label>
                <input
                  name="note"
                  placeholder="VD: Theo yêu cầu của gia đình chú rể"
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={disabled || loading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Lưu phát sinh
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="billing-secondary"
                >
                  Huỷ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Danh sách hoá đơn cuối (Final Invoices) */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          Hoá đơn quyết toán cuối ({finalInvoices?.revisions?.length ?? 0})
        </h3>
        {!finalInvoices || finalInvoices.revisions.length === 0 ? (
          <p
            style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: 6,
            }}
          >
            Chưa có hoá đơn cuối nào được chốt cho tiệc này.
          </p>
        ) : (
          <div>
            {finalInvoices.revisions.map((inv) => (
              <div
                key={inv.invoiceRevisionId}
                style={{
                  background: '#f9fafb',
                  padding: '1rem',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <strong>
                      Hoá đơn {inv.invoiceNumber} · REV {inv.revisionNumber}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Chốt lúc: {new Date(inv.issuedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>
                    {formatVnd(inv.document.totalVnd)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
