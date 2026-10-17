'use client';

import { useEffect, useState } from 'react';
import {
  billingService,
  type IncidentalExpensesResponse,
  type FinalInvoicesResponse,
} from '../../services/billing.service';
import { describeApiError } from '../../lib/api/api-errors';
import { IncidentalCreateForm, type IncidentalFormData } from './incidental-create-form';
import { IncidentalTable } from './incidental-table';
import { FinalInvoicesList } from './final-invoices-list';

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
      const friendly = describeApiError(err);
      setError(friendly.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
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
      setMessage('Đã thêm chi phí phát sinh thành công.');
      setShowAddForm(false);
      await loadData();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err, {
        EVENT_NOT_ENDED: 'Chỉ có thể ghi nhận phát sinh sau khi tiệc kết thúc.',
      });
      setError(friendly.message);
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
      const friendly = describeApiError(err);
      setError(friendly.message);
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
          disabled={disabled || loading}
          className="hy-btn hy-btn-secondary"
          onClick={() => void loadData()}
        >
          {loading ? 'Đang tải…' : 'Làm mới'}
        </button>
      </div>

      {message ? (
        <div
          role="status"
          style={{
            background: 'var(--hy-success-bg)',
            color: 'var(--hy-success)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--hy-radius-sm)',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            border: '1px solid var(--hy-success)',
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            background: 'var(--hy-error-bg)',
            color: 'var(--hy-error)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--hy-radius-sm)',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            border: '1px solid var(--hy-error)',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--hy-ink)',
            }}
          >
            Chi phí phát sinh nháp ({incidentals?.lines?.length ?? 0}) · Bản{' '}
            {incidentals?.revision ?? 0}
          </h3>

          {!showAddForm ? (
            <button
              type="button"
              disabled={disabled || loading}
              className="hy-btn hy-btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              + Thêm chi phí phát sinh
            </button>
          ) : null}
        </div>

        {showAddForm ? (
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
            disabled={disabled}
            loading={loading}
            onDeleteLine={handleDeleteLine}
          />
        </div>
      </div>

      <FinalInvoicesList finalInvoices={finalInvoices} />
    </section>
  );
}
